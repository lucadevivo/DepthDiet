/**
 * parseFloat tollerante alla virgola decimale: su tastiera italiana il separatore
 * dei decimali è la virgola, ma JS capisce solo il punto. Normalizza prima di parsare.
 */
export function parseDecimal(s: string): number {
  return Number.parseFloat(String(s).replace(",", "."));
}
