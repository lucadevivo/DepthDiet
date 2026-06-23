import type { Migration } from "./types.js";
import { migration_0001_init } from "./0001_init.js";

/**
 * Elenco ordinato di tutte le migrazioni. Per aggiungerne una: crea 000N_nome.ts,
 * esporta la Migration e aggiungila qui in coda (version crescente).
 */
export const migrations: Migration[] = [migration_0001_init];
