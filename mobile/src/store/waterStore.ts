import { create } from "zustand";
import { mockToday } from "../mock/nutrition";

/**
 * Stato locale del contatore acqua (Zustand). In Fase 3 sarà sincronizzato col
 * backend (water_log) tramite TanStack Query; per ora parte dal mock.
 */
interface WaterState {
  ml: number;
  add: (amount: number) => void;
  reset: () => void;
}

export const useWaterStore = create<WaterState>((set) => ({
  ml: mockToday.waterMl,
  add: (amount) => set((s) => ({ ml: Math.max(0, s.ml + amount) })),
  reset: () => set({ ml: 0 }),
}));
