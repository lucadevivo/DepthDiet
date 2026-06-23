import { apiFetch } from "./client";
import type { Meal } from "../types/meals";

export function getMeals(): Promise<Meal[]> {
  return apiFetch<Meal[]>("/api/meals");
}

export function createMeal(name: string): Promise<Meal> {
  return apiFetch<Meal>("/api/meals", { method: "POST", body: JSON.stringify({ name }) });
}

export function renameMeal(id: number, name: string): Promise<Meal> {
  return apiFetch<Meal>(`/api/meals/${id}`, { method: "PUT", body: JSON.stringify({ name }) });
}

export function reorderMeals(ids: number[]): Promise<Meal[]> {
  return apiFetch<Meal[]>("/api/meals/reorder", { method: "PUT", body: JSON.stringify({ ids }) });
}

export function deleteMeal(id: number): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/api/meals/${id}`, { method: "DELETE" });
}
