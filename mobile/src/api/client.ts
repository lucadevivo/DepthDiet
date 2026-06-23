import { BACKEND_URL } from "../config/env";
import { getSecret, SECRET_KEYS } from "../lib/secureStore";

/**
 * Client HTTP centrale verso il backend.
 * Inietta automaticamente i due livelli di auth (Fase 1c):
 *   - Cloudflare Access service token (CF-Access-Client-Id / -Secret) -> bloccato al bordo;
 *   - Bearer token applicativo (Authorization) -> verificato dal backend.
 * Entrambi vengono letti da expo-secure-store, mai dal bundle.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const [bearer, cfId, cfSecret] = await Promise.all([
    getSecret(SECRET_KEYS.appBearerToken),
    getSecret(SECRET_KEYS.cfAccessClientId),
    getSecret(SECRET_KEYS.cfAccessClientSecret),
  ]);

  const headers: Record<string, string> = {};
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
  if (cfId) headers["CF-Access-Client-Id"] = cfId;
  if (cfSecret) headers["CF-Access-Client-Secret"] = cfSecret;
  return headers;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = await buildAuthHeaders();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...auth,
      ...init.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, `Richiesta fallita: ${res.status} ${res.statusText}`);
  }

  // 204 / corpo vuoto -> nessun JSON da parsare.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
