import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFood,
  createRecipe,
  deleteFood,
  deleteRecipe,
  getFood,
  listFoods,
  listRecipes,
  updateFood,
} from "../api/foods";
import type { CustomFoodInput } from "../types/food";

export const foodsKey = ["foods"] as const;
export const recipesKey = ["recipes"] as const;

export function useFoodsQuery(query?: string) {
  return useQuery({
    queryKey: [...foodsKey, query ?? ""],
    queryFn: () => listFoods(query),
  });
}

export function useFoodQuery(id: number | null) {
  return useQuery({
    queryKey: [...foodsKey, "byId", id],
    queryFn: () => getFood(id!),
    enabled: id != null,
  });
}

export function useUpdateFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; input: CustomFoodInput }) => updateFood(vars.id, vars.input),
    onSuccess: (food) => {
      qc.invalidateQueries({ queryKey: foodsKey });
      qc.setQueryData([...foodsKey, "byId", food.id], food);
    },
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
