import { useMutation } from "@tanstack/react-query";
import { suggestMeal } from "../api/suggest";

/** Mutation per il suggeritore IA: giorno + ambito → consigli su cosa mangiare. */
export function useSuggestMeal() {
  return useMutation({ mutationFn: suggestMeal });
}
