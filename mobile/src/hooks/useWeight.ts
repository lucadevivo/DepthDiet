import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applyAdaptive, deleteWeight, getAdaptive, listWeights, logWeight } from "../api/weight";
import { profileKey } from "./useProfile";

export const weightsKey = ["weights"] as const;
export const adaptiveKey = ["adaptive"] as const;

export function useWeightsQuery(days = 90) {
  return useQuery({ queryKey: [...weightsKey, days], queryFn: () => listWeights(days) });
}

export function useAdaptiveQuery() {
  return useQuery({ queryKey: adaptiveKey, queryFn: getAdaptive });
}

export function useLogWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { date: string; weight_kg: number }) => logWeight(vars.date, vars.weight_kg),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: weightsKey });
      qc.invalidateQueries({ queryKey: adaptiveKey });
    },
  });
}

export function useDeleteWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteWeight,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: weightsKey });
      qc.invalidateQueries({ queryKey: adaptiveKey });
    },
  });
}

export function useApplyAdaptive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: applyAdaptive,
    onSuccess: () => {
      // I target del profilo cambiano → aggiorna Dashboard, Profilo e suggerimento.
      qc.invalidateQueries({ queryKey: profileKey });
      qc.invalidateQueries({ queryKey: adaptiveKey });
    },
  });
}
