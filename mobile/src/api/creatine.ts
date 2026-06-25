import { apiFetch } from "./client";
import type { CreatineDay } from "../types/creatine";

export function getCreatine(date: string): Promise<CreatineDay> {
  return apiFetch<CreatineDay>(`/api/creatine?date=${date}`);
}

export function setCreatine(date: string, taken: boolean): Promise<CreatineDay> {
  return apiFetch<CreatineDay>("/api/creatine", {
    method: "POST",
    body: JSON.stringify({ date, taken }),
  });
}
