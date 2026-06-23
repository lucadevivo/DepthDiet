import type { CustomFood } from "../repositories/customFoods.js";

/** Macro in valore assoluto (per una porzione, un pasto o una giornata). */
export interface Macros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const round = (n: number, decimals = 1): number => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

/** Scala i macro di un alimento (valori per 100g) sulla grammatura indicata. */
export function scaleFood(food: CustomFood, grams: number): Macros {
  const k = grams / 100;
  return {
    kcal: round(food.kcal_per_100 * k, 0),
    protein_g: round(food.protein_per_100 * k),
    carbs_g: round(food.carbs_per_100 * k),
    fat_g: round(food.fat_per_100 * k),
  };
}

/** Somma una lista di macro. */
export function sumMacros(list: Macros[]): Macros {
  const total = list.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein_g: acc.protein_g + m.protein_g,
      carbs_g: acc.carbs_g + m.carbs_g,
      fat_g: acc.fat_g + m.fat_g,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
  return {
    kcal: round(total.kcal, 0),
    protein_g: round(total.protein_g),
    carbs_g: round(total.carbs_g),
    fat_g: round(total.fat_g),
  };
}
