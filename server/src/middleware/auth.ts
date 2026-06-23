import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { env } from "../config/env.js";

/**
 * Autenticazione a due livelli (Fase 1c).
 *
 *  Livello 1 — Cloudflare Access (Zero Trust) DAVANTI al tunnel:
 *    l'app invia il service token (CF-Access-Client-Id / -Secret); Access lo valida
 *    AL BORDO e blocca le richieste non autorizzate prima che tocchino l'home server.
 *    Qui il backend, se configurato, verifica in più il JWT che Access inietta
 *    (`Cf-Access-Jwt-Assertion`): prova che la richiesta è passata davvero da Access
 *    e non ha raggiunto l'origin scavalcandolo (es. IP dell'origin trapelato).
 *
 *  Livello 2 — Bearer token applicativo:
 *    ogni rotta protetta richiede `Authorization: Bearer <APP_BEARER_TOKEN>`.
 *    Confronto timing-safe; assente o errato → 401.
 */

// JWKS di Cloudflare Access, creato pigramente e cache-ato da jose.
let jwks: JWTVerifyGetKey | null = null;
function getJwks(): JWTVerifyGetKey {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${env.cfAccess.teamDomain}/cdn-cgi/access/certs`),
    );
  }
  return jwks;
}

/** Confronto a tempo costante che non rivela la lunghezza del segreto. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

async function checkCloudflareAccess(req: Request): Promise<boolean> {
  // Disattivato (dev / nessun tunnel): non blocca, ci si affida al solo bordo.
  if (!env.cfAccess.enabled) return true;

  const token = req.header("Cf-Access-Jwt-Assertion");
  if (!token) return false;

  try {
    await jwtVerify(token, getJwks(), {
      issuer: env.cfAccess.teamDomain,
      audience: env.cfAccess.aud,
    });
    return true;
  } catch {
    return false;
  }
}

function checkBearer(req: Request): boolean {
  // Fail-closed: senza token configurato, nessuna rotta protetta è accessibile.
  if (env.appBearerToken === "") {
    console.warn("[auth] APP_BEARER_TOKEN non configurato: rotte protette chiuse.");
    return false;
  }
  const header = req.header("Authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  return safeEqual(header.slice(prefix.length), env.appBearerToken);
}

/** Middleware Express: applica entrambi i livelli; qualunque fallimento → 401. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  void (async () => {
    if (!(await checkCloudflareAccess(req))) {
      res.status(401).json({ error: "unauthorized", reason: "cloudflare_access" });
      return;
    }
    if (!checkBearer(req)) {
      res.status(401).json({ error: "unauthorized", reason: "bearer" });
      return;
    }
    next();
  })().catch(next);
}
