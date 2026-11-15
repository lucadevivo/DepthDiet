import { AsyncLocalStorage } from "node:async_hooks";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { env } from "../config/env.js";
import { runMigrations } from "./migrate.js";

/**
 * Una connessione SQLite sincrona per utente (node:sqlite, built-in di Node — niente
 * dipendenze native da compilare). Ogni utente ha il suo file: i dati non si mescolano
 * e repository/schema restano quelli dell'app single-user.
 *
 * L'utente della richiesta lo fissa requireAuth con `currentUser.run(...)`; fuori da
 * una richiesta (script, avvio) si usa il DB principale. "" = utente principale.
 */
export const currentUser = new AsyncLocalStorage<string>();
const dbs = new Map<string, DatabaseSync>();

export function dbPathFor(user: string): string {
  return user === "" ? env.databasePath : join(dirname(env.databasePath), "users", `${user}.sqlite`);
}

export function getDb(): DatabaseSync {
  return openDb(currentUser.getStore() ?? "");
}

export function openDb(user: string): DatabaseSync {
  const cached = dbs.get(user);
  if (cached) return cached;

  // Assicura che la cartella del DB esista (es. ./data).
  const path = dbPathFor(user);
  mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  // WAL: letture concorrenti alle scritture, meno lock; ottimo anche per i backup a caldo.
  db.exec("PRAGMA journal_mode = WAL;");
  // I vincoli di foreign key vanno abilitati esplicitamente a ogni connessione.
  db.exec("PRAGMA foreign_keys = ON;");
  dbs.set(user, db);
  // Il DB principale lo migra index.ts all'avvio; quelli degli altri alla prima apertura.
  if (user !== "") runMigrations(db);
  return db;
}

export function closeDb(): void {
  for (const db of dbs.values()) db.close();
  dbs.clear();
}
