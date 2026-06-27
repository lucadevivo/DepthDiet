import type { Goal } from "./tdee.js";
import type { WeightEntry } from "../repositories/weight.js";

/**
 * TDEE ADATTIVO: oltre alla stima iniziale (Mifflin-St Jeor), aggiustiamo l'obiettivo
 * calorico in base al TREND REALE del peso registrato. La stima iniziale è solo un
 * punto di partenza: il corpo è la misura vera.
 *
 * Idea: ~7700 kcal ≈ 1 kg di massa corporea. Se il trend settimanale reale del peso
 * si discosta da quello atteso per l'obiettivo, suggeriamo una variazione calorica
 * che colmi la differenza: Δkcal/giorno = (atteso - reale)[kg/sett] * 7700 / 7.
 */

const KCAL_PER_KG = 7700;
/** Variazione di peso settimanale ATTESA per ciascun obiettivo (kg/settimana). */
const GOAL_WEEKLY_RATE: Record<Goal, number> = {
  lose_weight: -0.5,
  lose_slow: -0.25,
  maintain: 0,
  light_bulk: 0.2,
  bulk: 0.25,
};

const WINDOW_DAYS = 28; // guardiamo le ultime ~4 settimane
const MIN_POINTS = 3; // servono almeno 3 pesate
const MIN_SPAN_DAYS = 10; // distribuite su almeno ~1.5 settimane
const MAX_ADJUST = 400; // non stravolgere l'obiettivo in un colpo
const MIN_ADJUST = 50; // sotto questa soglia, nessun cambiamento

/** Codice del motivo (l'app lo traduce con i parametri; vedi i18n adaptive.*). */
export type AdaptiveReasonCode = "needData" | "needGoal" | "onTrack" | "adjustUp" | "adjustDown";

export interface AdaptiveSuggestion {
  hasEnoughData: boolean;
  dataPoints: number;
  spanDays: number;
  trendKgPerWeek: number | null;
  expectedKgPerWeek: number;
  currentTargetCalories: number | null;
  suggestedTargetCalories: number | null;
  adjustmentKcal: number;
  /** Testo già composto (italiano) — fallback/diagnostica; l'app usa reasonCode. */
  reason: string;
  /** Motivo strutturato, tradotto lato app. */
  reasonCode: AdaptiveReasonCode;
  reasonParams: { trend?: number; expected?: number; amount?: number; suggested?: number };
}

/** Pendenza ai minimi quadrati (kg per giorno). */
function slopePerDay(points: { x: number; y: number }[]): number {
  const n = points.length;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
    sxx += p.x * p.x;
    sxy += p.x * p.y;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return 0;
  return (n * sxy - sx * sy) / denom;
}

const dayNumber = (iso: string): number => Math.floor(new Date(`${iso}T00:00:00`).getTime() / 86_400_000);

export function computeAdaptive(
  weights: WeightEntry[],
  goal: Goal,
  currentTargetCalories: number | null,
): AdaptiveSuggestion {
  const expected = GOAL_WEEKLY_RATE[goal];

  // Considera solo le pesate nella finestra recente.
  const cutoff = dayNumber(new Date().toISOString().slice(0, 10)) - WINDOW_DAYS;
  const recent = weights.filter((w) => dayNumber(w.entry_date) >= cutoff);

  const base: AdaptiveSuggestion = {
    hasEnoughData: false,
    dataPoints: recent.length,
    spanDays: 0,
    trendKgPerWeek: null,
    expectedKgPerWeek: expected,
    currentTargetCalories,
    suggestedTargetCalories: currentTargetCalories,
    adjustmentKcal: 0,
    reason: "Servono almeno 3 pesate su ~2 settimane per stimare il trend.",
    reasonCode: "needData",
    reasonParams: {},
  };

  if (recent.length < MIN_POINTS) return base;

  const x0 = dayNumber(recent[0]!.entry_date);
  const points = recent.map((w) => ({ x: dayNumber(w.entry_date) - x0, y: w.weight_kg }));
  const spanDays = points[points.length - 1]!.x;
  base.spanDays = spanDays;
  if (spanDays < MIN_SPAN_DAYS) return base;

  const trendKgPerWeek = slopePerDay(points) * 7;
  base.trendKgPerWeek = Math.round(trendKgPerWeek * 100) / 100;
  base.hasEnoughData = true;

  // Quanto il trend reale si discosta dall'atteso (kg/settimana).
  const rateError = expected - trendKgPerWeek;
  let adjust = Math.round((rateError * KCAL_PER_KG) / 7);
  adjust = Math.max(-MAX_ADJUST, Math.min(MAX_ADJUST, adjust));

  if (Math.abs(adjust) < MIN_ADJUST || currentTargetCalories == null) {
    return {
      ...base,
      adjustmentKcal: 0,
      reason:
        currentTargetCalories == null
          ? "Imposta prima gli obiettivi nel Calcolatore."
          : `Trend ${base.trendKgPerWeek} kg/sett, in linea con l'obiettivo: nessuna modifica.`,
      reasonCode: currentTargetCalories == null ? "needGoal" : "onTrack",
      reasonParams: currentTargetCalories == null ? {} : { trend: base.trendKgPerWeek ?? 0 },
    };
  }

  const suggested = currentTargetCalories + adjust;
  const direction = adjust < 0 ? "ridurre" : "aumentare";
  return {
    ...base,
    adjustmentKcal: adjust,
    suggestedTargetCalories: suggested,
    reason:
      `Trend reale ${base.trendKgPerWeek} kg/sett vs atteso ${expected} kg/sett: ` +
      `consiglio di ${direction} di ${Math.abs(adjust)} kcal/giorno (→ ${suggested} kcal).`,
    reasonCode: adjust < 0 ? "adjustDown" : "adjustUp",
    reasonParams: { trend: base.trendKgPerWeek ?? 0, expected, amount: Math.abs(adjust), suggested },
  };
}
