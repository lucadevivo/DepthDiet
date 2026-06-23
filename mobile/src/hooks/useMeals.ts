import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMeal, deleteMeal, getMeals, renameMeal, reorderMeals } from "../api/meals";

export const mealsKey = ["meals"] as const;

export function useMealsQuery() {
  return useQuery({ queryKey: mealsKey, queryFn: getMeals });
}

function useMealMutation<TArgs>(fn: (a: TArgs) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: mealsKey }),
  });
}

export function useCreateMeal() {
  return useMealMutation((name: string) => createMeal(name));
}

export function useRenameMeal() {
  return useMealMutation((args: { id: number; name: string }) => renameMeal(args.id, args.name));
}

export function useReorderMeals() {
  return useMealMutation((ids: number[]) => reorderMeals(ids));
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMeal(id),
    // Cancellare un pasto sposta le voci in "Other": invalida anche il diario.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mealsKey });
      qc.invalidateQueries({ queryKey: ["diary"] });
    },
  });
}
