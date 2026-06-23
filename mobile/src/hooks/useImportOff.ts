import { useState } from "react";
import { ApiError } from "../api/client";
import { useCreateFood } from "./useFoods";
import type { ImportStatus } from "../components/OffProductRow";
import type { OffProduct } from "../types/food";

/**
 * Importa un prodotto Open Food Facts come Alimento Personale, tenendo traccia
 * dello stato per ciascun barcode (idle/pending/done/duplicate/error).
 * Un prodotto già salvato (stesso barcode) → 409 → stato "duplicate".
 */
export function useImportOff() {
  const create = useCreateFood();
  const [statuses, setStatuses] = useState<Record<string, ImportStatus>>({});

  const setStatus = (barcode: string, status: ImportStatus) =>
    setStatuses((s) => ({ ...s, [barcode]: status }));

  const importProduct = (p: OffProduct) => {
    setStatus(p.barcode, "pending");
    create.mutate(
      {
        name: p.name,
        brand: p.brand,
        barcode: p.barcode,
        kcal_per_100: p.kcal_per_100,
        protein_per_100: p.protein_per_100,
        carbs_per_100: p.carbs_per_100,
        fat_per_100: p.fat_per_100,
      },
      {
        onSuccess: () => setStatus(p.barcode, "done"),
        onError: (err) =>
          setStatus(p.barcode, err instanceof ApiError && err.status === 409 ? "duplicate" : "error"),
      },
    );
  };

  const statusOf = (barcode: string): ImportStatus => statuses[barcode] ?? "idle";
  return { importProduct, statusOf };
}
