import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDiaryEntry, deleteDiaryEntry, getDiaryDay, updateDiaryEntry } from "../api/diary";

export const diaryKey = (date: string) => ["diary", date] as const;

export function useDiaryQuery(date: string) {
  return useQuery({ queryKey: diaryKey(date), queryFn: () => getDiaryDay(date) });
}

export function useAddDiaryEntry(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addDiaryEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: diaryKey(date) }),
  });
}

export function useDeleteDiaryEntry(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDiaryEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: diaryKey(date) }),
  });
}

export function useUpdateDiaryEntry(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; grams: number }) => updateDiaryEntry(vars.id, vars.grams),
    onSuccess: () => qc.invalidateQueries({ queryKey: diaryKey(date) }),
  });
}
