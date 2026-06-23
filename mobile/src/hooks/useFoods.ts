import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFood,
  createRecipe,
  deleteFood,
  deleteRecipe,
  listFoods,
  listRecipes,
} from "../api/foods";

export const foodsKey = ["foods"] as const;
export const recipesKey = ["recipes"] as const;

export function useFoodsQuery(query?: string) {
  return useQuery({
    queryKey: [...foodsKey, query ?? ""],
    queryFn: () => listFoods(query),
  });
}

export function useCreateFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createFood,
    onSuccess: () => qc.invalidateQueries({ queryKey: foodsKey }),
  });
}

export function useDeleteFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteFood,
    onSuccess: () => qc.invalidateQueries({ queryKey: foodsKey }),
  });
}

export function useRecipesQuery() {
  return useQuery({ queryKey: recipesKey, queryFn: listRecipes });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { name: string; items: { food_id: number; grams: number }[] }) =>
      createRecipe(vars.name, vars.items),
    onSuccess: () => qc.invalidateQueries({ queryKey: recipesKey }),
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteRecipe,
    onSuccess: () => qc.invalidateQueries({ queryKey: recipesKey }),
  });
}
