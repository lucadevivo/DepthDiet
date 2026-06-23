// CLI per il test LIVE dello Scanner IA (DoD Fase 1d).
// Richiede GEMINI_API_KEY nel .env. Uso:
//   npm run gemini:test -- <path-immagine> ["contesto testuale opzionale"]
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { runMigrations } from "../db/migrate.js";
import { closeDb } from "../db/connection.js";
import { analyzeMeal } from "../services/gemini/client.js";

const imagePath = process.argv[2];
const contextText = process.argv[3];

if (!imagePath) {
  console.error('Uso: npm run gemini:test -- <path-immagine> ["contesto"]');
  process.exit(1);
}

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
};
const mimeType = MIME[extname(imagePath).toLowerCase()] ?? "image/jpeg";

try {
  runMigrations(); // garantisce che il DB (per il match) esista
  const imageBase64 = readFileSync(imagePath).toString("base64");
  console.log(`[test] invio ${imagePath} (${mimeType}) a Gemini...`);
  const result = await analyzeMeal({ imageBase64, mimeType, contextText });
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error("[test] errore:", err);
  process.exitCode = 1;
} finally {
  closeDb();
}
