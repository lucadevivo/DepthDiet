import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "./connection.js";
import { env } from "../config/env.js";

const BACKUP_PREFIX = "food-tracker-";
const BACKUP_EXT = ".sqlite";

/** Timestamp ordinabile per nome file: 2026-06-22T21-44-56. */
function backupStamp(d = new Date()): string {
  return d.toISOString().replace(/:/g, "-").replace(/\..+$/, "");
}

/**
 * Backup a caldo del DB con `VACUUM INTO`: produce una copia consistente in un
 * singolo file (niente WAL pendente), sicura anche mentre l'app scrive.
 * Poi applica la retention eliminando i backup più vecchi.
 *
 * @returns percorso del file di backup creato.
 */
export function backupDatabase(): string {
  mkdirSync(env.backupDir, { recursive: true });

  const target = join(env.backupDir, `${BACKUP_PREFIX}${backupStamp()}${BACKUP_EXT}`);
  // Path controllato da noi (nessun input utente); raddoppiamo gli apici per sicurezza.
  const escaped = target.replace(/'/g, "''");
  getDb().exec(`VACUUM INTO '${escaped}'`);

  pruneOldBackups();
  return target;
}

/** Tiene solo gli ultimi `env.backupRetention` backup, elimina i più vecchi. */
function pruneOldBackups(): void {
  const files = readdirSync(env.backupDir)
    .filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith(BACKUP_EXT))
    .sort() // i nomi contengono un timestamp ISO -> ordine cronologico
    .reverse(); // più recenti per primi

  for (const stale of files.slice(env.backupRetention)) {
    rmSync(join(env.backupDir, stale), { force: true });
    console.log(`[db] backup vecchio rimosso: ${stale}`);
  }
}
