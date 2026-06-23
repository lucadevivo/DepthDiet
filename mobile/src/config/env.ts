/**
 * Configurazione pubblica dell'app (NON segreti).
 * Expo espone nativamente le variabili con prefisso EXPO_PUBLIC_ (vedi .env.example).
 * I segreti veri (bearer token, Cloudflare service token) NON stanno qui:
 * vivono in expo-secure-store -> vedi src/lib/secureStore.ts.
 */

/** URL base del backend (il sottodominio del Cloudflare Tunnel, o un IP LAN in dev). */
export const BACKEND_URL: string =
  process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8787";
