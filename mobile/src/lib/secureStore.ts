import * as SecureStore from "expo-secure-store";

/**
 * Wrapper tipizzato su expo-secure-store (Keychain iOS).
 * Qui vivono TUTTI i segreti lato telefono: nessun segreto è hardcoded nel bundle.
 */

export const SECRET_KEYS = {
  /** Token applicativo inviato come `Authorization: Bearer <token>`. */
  appBearerToken: "app_bearer_token",
  /** Cloudflare Access service token id (header CF-Access-Client-Id). */
  cfAccessClientId: "cf_access_client_id",
  /** Cloudflare Access service token secret (header CF-Access-Client-Secret). */
  cfAccessClientSecret: "cf_access_client_secret",
} as const;

export type SecretKey = (typeof SECRET_KEYS)[keyof typeof SECRET_KEYS];

export async function getSecret(key: SecretKey): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function setSecret(key: SecretKey, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecret(key: SecretKey): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

/** Le tre credenziali che l'app invia a ogni richiesta (livelli 1 + 2). */
export interface ApiCredentials {
  appBearerToken: string;
  cfAccessClientId: string;
  cfAccessClientSecret: string;
}

/** Salva tutte le credenziali insieme (usato nella schermata di setup, Fase 4/5). */
export async function setCredentials(creds: ApiCredentials): Promise<void> {
  await Promise.all([
    setSecret(SECRET_KEYS.appBearerToken, creds.appBearerToken),
    setSecret(SECRET_KEYS.cfAccessClientId, creds.cfAccessClientId),
    setSecret(SECRET_KEYS.cfAccessClientSecret, creds.cfAccessClientSecret),
  ]);
}

/** Cancella tutte le credenziali (logout / reset). */
export async function clearCredentials(): Promise<void> {
  await Promise.all([
    deleteSecret(SECRET_KEYS.appBearerToken),
    deleteSecret(SECRET_KEYS.cfAccessClientId),
    deleteSecret(SECRET_KEYS.cfAccessClientSecret),
  ]);
}
