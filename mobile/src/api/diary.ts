import { apiFetch } from "./client";
import type { AddDiaryBody, DiaryDay, DiaryEntry } from "../types/diary";

export function getDiaryDay(date: string): Promise<DiaryDay> {
  return apiFetch<DiaryDay>(`/api/diary?date=${date}`);
}

export function addDiaryEntry(body: AddDiaryBody): Promise<DiaryEntry> {
  return apiFetch<DiaryEntry>("/api/diary", { method: "POST", body: JSON.stringify(body) });
}

export function deleteDiaryEntry(id: number): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/api/diary/${id}`, { method: "DELETE" });
}
