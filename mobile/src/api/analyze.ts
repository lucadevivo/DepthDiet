import { apiFetch } from "./client";
import type { AnalyzeBody, AnalyzeResult } from "../types/analyze";

/** Scanner IA (Fase 4a): invia la foto del pasto a Gemini e riceve gli item stimati/abbinati. */
export function analyzeMeal(body: AnalyzeBody): Promise<AnalyzeResult> {
  return apiFetch<AnalyzeResult>("/api/analyze", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
