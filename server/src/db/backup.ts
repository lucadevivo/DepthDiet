import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { dbPathFor, openDb } from "./connection.js";
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
 * Utente principale in backupDir, gli altri in backupDir/users/<nome>.
 *
 * @returns percorso del file di backup creato.
 */
export function backupDatabase(user = ""): string {
  const dir = user === "" ? env.backupDir : join(env.backupDir, "users", user);
  mkdirSync(dir, { recursive: true });

  const target = join(dir, `${BACKUP_PREFIX}${backupStamp()}${BACKUP_EXT}`);
  // Path controllato da noi (nessun input utente); raddoppiamo gli apici per sicurezza.
  const escaped = target.replace(/'/g, "''");
  openDb(user).exec(`VACUUM INTO '${escaped}'`);

  pruneOldBackups(dir);
  return target;
}

/** Utenti con un DB da salvare: il principale più gli extra che lo hanno già creato. */
export function usersToBackup(): string[] {
  return ["", ...env.extraUsers.map((u) => u.name).filter((name) => existsSync(dbPathFor(name)))];
}

/** Tiene solo gli ultimi `env.backupRetention` backup, elimina i più vecchi. */
function pruneOldBackups(dir: string): void {
  const files = readdirSync(dir)
    .filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith(BACKUP_EXT))
    .sort() // i nomi contengono un timestamp ISO -> ordine cronologico
    .reverse(); // più recenti per primi

  for (const stale of files.slice(env.backupRetention)) {
    rmSync(join(dir, stale), { force: true });
    console.log(`[db] backup vecchio rimosso: ${stale}`);
  }
}
