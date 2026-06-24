import { apiFetch } from "./client";
import type { SuggestBody, SuggestResult } from "../types/suggest";

/** Suggeritore IA: chiede a Gemini cosa mangiare per chiudere i macro del giorno. */
export function suggestMeal(body: SuggestBody): Promise<SuggestResult> {
  return apiFetch<SuggestResult>("/api/suggest", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
