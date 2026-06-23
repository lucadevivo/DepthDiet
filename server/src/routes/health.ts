import { Router } from "express";

export const healthRouter = Router();

/**
 * Healthcheck pubblico (NON protetto da auth): serve a Docker/systemd e al tunnel
 * per sapere se il processo è vivo. Non espone dati sensibili.
 */
healthRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "food-tracker-server",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
