import type { DaySummary, Macros } from "../types/nutrition";

/**
 * Dati FINTI per la Fase 2 (UI & navigazione). Verranno sostituiti dai dati reali
 * (backend + DB) in Fase 3. Servono solo a far renderizzare Dashboard e Storico.
 */

const targets: Macros = { calories: 2600, protein_g: 190, carbs_g: 270, fat_g: 75 };

export const mockToday: DaySummary = {
  date: new Date().toISOString().slice(0, 10),
  totals: { calories: 1740, protein_g: 128, carbs_g: 165, fat_g: 52 },
  targets,
  waterMl: 1500,
  waterTargetMl: 2500,
  meals: [
    { meal: "breakfast", calories: 420 },
    { meal: "lunch", calories: 760 },
    { meal: "snack", calories: 560 },
    { meal: "dinner", calories: 0 },
  ],
};

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const mockHistory: DaySummary[] = [
  {
    date: daysAgo(1),
    totals: { calories: 2580, protein_g: 188, carbs_g: 262, fat_g: 76 },
    targets,
    waterMl: 2500,
    waterTargetMl: 2500,
    meals: [
      { meal: "breakfast", calories: 510 },
      { meal: "lunch", calories: 820 },
      { meal: "snack", calories: 350 },
      { meal: "dinner", calories: 900 },
    ],
  },
  {
    date: daysAgo(2),
    totals: { calories: 2410, protein_g: 175, carbs_g: 240, fat_g: 70 },
    targets,
    waterMl: 2000,
    waterTargetMl: 2500,
    meals: [
      { meal: "breakfast", calories: 460 },
      { meal: "lunch", calories: 780 },
      { meal: "snack", calories: 420 },
      { meal: "dinner", calories: 750 },
    ],
  },
  {
    date: daysAgo(3),
    totals: { calories: 2705, protein_g: 196, carbs_g: 280, fat_g: 80 },
    targets,
    waterMl: 2750,
    waterTargetMl: 2500,
    meals: [
      { meal: "breakfast", calories: 530 },
      { meal: "lunch", calories: 860 },
      { meal: "snack", calories: 415 },
      { meal: "dinner", calories: 900 },
    ],
  },
];
