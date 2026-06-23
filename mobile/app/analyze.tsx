import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { NumberField } from "../src/components/NumberField";
import { SegmentedControl } from "../src/components/SegmentedControl";
import { Icon } from "../src/components/Icon";
import { useTheme, useThemed } from "../src/theme/ThemeProvider";
import type { ThemeColors } from "../src/theme/colors";
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
import { useMealsQuery } from "../src/hooks/useMeals";
import type { AnalyzeBody, AnalyzeResult, MealItem, ReferenceType } from "../src/types/analyze";
import type { AddDiaryBody } from "../src/types/diary";

/** Sorgenti di cattura: galleria/fotocamera (4a) + LiDAR a inquadratura singola (4b). */
type CaptureSource = ImageSource | "lidar";

type RefChoice = ReferenceType | "none";
const REFERENCE_OPTIONS: { value: RefChoice; label: string }[] = [
  { value: "none", label: "None" },
  { value: "card_iso", label: "Card" },
  { value: "coin_1eur", label: "1€" },
  { value: "coin_2eur", label: "2€" },
];
const REF_HINT: Record<ReferenceType, string> = {
  card_iso: "ruler: card",
  coin_1eur: "ruler: 1€ coin",
  coin_2eur: "ruler: 2€ coin",
};
const QUALITY_HINT: Record<"high" | "medium" | "low", string> = {
  high: "high quality",
  medium: "medium quality",
  low: "low quality",
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
  const { colors, styles } = useThemed(makeStyles);
  const router = useRouter();

  // Pasto e data ereditati dal Diario (così lo scan finisce sul giorno giusto).
  const params = useLocalSearchParams<{ meal_id?: string; date?: string }>();
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayISO();
  const meals = useMealsQuery();
  const paramMealId = params.meal_id ? Number(params.meal_id) : NaN;

  const [phase, setPhase] = useState<Phase>("pick");
  const [mealId, setMealId] = useState<number | null>(
    Number.isInteger(paramMealId) ? paramMealId : null,
  );
  // Il pasto è quello da cui sono entrato (fisso). Fallback al primo se mancante.
  useEffect(() => {
    const list = meals.data ?? [];
    if (list.length > 0 && !list.some((m) => m.id === mealId)) setMealId(list[0]!.id);
  }, [meals.data, mealId]);
  const mealName = (meals.data ?? []).find((m) => m.id === mealId)?.name ?? "—";
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
        if (depth) hints.push(`volume ~${Math.round(cap.volumeMl)} ml · ${QUALITY_HINT[depth.quality]}`);
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
        setError("No food recognized. Try a sharper photo or add some context.");
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
          setError("Camera/gallery permission needed. Enable it in Settings.");
        }
        return; // annullato dall'utente: nessun errore da mostrare
      }
      setError("Analysis failed. Check your connection and try again.");
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
      setError("Could not save the food. Try again.");
    } finally {
      setSavingKey(null);
    }
  };

  const confirmToDiary = async () => {
    setError(null);
    if (mealId == null) return;
    const chosen = items.filter((it) => it.included);
    if (chosen.length === 0) return;
    try {
      for (const it of chosen) {
        const g = Number.parseFloat(it.gramsStr);
        const grams = Number.isFinite(g) && g > 0 ? g : it.baseGrams;
        let body: AddDiaryBody;
        if (it.foodId != null) {
          // Abbinato (o salvato come Alimento): il backend ricalcola i macro per grammatura.
          body = { date, meal_id: mealId, type: "custom_food", food_id: it.foodId, grams };
        } else {
          const m = scaled(it);
          body = { date, meal_id: mealId, type: "scan", description: it.name, grams, ...m };
        }
        await addEntry.mutateAsync(body);
      }
      router.back();
    } catch {
      setError("Could not save to the diary. Some entries may not have been added.");
    }
  };

  if (phase === "pick") {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Scan meal" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>
            Photograph the plate: the AI estimates the foods and matches them to your Foods.
          </Text>

          <Text style={styles.label}>Meal: {mealName}</Text>

          <Text style={styles.label}>Context (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g. there are 30g of parmesan underneath"
            placeholderTextColor={colors.textMuted}
            value={contextText}
            onChangeText={setContextText}
            multiline
          />

          <Text style={styles.label}>Reference object (optional)</Text>
          <SegmentedControl options={REFERENCE_OPTIONS} value={reference} onChange={setReference} />
          <Text style={styles.hintSmall}>
            Place a card or a coin next to the plate: the AI uses it as a ruler to
            estimate portions better.
          </Text>

          {busy ? (
            <View style={styles.busy}>
              <ActivityIndicator color={colors.calories} />
              <Text style={styles.busyText}>Analyzing…</Text>
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 8 }}>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => startAnalysis(lidarOn ? "lidar" : "camera")}
              >
                <Icon name="camera" size={20} color={colors.onPrimary} />
                <Text style={styles.primaryText}>Take photo</Text>
              </Pressable>
              {lidarOn ? (
                <Text style={styles.hintSmall}>
                  On your iPhone the shot also measures the food volume with LiDAR, automatically.
                </Text>
              ) : null}
              <Pressable style={styles.secondaryBtn} onPress={() => startAnalysis("library")}>
                <Icon name="gallery" size={18} color={colors.text} />
                <Text style={styles.secondaryText}>Choose from gallery</Text>
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
      <ScreenHeader title="Confirm meal" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          Check the matches and amounts, then add to the diary (
          {meals.data?.find((m) => m.id === mealId)?.name ?? "—"}).
        </Text>
        {usedHint ? <Text style={styles.hint}>{usedHint}</Text> : null}
        {notes ? (
          <View style={styles.notesRow}>
            <Icon name="bulb" size={16} color={colors.textMuted} />
            <Text style={styles.notes}>{notes}</Text>
          </View>
        ) : null}

        {items.map((it) => {
          const m = scaled(it);
          return (
            <View key={it.key} style={[styles.card, !it.included && styles.cardOff]}>
              <View style={styles.cardHead}>
                <Pressable
                  onPress={() => patch(it.key, { included: !it.included })}
                  style={[styles.check, it.included && styles.checkOn]}
                >
                  {it.included ? <Icon name="check" size={16} color={colors.onPrimary} /> : null}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{it.name}</Text>
                  {it.foodId != null ? (
                    <Text style={styles.matched}>
                      {it.savedAsFood ? "✓ saved as Food" : "✓ matched to one of your Foods"}
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
                  label="Grams"
                  value={it.gramsStr}
                  onChangeText={(t) => patch(it.key, { gramsStr: t })}
                  unit="g"
                />
                <Text style={styles.macros}>
                  {m.kcal} kcal · P {m.protein_g} · C {m.carbs_g} · F {m.fat_g}
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
                    <View style={styles.linkRow}>
                      <Icon name="add" size={16} color={colors.water} />
                      <Text style={styles.linkText}>
                        Save as Food (matched automatically next time)
                      </Text>
                    </View>
                  )}
                </Pressable>
              ) : null}
            </View>
          );
        })}

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Selected total</Text>
          <Text style={styles.totalKcal}>{total.kcal} kcal</Text>
          <Text style={styles.totalMacros}>
            P {round(total.protein_g, 1)} · C {round(total.carbs_g, 1)} · F {round(total.fat_g, 1)}
          </Text>
        </View>

        <Pressable
          style={[styles.primaryBtn, addEntry.isPending && styles.disabled]}
          disabled={addEntry.isPending}
          onPress={confirmToDiary}
        >
          {addEntry.isPending ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.primaryText}>Add to diary</Text>
          )}
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => setPhase("pick")}>
          <Icon name="back" size={18} color={colors.text} />
          <Text style={styles.secondaryText}>Retake photo</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: colors.onPrimary, fontSize: 16, fontWeight: "800" },
  secondaryBtn: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
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
  notesRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  notes: { color: colors.textMuted, fontSize: 13, fontStyle: "italic", flex: 1 },
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
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  matched: { color: colors.protein, fontSize: 12, fontWeight: "700", marginTop: 2 },
  estimated: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  cardBody: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  macros: { color: colors.textMuted, fontSize: 13, flexShrink: 1, textAlign: "right" },
  linkBtn: { paddingTop: 4 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  linkText: { color: colors.water, fontSize: 13, fontWeight: "700", flex: 1 },
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
