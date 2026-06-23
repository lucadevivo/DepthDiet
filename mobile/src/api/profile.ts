import { apiFetch } from "./client";
import type {
  DietInput,
  FormulaInput,
  Profile,
  ProfileInput,
  PutDietResponse,
  PutProfileResponse,
} from "../types/profile";

/** Profilo + obiettivi correnti. */
export function getProfile(): Promise<Profile> {
  return apiFetch<Profile>("/api/profile");
}

/** Calcola (Mifflin-St Jeor + preset) e salva gli obiettivi a partire dai parametri fisici. */
export function updateProfile(input: ProfileInput): Promise<PutProfileResponse> {
  return apiFetch<PutProfileResponse>("/api/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** Cambia il preset dieta: ricalcola i macro sulle calorie obiettivo già salvate. */
export function updateDiet(input: DietInput): Promise<PutDietResponse> {
  return apiFetch<PutDietResponse>("/api/profile/diet", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** Cambia la formula BMR: ricalcola BMR/TDEE/obiettivi dal profilo salvato. */
export function updateFormula(input: FormulaInput): Promise<PutProfileResponse> {
  return apiFetch<PutProfileResponse>("/api/profile/formula", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
