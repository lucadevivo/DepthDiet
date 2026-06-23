// CLI: applica le migrazioni e termina. Usato da `npm run db:migrate`
// e dal container/deploy prima di avviare il server.
import { runMigrations } from "../db/migrate.js";
import { closeDb } from "../db/connection.js";

try {
  runMigrations();
  console.log("[db] migrazioni completate.");
} catch (err) {
  console.error("[db] errore durante le migrazioni:", err);
  process.exitCode = 1;
} finally {
  closeDb();
}
