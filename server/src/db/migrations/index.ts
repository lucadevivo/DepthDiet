import type { Migration } from "./types.js";
import { migration_0001_init } from "./0001_init.js";
import { migration_0002_diet_presets } from "./0002_diet_presets.js";
import { migration_0003_custom_meals } from "./0003_custom_meals.js";
import { migration_0004_bmr_formula } from "./0004_bmr_formula.js";

/**
 * Elenco ordinato di tutte le migrazioni. Per aggiungerne una: crea 000N_nome.ts,
 * esporta la Migration e aggiungila qui in coda (version crescente).
 */
export const migrations: Migration[] = [
  migration_0001_init,
  migration_0002_diet_presets,
  migration_0003_custom_meals,
  migration_0004_bmr_formula,
];
