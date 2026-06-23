import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile } from "../api/profile";
import type { PutProfileResponse } from "../types/profile";

export const profileKey = ["profile"] as const;

/** Carica il profilo/obiettivi correnti (con stati di loading/error gestiti dal chiamante). */
export function useProfileQuery() {
  return useQuery({ queryKey: profileKey, queryFn: getProfile });
}

/** Salva i parametri fisici → calcola e persiste gli obiettivi; aggiorna la cache. */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data: PutProfileResponse) => {
      // Aggiorna subito la cache del profilo con quello restituito.
      qc.setQueryData(profileKey, data.profile);
    },
  });
}
