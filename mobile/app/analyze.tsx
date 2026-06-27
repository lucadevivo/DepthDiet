import { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PinchGestureHandler, type PinchGestureHandlerGestureEvent } from "react-native-gesture-handler";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { NumberField } from "../src/components/NumberField";
import { Icon } from "../src/components/Icon";
import { useThemed } from "../src/theme/ThemeProvider";
import type { ThemeColors } from "../src/theme/colors";
import { useI18n } from "../src/i18n";
import { todayISO } from "../src/lib/date";
import { useAnalyzeMeal } from "../src/hooks/useAnalyzeMeal";
import { useAddDiaryEntry } from "../src/hooks/useDiary";
import { useCreateFood } from "../src/hooks/useFoods";
import {
  pickAndPrepareMealImage,
  prepareMealImage,
  ImagePickCancelled,
} from "../src/lib/mealImage";
import { useMealsQuery } from "../src/hooks/useMeals";
import { isLidarSupported, captureMealWithLidar, LidarCancelled } from "../src/lib/lidarMeal";
import type { AnalyzeBody, AnalyzeResult, DepthQuality, MealItem } from "../src/types/analyze";
import type { AddDiaryBody } from "../src/types/diary";

type Phase = "pick" | "camera" | "captured" | "review";

/**
 * Foto catturata e pronta per l'analisi (compressa) + anteprima da mostrare.
 * Ogni scatto porta con sé la propria stima volumetrica LiDAR (se misurata), così
 * il badge può comparire anche sulle viste aggiunte come contesto.
 */
interface Shot {
  previewUri: string;
  base64: string;
  mimeType: string;
  depth: { volumeMl: number; quality: DepthQuality } | null;
}

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

interface LensButton {
  label: string;
  lens: string;
}

/**
 * Dagli obiettivi fisici disponibili (id iOS) ricava i pulsanti di zoom ottico:
 * 0.5× (ultra-grandangolo), 1× (grandangolo), 2×/3×… (teleobiettivi). Niente
 * "device virtuali" (dual/triple): solo le lenti reali, per un'interfaccia pulita.
 */
function buildLensButtons(lenses: string[]): LensButton[] {
  const ultra = lenses.find((l) => /ultrawide/i.test(l));
  const wide = lenses.find((l) => /wideangle/i.test(l) && !/ultrawide/i.test(l));
  const teles = lenses.filter((l) => /telephoto/i.test(l));
  const buttons: LensButton[] = [];
  if (ultra) buttons.push({ label: "0.5×", lens: ultra });
  if (wide) buttons.push({ label: "1×", lens: wide });
  teles.forEach((l, i) => buttons.push({ label: `${i + 2}×`, lens: l }));
  return buttons;
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
  const { t, lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Box informativo "scrivi 'libreria' nel prompt per abbinare ai tuoi cibi" (#6).
  const [showLibInfo, setShowLibInfo] = useState(false);
  // Larghezza di una pagina del carosello foto (schermo meno il padding del contenuto).
  const { width: winW } = useWindowDimensions();
  const photoW = winW - 32;

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
  // Tutte le foto del pasto: la prima è la principale, le altre sono viste
  // aggiuntive (altre angolazioni) inviate a Gemini come contesto.
  const [photos, setPhotos] = useState<Shot[]>([]);
  // Foto attualmente visibile nel carosello (per i puntini indicatori).
  const [activePhoto, setActivePhoto] = useState(0);
  // Lo scatto interno serve la foto principale o una vista extra?
  const [cameraMode, setCameraMode] = useState<"primary" | "extra">("primary");
  // Il device ha il LiDAR e il modulo nativo è incluso nel build? (calcolato una volta)
  const lidarAvailable = useMemo(() => isLidarSupported(), []);
  const MAX_EXTRA = 3;
  const MAX_PHOTOS = MAX_EXTRA + 1;

  // Imposta/sostituisce la foto principale mantenendo le viste aggiuntive.
  const setPrimaryShot = (s: Shot) =>
    setPhotos((prev) => (prev.length > 0 ? [s, ...prev.slice(1)] : [s]));
  // Aggiunge una vista extra (fino al massimo consentito).
  const addShot = (s: Shot) =>
    setPhotos((prev) => (prev.length >= MAX_PHOTOS ? prev : [...prev, s]));
  // Rimuove la foto all'indice: se non resta nulla si torna alla scelta sorgente.
  const removePhotoAt = (idx: number) => {
    const next = photos.filter((_, i) => i !== idx);
    setPhotos(next);
    setActivePhoto((a) => Math.max(0, Math.min(a, next.length - 1)));
    if (next.length === 0) {
      setError(null);
      setPhase("pick");
    }
  };
  const [items, setItems] = useState<EditItem[]>([]);
  const [notes, setNotes] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const analyze = useAnalyzeMeal();
  const addEntry = useAddDiaryEntry(date);
  const createFood = useCreateFood();

  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);

  // Controlli fotocamera: zoom con le dita (pinch) e scelta dell'obiettivo ottico.
  const [zoom, setZoom] = useState(0);
  const zoomBase = useRef(0);
  const [lenses, setLenses] = useState<string[]>([]);
  const [selectedLens, setSelectedLens] = useState<string | undefined>(undefined);

  const onPinch = (e: PinchGestureHandlerGestureEvent) => {
    const next = zoomBase.current + (e.nativeEvent.scale - 1) * 0.5;
    setZoom(Math.min(1, Math.max(0, next)));
  };
  const onPinchStart = () => {
    zoomBase.current = zoom;
  };

  // --- Cattura ---

  const openCamera = async () => {
    setError(null);
    setCameraMode("primary");
    // Se il device ha il LiDAR, usiamo in automatico la cattura AR nativa (foto +
    // volume in una mira sola): l'utente non sceglie nulla, come per il reference
    // object. Lo schermo nativo gestisce da sé i permessi fotocamera.
    if (lidarAvailable) {
      await captureWithLidar("primary");
      return;
    }
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setError(t("scan.errCamera"));
        return;
      }
    }
    setPhase("camera");
  };

  // --- Viste aggiuntive (altre angolazioni dello stesso pasto) ---

  // Foto extra dalla fotocamera: se il device ha il LiDAR la misuriamo anche qui
  // (così il badge volume compare pure sulle viste extra), altrimenti camera normale.
  const addExtraFromCamera = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    setError(null);
    setCameraMode("extra");
    if (lidarAvailable) {
      await captureWithLidar("extra");
      return;
    }
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setError(t("scan.errCamera"));
        return;
      }
    }
    setPhase("camera");
  };

  const addExtraFromGallery = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    setError(null);
    try {
      const img = await pickAndPrepareMealImage("library");
      addShot({
        previewUri: `data:${img.mimeType};base64,${img.base64}`,
        base64: img.base64,
        mimeType: img.mimeType,
        depth: null,
      });
    } catch (e) {
      if (e instanceof ImagePickCancelled) return;
      setError(t("scan.errImage"));
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      const prepared = await prepareMealImage(photo.uri, photo.width, photo.height);
      // Foto da camera normale: nessun volume (la depth serve il LiDAR).
      const shot: Shot = {
        previewUri: photo.uri,
        base64: prepared.base64,
        mimeType: prepared.mimeType,
        depth: null,
      };
      if (cameraMode === "extra") addShot(shot);
      else setPrimaryShot(shot);
      setPhase("captured");
    } catch {
      setError(t("scan.errPhoto"));
    } finally {
      setCapturing(false);
    }
  };

  // Cattura LiDAR (Fase 4b): una mira → foto RGB + stima del volume del cibo, già
  // allineate. Il volume diventa un indizio per l'IA (migliora la stima delle porzioni).
  const captureWithLidar = async (mode: "primary" | "extra") => {
    setError(null);
    try {
      const res = await captureMealWithLidar(mealName);
      // Allego il volume solo se la misura è utile (quality "none" = scartata).
      const depth =
        res.volumeMl > 0 && res.quality !== "none"
          ? { volumeMl: res.volumeMl, quality: res.quality }
          : null;
      const shot: Shot = {
        previewUri: `data:${res.mimeType};base64,${res.imageBase64}`,
        base64: res.imageBase64,
        mimeType: res.mimeType,
        depth,
      };
      if (mode === "extra") addShot(shot);
      else setPrimaryShot(shot);
      setPhase("captured");
    } catch (e) {
      if (e instanceof LidarCancelled) return; // annullato dall'utente: nessun errore
      setError(t("scan.errLidar"));
    }
  };

  const pickFromGallery = async () => {
    setError(null);
    try {
      const img = await pickAndPrepareMealImage("library");
      setPrimaryShot({
        previewUri: `data:${img.mimeType};base64,${img.base64}`,
        base64: img.base64,
        mimeType: img.mimeType,
        depth: null, // immagine da galleria: nessun volume
      });
      setPhase("captured");
    } catch (e) {
      if (e instanceof ImagePickCancelled) {
        if (e.reason === "permission_denied")
          setError(t("scan.errGallery"));
        return;
      }
      setError(t("scan.errImage"));
    }
  };

  // --- Analisi (separata dalla cattura: si invia solo quando l'utente preme) ---

  const runAnalysis = async () => {
    const primary = photos[0];
    if (!primary) return;
    setError(null);
    try {
      const extras = photos.slice(1);
      // Ogni foto manda la propria misura LiDAR: la principale in `depth`, le viste
      // extra ciascuna nella sua voce. Il server le tratta come misure ripetute.
      const body: AnalyzeBody = {
        imageBase64: primary.base64,
        mimeType: primary.mimeType,
        contextText: contextText.trim() || undefined,
        lang,
        depth: primary.depth ?? undefined,
        extraImages:
          extras.length > 0
            ? extras.map((e) => ({
                imageBase64: e.base64,
                mimeType: e.mimeType,
                ...(e.depth ? { depth: e.depth } : {}),
              }))
            : undefined,
      };
      const result = await analyze.mutateAsync(body);
      if (result.items.length === 0) {
        setError(t("scan.errNoFood"));
        return;
      }
      setItems(toEditItems(result));
      setNotes(result.notes);
      setPhase("review");
    } catch {
      setError(t("scan.errAnalysis"));
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
      setError(t("scan.errSaveFood"));
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
          body = { date, meal_id: mealId, type: "custom_food", food_id: it.foodId, grams };
        } else {
          const m = scaled(it);
          body = { date, meal_id: mealId, type: "scan", description: it.name, grams, ...m };
        }
        await addEntry.mutateAsync(body);
      }
      router.back();
    } catch {
      setError(t("scan.errSaveDiary"));
    }
  };

  // #6 — Banner + modale che spiega l'abbinamento alla libreria (scrivi "library"
  // nel prompt). renderLibInfo* sono funzioni, non componenti, per evitare remount.
  const renderLibInfoCard = () => (
    <Pressable style={styles.libInfo} onPress={() => setShowLibInfo(true)}>
      <Icon name="bulb" size={16} color={colors.primary} />
      <Text style={styles.libInfoText}>{t("scan.libraryInfo.title")}</Text>
      <Icon name="chevron" size={16} color={colors.textMuted} />
    </Pressable>
  );
  const renderLibInfoModal = () => (
    <Modal visible={showLibInfo} transparent animationType="fade" onRequestClose={() => setShowLibInfo(false)}>
      <Pressable style={styles.infoBackdrop} onPress={() => setShowLibInfo(false)}>
        <Pressable style={styles.infoCard} onPress={() => {}}>
          <Text style={styles.infoTitle}>{t("scan.libraryInfo.title")}</Text>
          <Text style={styles.infoText}>{t("scan.libraryInfo.body")}</Text>
          <Pressable style={styles.infoOkBtn} onPress={() => setShowLibInfo(false)}>
            <Text style={styles.infoOkText}>{t("common.gotIt")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // === FASE: fotocamera interna (a tutto schermo, coerente col tema) ===
  if (phase === "camera") {
    const lensButtons = buildLensButtons(lenses);
    // Quando nessun obiettivo è scelto esplicitamente, l'attivo è "1×" (grandangolo).
    const wideLens = lensButtons.find((b) => b.label === "1×")?.lens;
    const activeLens = selectedLens ?? wideLens;
    return (
      <View style={styles.cameraScreen}>
        {/* Pinch per zoomare, come nella fotocamera nativa. */}
        <PinchGestureHandler onGestureEvent={onPinch} onActivated={onPinchStart}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            zoom={zoom}
            selectedLens={selectedLens}
            onAvailableLensesChanged={(e) => setLenses(e.lenses)}
          />
        </PinchGestureHandler>

        {/* Barra superiore: solo chiudi e titolo (interfaccia minimale). */}
        <View style={[styles.cameraTop, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => setPhase(cameraMode === "extra" ? "captured" : "pick")}
            hitSlop={12}
            style={styles.cameraClose}
          >
            <Icon name="close" size={26} color="#fff" />
          </Pressable>
          <Text style={styles.cameraTitle}>
            {cameraMode === "extra" ? t("scan.addView") : mealName}
          </Text>
          <View style={{ width: 26 }} />
        </View>

        {/* Barra inferiore: pulsanti zoom ottico + scatto. */}
        <View style={[styles.cameraBottom, { paddingBottom: insets.bottom + 24 }]}>
          {lensButtons.length > 1 ? (
            <View style={styles.lensRow}>
              {lensButtons.map((b) => {
                const active = b.lens === activeLens && zoom < 0.001;
                return (
                  <Pressable
                    key={b.lens}
                    onPress={() => {
                      setSelectedLens(b.lens);
                      setZoom(0);
                      zoomBase.current = 0;
                    }}
                    style={[styles.lensChip, active && styles.lensChipActive]}
                  >
                    <Text style={[styles.lensText, active && styles.lensTextActive]}>
                      {b.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Pressable onPress={takePhoto} disabled={capturing} style={styles.shutterOuter}>
            {capturing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  // === FASE: anteprima foto + prompt opzionale, poi invio ===
  if (phase === "captured") {
    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader title={t("scan.title")} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <Text style={styles.label}>{t("scan.meal", { name: mealName })}</Text>

          {/* Carosello foto: principale + viste aggiuntive una accanto all'altra.
              Scorri per vederle; ognuna ha la X per rimuoverla e il badge LiDAR se
              la sua profondità è stata misurata. */}
          {photos.length > 0 ? (
            <View>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) =>
                  setActivePhoto(Math.round(e.nativeEvent.contentOffset.x / photoW))
                }
              >
                {photos.map((shot, i) => (
                  <View key={i} style={{ width: photoW }}>
                    <Image
                      source={{ uri: shot.previewUri }}
                      style={styles.preview}
                      resizeMode="cover"
                    />
                    {i === 0 ? (
                      <View style={styles.mainTag}>
                        <Text style={styles.mainTagText}>{t("scan.mainTag")}</Text>
                      </View>
                    ) : null}
                    {shot.depth ? (
                      <View style={styles.lidarBadge}>
                        <Icon name="ruler" size={13} color="#fff" />
                        <Text style={styles.lidarBadgeText}>
                          LiDAR ~{Math.round(shot.depth.volumeMl)} ml
                        </Text>
                      </View>
                    ) : null}
                    <Pressable
                      style={styles.photoRemove}
                      onPress={() => removePhotoAt(i)}
                      hitSlop={8}
                    >
                      <Icon name="close" size={16} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
              {photos.length > 1 ? (
                <View style={styles.dots}>
                  {photos.map((_, i) => (
                    <View key={i} style={[styles.dot, i === activePhoto && styles.dotActive]} />
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Viste aggiuntive: altre angolazioni dello STESSO pasto, per dare più
              contesto a Gemini. Non vengono conteggiate doppie (lo dice il prompt). */}
          <Text style={styles.label}>{t("scan.addContext")}</Text>
          <Text style={styles.hintSmall}>{t("scan.addContextHint")}</Text>
          {photos.length < MAX_PHOTOS ? (
            <View style={styles.addRow}>
              <Pressable style={styles.addBtn} onPress={addExtraFromCamera}>
                <Icon name="camera" size={16} color={colors.text} />
                <Text style={styles.addBtnText}>{t("scan.camera")}</Text>
              </Pressable>
              <Pressable style={styles.addBtn} onPress={addExtraFromGallery}>
                <Icon name="gallery" size={16} color={colors.text} />
                <Text style={styles.addBtnText}>{t("scan.gallery")}</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.label}>{t("scan.promptLabel")}</Text>
          {renderLibInfoCard()}
          <TextInput
            style={styles.input}
            placeholder={t("scan.promptPlaceholder")}
            placeholderTextColor={colors.textMuted}
            value={contextText}
            onChangeText={setContextText}
            multiline
          />
          <Text style={styles.hintSmall}>{t("scan.promptHint")}</Text>

          {analyze.isPending ? (
            <View style={styles.busy}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.busyText}>{t("scan.analyzing")}</Text>
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 8 }}>
              <Pressable style={styles.primaryBtn} onPress={runAnalysis}>
                <Icon name="scan" size={20} color={colors.onPrimary} />
                <Text style={styles.primaryText}>{t("scan.analyze")}</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={openCamera}>
                <Icon name="camera" size={18} color={colors.text} />
                <Text style={styles.secondaryText}>{t("scan.retake")}</Text>
              </Pressable>
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        {renderLibInfoModal()}
      </KeyboardAvoidingView>
    );
  }

  // === FASE: scelta sorgente ===
  if (phase === "pick") {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t("scan.title")} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>
            {t("scan.pickLead")}
            {lidarAvailable ? t("scan.lidarNote") : ""}
          </Text>

          <Text style={styles.label}>{t("scan.meal", { name: mealName })}</Text>

          {renderLibInfoCard()}

          <View style={{ gap: 10, marginTop: 8 }}>
            <Pressable style={styles.primaryBtn} onPress={openCamera}>
              <Icon name="camera" size={20} color={colors.onPrimary} />
              <Text style={styles.primaryText}>{t("scan.openCamera")}</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={pickFromGallery}>
              <Icon name="gallery" size={18} color={colors.text} />
              <Text style={styles.secondaryText}>{t("scan.chooseGallery")}</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        {renderLibInfoModal()}
      </View>
    );
  }

  // === FASE: review ===
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
      <ScreenHeader title={t("scan.confirmTitle")} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          {t("scan.confirmLead", { meal: meals.data?.find((m) => m.id === mealId)?.name ?? "—" })}
        </Text>
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
                      {it.savedAsFood ? t("scan.savedAsFood") : t("scan.matched")}
                    </Text>
                  ) : (
                    <Text style={styles.estimated}>
                      {t("scan.aiEstimate", { pct: Math.round(it.confidence * 100) })}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.cardBody}>
                <NumberField
                  label={t("common.grams")}
                  value={it.gramsStr}
                  onChangeText={(tx) => patch(it.key, { gramsStr: tx })}
                  unit="g"
                />
                <Text style={styles.macros}>
                  {m.kcal} kcal · P {m.protein_g} · C {m.carbs_g} · F {m.fat_g}
                </Text>
              </View>

              {it.foodId == null ? (
                <Pressable
                  style={[styles.saveFoodBtn, savingKey === it.key && styles.disabled]}
                  disabled={savingKey === it.key}
                  onPress={() => saveAsFood(it)}
                >
                  {savingKey === it.key ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <Icon name="add" size={18} color={colors.primary} />
                      <Text style={styles.saveFoodText}>{t("scan.saveAsFood")}</Text>
                    </>
                  )}
                </Pressable>
              ) : null}
            </View>
          );
        })}

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>{t("scan.selectedTotal")}</Text>
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
            <Text style={styles.primaryText}>{t("scan.addToDiary")}</Text>
          )}
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => setPhase("captured")}>
          <Icon name="back" size={18} color={colors.text} />
          <Text style={styles.secondaryText}>{t("scan.backToPhoto")}</Text>
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
    preview: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: 16,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
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
    // Carosello foto (anteprima principale + viste extra affiancate)
    photoRemove: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "rgba(0,0,0,0.6)",
      alignItems: "center",
      justifyContent: "center",
    },
    mainTag: {
      position: "absolute",
      top: 8,
      left: 8,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    mainTagText: { color: "#fff", fontSize: 11, fontWeight: "800" },
    lidarBadge: {
      position: "absolute",
      bottom: 8,
      left: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "rgba(0,0,0,0.6)",
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    lidarBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
    dotActive: { backgroundColor: colors.primary },
    addRow: { flexDirection: "row", gap: 10 },
    addBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addBtnText: { color: colors.text, fontSize: 14, fontWeight: "700" },

    // Fotocamera interna
    cameraScreen: { flex: 1, backgroundColor: "#000" },
    cameraTop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    cameraClose: { width: 26, alignItems: "center" },
    cameraTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
    cameraBottom: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: "center",
      gap: 18,
    },
    lensRow: {
      flexDirection: "row",
      gap: 8,
      backgroundColor: "rgba(0,0,0,0.45)",
      borderRadius: 22,
      padding: 5,
    },
    lensChip: {
      minWidth: 44,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 18,
      alignItems: "center",
    },
    lensChipActive: { backgroundColor: "rgba(255,255,255,0.22)" },
    lensText: { color: "#cfcfcf", fontSize: 13, fontWeight: "700" },
    lensTextActive: { color: "#fff" },
    shutterOuter: {
      width: 76,
      height: 76,
      borderRadius: 38,
      borderWidth: 5,
      borderColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.15)",
    },
    shutterInner: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "#fff",
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
    matched: { color: colors.primary, fontSize: 12, fontWeight: "700", marginTop: 2 },
    estimated: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    cardBody: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    macros: { color: colors.textMuted, fontSize: 13, flexShrink: 1, textAlign: "right" },
    saveFoodBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    saveFoodText: { color: colors.primary, fontSize: 14, fontWeight: "700" },

    // #6 — Banner informativo abbinamento libreria + modale
    libInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.primary + "14",
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.primary + "33",
    },
    libInfoText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "700" },
    infoBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
      padding: 28,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      width: "100%",
    },
    infoTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
    infoText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
    infoOkBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 4,
    },
    infoOkText: { color: colors.onPrimary, fontSize: 15, fontWeight: "800" },
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
