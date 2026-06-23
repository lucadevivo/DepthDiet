export interface WeightEntry {
  id: number;
  entry_date: string;
  weight_kg: number;
  created_at: string;
}

/** Suggerimento del TDEE adattivo (mirror backend, Fase 3d). */
export interface AdaptiveSuggestion {
  hasEnoughData: boolean;
  dataPoints: number;
  spanDays: number;
  trendKgPerWeek: number | null;
  expectedKgPerWeek: number;
  currentTargetCalories: number | null;
  suggestedTargetCalories: number | null;
  adjustmentKcal: number;
  reason: string;
}
