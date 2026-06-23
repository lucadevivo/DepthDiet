import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "../config/env.js";

/**
 * Connessione SQLite singola e sincrona (node:sqlite, built-in di Node — niente
 * dipendenze native da compilare). Per un'app single-user è la scelta più semplice.
 */
let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;

  // Assicura che la cartella del DB esista (es. ./data).
  mkdirSync(dirname(env.databasePath), { recursive: true });

  db = new DatabaseSync(env.databasePath);
  // WAL: letture concorrenti alle scritture, meno lock; ottimo anche per i backup a caldo.
  db.exec("PRAGMA journal_mode = WAL;");
  // I vincoli di foreign key vanno abilitati esplicitamente a ogni connessione.
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
