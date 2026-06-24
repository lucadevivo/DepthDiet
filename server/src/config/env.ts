/**
 * Caricamento e validazione centralizzata della configurazione.
 * I segreti NON sono mai hardcoded: arrivano da variabili d'ambiente (file .env in dev,
 * env del container/systemd in produzione). Vedi .env.example per l'elenco.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Node >= 20.6 sa caricare un file .env nativamente. Lo facciamo solo se presente,
// così in produzione (Docker/systemd) le env reali hanno comunque la precedenza.
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

export const env = {
  /** Porta su cui ascolta il backend (dietro il Cloudflare Tunnel). */
  port: Number.parseInt(optional("PORT", "8787"), 10),
  /** "development" | "production" — controlla verbosità log ed error detail. */
  nodeEnv: optional("NODE_ENV", "development"),
  isProd: optional("NODE_ENV", "development") === "production",
  /** Percorso del file SQLite. In Docker/systemd puntalo a un volume persistente. */
  databasePath: resolve(process.cwd(), optional("DATABASE_PATH", "data/food-tracker.sqlite")),
  /** Cartella dei backup del DB. */
  backupDir: resolve(process.cwd(), optional("BACKUP_DIR", "backups")),
  /** Quanti backup conservare (i più vecchi vengono eliminati). */
  backupRetention: Number.parseInt(optional("BACKUP_RETENTION", "14"), 10),

  /**
   * Livello 2 (applicativo): token bearer richiesto su ogni rotta protetta.
   * Se vuoto, le rotte protette falliscono CHIUSE (401): meglio rifiutare tutto
   * che esporre i dati per errore di configurazione.
   */
  appBearerToken: optional("APP_BEARER_TOKEN", ""),

  /**
   * Livello 1 (bordo): verifica opzionale del JWT iniettato da Cloudflare Access.
   * Si attiva solo se ENTRAMBI valorizzati; altrimenti si fa affidamento sul solo
   * controllo al bordo di Access (utile anche in dev locale senza tunnel).
   */
  cfAccess: {
    /** Es. https://mioteam.cloudflareaccess.com */
    teamDomain: optional("CF_ACCESS_TEAM_DOMAIN", ""),
    /** Application Audience (AUD) tag dell'app Access. */
    aud: optional("CF_ACCESS_AUD", ""),
    get enabled(): boolean {
      return this.teamDomain !== "" && this.aud !== "";
    },
  },

  /** Fase 1d — Gemini. La chiave vive SOLO qui sul backend, mai nell'app. */
  gemini: {
    apiKey: optional("GEMINI_API_KEY", ""),
    // flash-lite: multimodale + JSON mode con quota giornaliera molto più alta sul
    // free tier (la 2.5-flash si esauriva). Configurabile via GEMINI_MODEL.
    model: optional("GEMINI_MODEL", "gemini-3.1-flash-lite"),
    get enabled(): boolean {
      return this.apiKey !== "";
    },
  },
} as const;
