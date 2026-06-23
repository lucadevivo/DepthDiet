import { apiFetch } from "./client";
import type { Profile } from "../types/profile";
import type { AdaptiveSuggestion, WeightEntry } from "../types/weight";

export function listWeights(days = 90): Promise<WeightEntry[]> {
  return apiFetch<WeightEntry[]>(`/api/weight?days=${days}`);
}

export function logWeight(date: string, weight_kg: number): Promise<WeightEntry> {
  return apiFetch<WeightEntry>("/api/weight", {
    method: "POST",
    body: JSON.stringify({ date, weight_kg }),
  });
}

export function deleteWeight(id: number): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/api/weight/${id}`, { method: "DELETE" });
}

export function getAdaptive(): Promise<AdaptiveSuggestion> {
  return apiFetch<AdaptiveSuggestion>("/api/weight/adaptive");
}

export function applyAdaptive(): Promise<{ profile: Profile; applied: number }> {
  return apiFetch<{ profile: Profile; applied: number }>("/api/weight/adaptive/apply", {
    method: "POST",
  });
}
