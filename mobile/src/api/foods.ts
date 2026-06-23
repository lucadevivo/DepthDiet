import { apiFetch } from "./client";
import type { CustomFood, CustomFoodInput, RecipeSummary, RecipeItemInput } from "../types/food";

// --- Alimenti Personali ---

export function listFoods(query?: string): Promise<CustomFood[]> {
  const qs = query && query.trim() !== "" ? `?q=${encodeURIComponent(query.trim())}` : "";
  return apiFetch<CustomFood[]>(`/api/foods${qs}`);
}

export function createFood(input: CustomFoodInput): Promise<CustomFood> {
  return apiFetch<CustomFood>("/api/foods", { method: "POST", body: JSON.stringify(input) });
}

export function deleteFood(id: number): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/api/foods/${id}`, { method: "DELETE" });
}

// --- Ricette ---

export function listRecipes(): Promise<RecipeSummary[]> {
  return apiFetch<RecipeSummary[]>("/api/recipes");
}

export function createRecipe(name: string, items: RecipeItemInput[]): Promise<unknown> {
  return apiFetch("/api/recipes", { method: "POST", body: JSON.stringify({ name, items }) });
}

export function deleteRecipe(id: number): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/api/recipes/${id}`, { method: "DELETE" });
}
