import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { NumberField } from "../src/components/NumberField";
import { SegmentedControl } from "../src/components/SegmentedControl";
import { colors } from "../src/theme/colors";
import { todayISO } from "../src/lib/date";
import { useAnalyzeMeal } from "../src/hooks/useAnalyzeMeal";
import { useAddDiaryEntry } from "../src/hooks/useDiary";
import { useCreateFood } from "../src/hooks/useFoods";
import {
  pickAndPrepareMealImage,
  ImagePickCancelled,
  type ImageSource,
} from "../src/lib/mealImage";
import {
  captureMealWithLidar,
  isLidarSupported,
  LidarCancelled,
} from "../src/lib/lidarMeal";
import { MEAL_LABELS, type MealName } from "../src/types/nutrition";
import type { AnalyzeBody, AnalyzeResult, MealItem, ReferenceType } from "../src/types/analyze";
import type { AddDiaryBody } from "../src/types/diary";

const MEAL_OPTIONS = (Object.keys(MEAL_LABELS) as MealName[]).map((m) => ({
  value: m,
  label: MEAL_LABELS[m],
}));

/** Sorgenti di cattura: galleria/fotocamera (4a) + LiDAR a inquadratura singola (4b). */
type CaptureSource = ImageSource | "lidar";

type RefChoice = ReferenceType | "none";
const REFERENCE_OPTIONS: { value: RefChoice; label: string }[] = [
  { value: "none", label: "Nessuno" },
  { value: "card_iso", label: "Carta" },
  { value: "coin_1eur", label: "1€" },
  { value: "coin_2eur", label: "2€" },
];
const REF_HINT: Record<ReferenceType, string> = {
  card_iso: "righello: carta",
  coin_1eur: "righello: moneta 1€",
  coin_2eur: "righello: moneta 2€",
};
const QUALITY_HINT: Record<"high" | "medium" | "low", string> = {
  high: "qualità alta",
  medium: "qualità media",
  low: "qualità bassa",
};

type Phase = "pick" | "review";

/** Riga editabile derivata da un MealItem dell'analisi. */
interface EditItem {
  key: string;
  name: string;
  source: MealItem["source"];
  /** id del custom_food: dall'abbinamento o dopo "salva come Alimento". */
  foodId: number | null;
  included: boolean;
  gramsStr: string;
  /** Grammi e macro di riferimento dall'analisi (per ricalcolo proporzionale). */
  baseGrams: number;
  base: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  confidence: number;
  savedAsFood: boolean;
}

const round = (n: number, d = 0) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

/** Fattore di scala dei macro quando l'utente cambia i grammi. */
function factorOf(item: EditItem): number {
  const g = Number.parseFloat(item.gramsStr);
  if (!Number.isFinite(g) || g <= 0 || item.baseGrams <= 0) return 1;
  return g / item.baseGrams;
}

function scaled(item: EditItem) {
  const k = factorOf(item);
  return {
    kcal: round(item.base.kcal * k),
    protein_g: round(item.base.protein_g * k, 1),
    carbs_g: round(item.base.carbs_g * k, 1),
    fat_g: round(item.base.fat_g * k, 1),
  };
}

function toEditItems(result: AnalyzeResult): EditItem[] {
  return result.items.map((it, i) => ({
    key: `${i}-${it.name}`,
    name: it.name,
    source: it.source,
    foodId: it.source === "matched" ? (it.matched_food_id ?? null) : null,
    included: true,
    gramsStr: String(round(it.grams)),
    baseGrams: it.grams,
    base: { kcal: it.kcal, protein_g: it.protein_g, carbs_g: it.carbs_g, fat_g: it.fat_g },
    confidence: it.confidence,
    savedAsFood: false,
  }));
}

export default function AnalyzeScreen() {
  const router = useRouter();
  const date = todayISO();

  const [phase, setPhase] = useState<Phase>("pick");
  const [meal, setMeal] = useState<MealName>("lunch");
  const [contextText, setContextText] = useState("");
  const [reference, setReference] = useState<RefChoice>("none");
  const [items, setItems] = useState<EditItem[]>([]);
  const [notes, setNotes] = useState<string | undefined>();
  const [usedHint, setUsedHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const analyze = useAnalyzeMeal();
  const addEntry = useAddDiaryEntry(date);
  const createFood = useCreateFood();

  // Il bottone LiDAR appare solo se il modulo nativo è presente e il device lo supporta.
  const [lidarOn] = useState(isLidarSupported);
  const busy = analyze.isPending;

  const startAnalysis = async (source: CaptureSource) => {
    setError(null);
    const ref = reference === "none" ? undefined : { type: reference };
    const hints: string[] = [];
    if (reference !== "none") hints.push(REF_HINT[reference]);
    try {
      let body: AnalyzeBody;
      if (source === "lidar") {
        const cap = await captureMealWithLidar();
        const depth =
          cap.quality !== "none" ? { volumeMl: cap.volumeMl, quality: cap.quality } : undefined;
        if (depth) hints.push(`📐 volume ~${Math.round(cap.volumeMl)} ml · ${QUALITY_HINT[depth.quality]}`);
        body = {
          imageBase64: cap.imageBase64,
          mimeType: cap.mimeType,
          contextText: contextText.trim() || undefined,
          depth,
          reference: ref,
        };
      } else {
        const img = await pickAndPrepareMealImage(source);
        body = {
          imageBase64: img.base64,
          mimeType: img.mimeType,
          contextText: contextText.trim() || undefined,
          reference: ref,
        };
      }
      const result = await analyze.mutateAsync(body);
      if (result.items.length === 0) {
        setError("Nessun alimento riconosciuto. Riprova con una foto più nitida o aggiungi del contesto.");
        return;
      }
      setItems(toEditItems(result));
      setNotes(result.notes);
      setUsedHint(hints.length ? hints.join(" · ") : null);
      setPhase("review");
    } catch (e) {
      if (e instanceof LidarCancelled) return; // annullato dall'utente
      if (e instanceof ImagePickCancelled) {
        if (e.reason === "permission_denied") {
          setError("Serve il permesso per fotocamera/galleria. Abilitalo dalle impostazioni.");
        }
        return; // annullato dall'utente: nessun errore da mostrare
      }
      setError("Analisi fallita. Controlla la connessione e riprova.");
    }
  };

  const patch = (key: string, p: Partial<EditItem>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...p } : it)));

  const saveAsFood = async (item: EditItem) => {
    if (item.baseGrams <= 0) return;
    setSavingKey(item.key);
    try {
      const per100 = (v: number) => round((v / item.baseGrams) * 100, 1);
      const food = await createFood.mutateAsync({
        name: item.name,
        kcal_per_100: per100(item.base.kcal),
        protein_per_100: per100(item.base.protein_g),
        carbs_per_100: per100(item.base.carbs_g),
        fat_per_100: per100(item.base.fat_g),
        default_serving_g: round(item.baseGrams),
      });
      patch(item.key, { foodId: food.id, savedAsFood: true });
    } catch {
      setError("Salvataggio alimento fallito. Riprova.");
    } finally {
      setSavingKey(null);
    }
  };

  const confirmToDiary = async () => {
    setError(null);
    const chosen = items.filter((it) => it.included);
    if (chosen.length === 0) return;
    try {
      for (const it of chosen) {
        const g = Number.parseFloat(it.gramsStr);
        const grams = Number.isFinite(g) && g > 0 ? g : it.baseGrams;
        let body: AddDiaryBody;
        if (it.foodId != null) {
          // Abbinato (o salvato come Alimento): il backend ricalcola i macro per grammatura.
          body = { date, meal, type: "custom_food", food_id: it.foodId, grams };
        } else {
          const m = scaled(it);
          body = { date, meal, type: "scan", description: it.name, grams, ...m };
        }
        await addEntry.mutateAsync(body);
      }
      router.back();
    } catch {
      setError("Errore nel salvataggio del diario. Alcune voci potrebbero non essere state aggiunte.");
    }
  };

  if (phase === "pick") {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Scansiona pasto" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>
            Fotografa il piatto: l'IA stima gli alimenti e li abbina ai tuoi Alimenti Personali.
          </Text>

          <Text style={styles.label}>Pasto</Text>
          <SegmentedControl options={MEAL_OPTIONS} value={meal} onChange={setMeal} />

          <Text style={styles.label}>Contesto (opzionale)</Text>
          <TextInput
            style={styles.input}
            placeholder="Es. ci sono 30g di parmigiano sotto"
            placeholderTextColor={colors.textMuted}
            value={contextText}
            onChangeText={setContextText}
            multiline
          />

          <Text style={styles.label}>Oggetto di riferimento (opzionale)</Text>
          <SegmentedControl options={REFERENCE_OPTIONS} value={reference} onChange={setReference} />
          <Text style={styles.hintSmall}>
            Metti una carta o una moneta accanto al piatto: l'IA la usa come righello per
            stimare meglio le porzioni.
          </Text>

          {busy ? (
            <View style={styles.busy}>
              <ActivityIndicator color={colors.calories} />
              <Text style={styles.busyText}>Analisi in corso…</Text>
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 8 }}>
              {lidarOn ? (
                <Pressable style={styles.primaryBtn} onPress={() => startAnalysis("lidar")}>
                  <Text style={styles.primaryText}>📐  Misura con LiDAR</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={lidarOn ? styles.secondaryBtn : styles.primaryBtn}
                onPress={() => startAnalysis("camera")}
              >
                <Text style={lidarOn ? styles.secondaryText : styles.primaryText}>📷  Scatta foto</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={() => startAnalysis("library")}>
                <Text style={styles.secondaryText}>🖼️  Scegli dalla galleria</Text>
              </Pressable>
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      </View>
    );
  }

  // phase === "review"
  const total = items
    .filter((it) => it.included)
    .reduce(
      (acc, it) => {
        const m = scaled(it);
        return {
          kcal: acc.kcal + m.kcal,
          protein_g: acc.protein_g + m.protein_g,
          carbs_g: acc.carbs_g + m.carbs_g,
          fat_g: acc.fat_g + m.fat_g,
        };
      },
      { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Conferma il pasto" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          Controlla gli abbinamenti e le quantità, poi aggiungi al diario ({MEAL_LABELS[meal]}).
        </Text>
        {usedHint ? <Text style={styles.hint}>{usedHint}</Text> : null}
        {notes ? <Text style={styles.notes}>💡 {notes}</Text> : null}

        {items.map((it) => {
          const m = scaled(it);
          return (
            <View key={it.key} style={[styles.card, !it.included && styles.cardOff]}>
              <View style={styles.cardHead}>
                <Pressable
                  onPress={() => patch(it.key, { included: !it.included })}
                  style={[styles.check, it.included && styles.checkOn]}
                >
                  <Text style={styles.checkMark}>{it.included ? "✓" : ""}</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{it.name}</Text>
                  {it.foodId != null ? (
                    <Text style={styles.matched}>
                      {it.savedAsFood ? "✓ salvato come Alimento" : "✓ abbinato a un tuo Alimento"}
                    </Text>
                  ) : (
                    <Text style={styles.estimated}>
                      Stima IA · confidenza {Math.round(it.confidence * 100)}%
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.cardBody}>
                <NumberField
                  label="Grammi"
                  value={it.gramsStr}
                  onChangeText={(t) => patch(it.key, { gramsStr: t })}
                  unit="g"
                />
                <Text style={styles.macros}>
                  {m.kcal} kcal · P {m.protein_g} · C {m.carbs_g} · G {m.fat_g}
                </Text>
              </View>

              {it.foodId == null ? (
                <Pressable
                  style={styles.linkBtn}
                  disabled={savingKey === it.key}
                  onPress={() => saveAsFood(it)}
                >
                  {savingKey === it.key ? (
                    <ActivityIndicator color={colors.water} />
                  ) : (
                    <Text style={styles.linkText}>＋ Salva come Alimento (così la prossima volta lo abbina)</Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          );
        })}

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Totale selezione</Text>
          <Text style={styles.totalKcal}>{total.kcal} kcal</Text>
          <Text style={styles.totalMacros}>
            P {round(total.protein_g, 1)} · C {round(total.carbs_g, 1)} · G {round(total.fat_g, 1)}
          </Text>
        </View>

        <Pressable
          style={[styles.primaryBtn, addEntry.isPending && styles.disabled]}
          disabled={addEntry.isPending}
          onPress={confirmToDiary}
        >
          {addEntry.isPending ? (
            <ActivityIndicator color="#06210f" />
          ) : (
            <Text style={styles.primaryText}>Aggiungi al diario</Text>
          )}
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => setPhase("pick")}>
          <Text style={styles.secondaryText}>← Rifai la foto</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 60 },
  lead: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  label: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 6 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  busy: { alignItems: "center", gap: 8, paddingVertical: 24 },
  busyText: { color: colors.textMuted, fontSize: 14 },
  primaryBtn: {
    backgroundColor: colors.calories,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryText: { color: "#06210f", fontSize: 16, fontWeight: "800" },
  secondaryBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  hintSmall: { color: colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: -2 },
  hint: {
    color: colors.protein,
    fontSize: 13,
    fontWeight: "700",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    overflow: "hidden",
  },
  notes: { color: colors.textMuted, fontSize: 13, fontStyle: "italic" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardOff: { opacity: 0.5 },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.calories, borderColor: colors.calories },
  checkMark: { color: "#06210f", fontWeight: "900", fontSize: 16 },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  matched: { color: colors.protein, fontSize: 12, fontWeight: "700", marginTop: 2 },
  estimated: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  cardBody: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  macros: { color: colors.textMuted, fontSize: 13, flexShrink: 1, textAlign: "right" },
  linkBtn: { paddingTop: 4 },
  linkText: { color: colors.water, fontSize: 13, fontWeight: "700" },
  totalCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 2,
    marginTop: 4,
  },
  totalLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  totalKcal: { color: colors.calories, fontSize: 26, fontWeight: "900" },
  totalMacros: { color: colors.text, fontSize: 14 },
  error: { color: colors.fat, fontSize: 14, marginTop: 6 },
});
