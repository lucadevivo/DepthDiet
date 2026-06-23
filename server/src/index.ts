import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { runMigrations } from "./db/migrate.js";

// Allinea lo schema del DB prima di accettare richieste (idempotente).
runMigrations();

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`[server] food-tracker in ascolto su http://localhost:${env.port} (${env.nodeEnv})`);
  console.log(`[server] healthcheck: http://localhost:${env.port}/health`);
});

// Spegnimento pulito (importante sotto Docker/systemd che inviano SIGTERM).
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`[server] ricevuto ${signal}, chiusura...`);
    server.close(() => process.exit(0));
  });
}
