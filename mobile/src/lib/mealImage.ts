import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/** Lato più lungo massimo dopo il resize: abbastanza per Gemini, leggero da inviare. */
const MAX_DIMENSION = 1024;
/** Qualità JPEG (0..1). 0.6 è un buon compromesso dimensione/leggibilità per il cibo. */
const JPEG_QUALITY = 0.6;

export interface PickedImage {
  /** Immagine già ridimensionata e compressa, pronta per /api/analyze. */
  base64: string;
  mimeType: string;
}

export type ImageSource = "camera" | "library";

/** Errore d'uso: permesso negato o utente che annulla. Distinto dagli errori di rete. */
export class ImagePickCancelled extends Error {
  constructor(public readonly reason: "cancelled" | "permission_denied") {
    super(reason);
    this.name = "ImagePickCancelled";
  }
}

/**
 * Ridimensiona (lato lungo ≤ MAX_DIMENSION) e comprime un'immagine da URI in JPEG
 * base64. Comprimere lato client riduce i tempi di upload (limiti body Cloudflare)
 * e l'I/O verso Gemini. Usato sia dalla galleria sia dalla fotocamera interna.
 */
export async function prepareMealImage(
  uri: string,
  width?: number,
  height?: number,
): Promise<PickedImage> {
  const longest = Math.max(width ?? MAX_DIMENSION, height ?? MAX_DIMENSION);
  const context = ImageManipulator.manipulate(uri);
  if (longest > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / longest;
    context.resize({
      width: Math.round((width ?? MAX_DIMENSION) * scale),
      height: Math.round((height ?? MAX_DIMENSION) * scale),
    });
  }
  const rendered = await context.renderAsync();
  const out = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: JPEG_QUALITY,
    base64: true,
  });

  if (!out.base64) throw new Error("compressione immagine fallita");
  return { base64: out.base64, mimeType: "image/jpeg" };
}

/**
 * Apre fotocamera di sistema o galleria, poi delega a `prepareMealImage`.
 * La fotocamera interna (expo-camera) usa direttamente `prepareMealImage` sull'URI.
 */
export async function pickAndPrepareMealImage(source: ImageSource): Promise<PickedImage> {
  const perm =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new ImagePickCancelled("permission_denied");

  const opts: ImagePicker.ImagePickerOptions = {
    mediaTypes: "images",
    quality: 1,
    allowsEditing: false,
  };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);

  if (result.canceled || !result.assets?.[0]) throw new ImagePickCancelled("cancelled");
  const asset = result.assets[0];
  return prepareMealImage(asset.uri, asset.width, asset.height);
}
