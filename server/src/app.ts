import express, { type ErrorRequestHandler, type Request, type Response } from "express";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { apiRouter } from "./routes/api.js";
import { requireAuth } from "./middleware/auth.js";

/**
 * Costruisce l'app Express. Tenuta separata dal bootstrap (index.ts) così è
 * istanziabile anche nei test senza aprire una porta.
 */
export function createApp() {
  const app = express();

  // Limite generoso ma finito: le immagini arrivano già compresse/ridimensionate
  // dal client, ma teniamo margine per il base64 dei pasti.
  app.use(express.json({ limit: "10mb" }));

  // --- Rotte pubbliche (no auth) ---
  app.use(healthRouter);

  // --- Rotte applicative protette (auth a due livelli, Fase 1c) ---
  // TODO Fase 1d: agganciare il controller Gemini ad apiRouter.
  app.use("/api", requireAuth, apiRouter);

  // 404 esplicito per rotte sconosciute.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "not_found" });
  });

  // Error handler centralizzato: in produzione non trapela lo stack al client.
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const message = err instanceof Error ? err.message : "internal_error";
    console.error("[error]", message, env.isProd ? "" : err);
    res.status(500).json({ error: "internal_error" });
  };
  app.use(errorHandler);

  return app;
}
