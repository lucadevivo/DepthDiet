import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addWater, getWater } from "../api/water";
import type { WaterDay } from "../types/water";

export const waterKey = (date: string) => ["water", date] as const;

export function useWaterQuery(date: string) {
  return useQuery({ queryKey: waterKey(date), queryFn: () => getWater(date) });
}

/** Aggiunge/toglie acqua con aggiornamento ottimistico (i +/- restano istantanei). */
export function useAddWater(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amountMl: number) => addWater(date, amountMl),
    onMutate: async (amountMl) => {
      await qc.cancelQueries({ queryKey: waterKey(date) });
      const prev = qc.getQueryData<WaterDay>(waterKey(date));
      const base = prev?.total_ml ?? 0;
      qc.setQueryData<WaterDay>(waterKey(date), { date, total_ml: Math.max(0, base + amountMl) });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(waterKey(date), ctx.prev);
    },
    onSuccess: (data) => qc.setQueryData(waterKey(date), data),
  });
}
