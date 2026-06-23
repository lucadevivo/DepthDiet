import { requireOptionalNativeModule } from "expo-modules-core";
import type { DepthQuality } from "../types/analyze";

/**
 * Cattura a inquadratura singola dal modulo nativo LiDAR (Fase 4b): una sola mira
 * produce sia la foto RGB sia la stima di volume dalla depth, già allineate.
 */
export interface LidarCapture {
  /** Foto del pasto già ridimensionata/compressa, pronta per /api/analyze. */
  imageBase64: string;
  mimeType: string;
  /** Volume stimato del cibo in ml. */
  volumeMl: number;
  /** Affidabilità della misura; "none" = nessun dato volumetrico utile. */
  quality: DepthQuality | "none";
  /** true se il dispositivo ha davvero il LiDAR. */
  hasLiDAR: boolean;
}

interface LidarMealModule {
  isSupported(): boolean;
  captureMeal(): Promise<LidarCapture>;
}

/**
 * Modulo nativo opzionale: assente finché 4b-3 non viene compilato in un nuovo IPA.
 * `requireOptionalNativeModule` torna null senza crashare, così il build attuale resta usabile.
 */
const native = requireOptionalNativeModule<LidarMealModule>("LidarMeal");

/** Lanciato quando l'utente annulla la cattura AR. */
export class LidarCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "LidarCancelled";
  }
}

/** true solo se il modulo nativo è presente E il device supporta sceneDepth (LiDAR). */
export function isLidarSupported(): boolean {
  try {
    return native?.isSupported() ?? false;
  } catch {
    return false;
  }
}

/** Apre lo schermo AR nativo e risolve con foto + volume. */
export async function captureMealWithLidar(): Promise<LidarCapture> {
  if (!native) throw new Error("modulo LiDAR non disponibile in questo build");
  return native.captureMeal();
}
