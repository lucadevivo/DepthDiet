import { useMutation } from "@tanstack/react-query";
import { analyzeMeal } from "../api/analyze";

/** Mutation per lo Scanner IA: una foto → analisi del pasto. */
export function useAnalyzeMeal() {
  return useMutation({ mutationFn: analyzeMeal });
}
