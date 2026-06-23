import { getDb } from "../db/connection.js";
import type { ActivityLevel, Goal, Sex } from "../services/tdee.js";

/** La riga (singola) di user_profile. I campi sono null finché non si calcola il profilo. */
export interface Profile {
  id: number;
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  sex: Sex | null;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
  target_calories: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
  water_target_ml: number;
  updated_at: string;
}

export function getProfile(): Profile {
  return getDb()
    .prepare("SELECT * FROM user_profile WHERE id = 1")
    .get() as unknown as Profile;
}

export interface ProfileUpdate {
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: Sex;
  activity_level: ActivityLevel;
  goal: Goal;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
}

/** Aggiorna i SOLI obiettivi (usato dal TDEE adattivo, che non ritocca i parametri fisici). */
export function updateProfileTargets(t: {
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
}): Profile {
  getDb()
    .prepare(
      `UPDATE user_profile SET
         target_calories = ?, target_protein_g = ?, target_carbs_g = ?, target_fat_g = ?,
         updated_at = datetime('now')
       WHERE id = 1`,
    )
    .run(t.target_calories, t.target_protein_g, t.target_carbs_g, t.target_fat_g);
  return getProfile();
}

/** Salva parametri fisici + obiettivi calcolati nella riga singola. */
export function updateProfile(u: ProfileUpdate): Profile {
  getDb()
    .prepare(
      `UPDATE user_profile SET
         weight_kg = ?, height_cm = ?, age = ?, sex = ?, activity_level = ?, goal = ?,
         target_calories = ?, target_protein_g = ?, target_carbs_g = ?, target_fat_g = ?,
         updated_at = datetime('now')
       WHERE id = 1`,
    )
    .run(
      u.weight_kg,
      u.height_cm,
      u.age,
      u.sex,
      u.activity_level,
      u.goal,
      u.target_calories,
      u.target_protein_g,
      u.target_carbs_g,
      u.target_fat_g,
    );
  return getProfile();
}
