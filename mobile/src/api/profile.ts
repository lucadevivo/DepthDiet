import { apiFetch } from "./client";
import type { Profile, ProfileInput, PutProfileResponse } from "../types/profile";

/** Profilo + obiettivi correnti. */
export function getProfile(): Promise<Profile> {
  return apiFetch<Profile>("/api/profile");
}

/** Calcola (Mifflin-St Jeor) e salva gli obiettivi a partire dai parametri fisici. */
export function updateProfile(input: ProfileInput): Promise<PutProfileResponse> {
  return apiFetch<PutProfileResponse>("/api/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
