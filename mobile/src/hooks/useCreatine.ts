import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCreatine, setCreatine } from "../api/creatine";
import type { CreatineDay } from "../types/creatine";

export const creatineKey = (date: string) => ["creatine", date] as const;

export function useCreatineQuery(date: string) {
  return useQuery({ queryKey: creatineKey(date), queryFn: () => getCreatine(date) });
}

/** Spunta/de-spunta la creatina del giorno con aggiornamento ottimistico. */
export function useSetCreatine(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taken: boolean) => setCreatine(date, taken),
    onMutate: async (taken) => {
      await qc.cancelQueries({ queryKey: creatineKey(date) });
      const prev = qc.getQueryData<CreatineDay>(creatineKey(date));
      qc.setQueryData<CreatineDay>(creatineKey(date), { date, taken });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(creatineKey(date), ctx.prev);
    },
    onSuccess: (data) => qc.setQueryData(creatineKey(date), data),
  });
}
