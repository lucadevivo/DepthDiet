// CLI: esegue un backup del DB e termina. Usato da `npm run db:backup`
// e schedulabile da cron / systemd-timer sull'home server (vedi deploy/).
import { backupDatabase } from "../db/backup.js";
import { closeDb } from "../db/connection.js";

try {
  const path = backupDatabase();
  console.log(`[db] backup creato: ${path}`);
} catch (err) {
  console.error("[db] errore durante il backup:", err);
  process.exitCode = 1;
} finally {
  closeDb();
}
