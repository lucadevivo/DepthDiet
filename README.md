# DepthDiet

App personale (single-user) di **tracking di calorie e macronutrienti**, in stile
"Macros", con **scansione dei pasti tramite AI** (Google Gemini) e, sugli iPhone Pro,
stima del volume via **LiDAR**. Sviluppata a **costo zero** su Arch Linux senza Mac,
con un iPhone come unico target.

> Il nome in codice durante lo sviluppo era *Food Tracker* (da cui il nome del repo).
> Il prodotto si chiama **DepthDiet**; il logo è un uovo all'occhio di bue.

---

## Cosa fa

DepthDiet calcola il tuo fabbisogno calorico e i macro obiettivo dai tuoi dati, ti fa
registrare cosa mangi (a mano, da database, da codice a barre o **fotografando il
piatto**), e ti mostra i progressi della giornata. È organizzata in **4 schede**:

- **Diary** — la giornata: selettore del giorno, totali calorie/macro, una card per
  ogni pasto. Aggiungi voci da Alimenti/Ricette, **tocchi una voce per modificarne la
  grammatura**, contatore dell'**acqua** persistente, e un bottone **"What should I
  eat?"** che chiede all'AI cosa mangiare per chiudere i macro mancanti (limitabile
  alla tua libreria o libero, con un campo nota per richieste specifiche).
- **Profile** — i tuoi dati (altezza/peso/sesso/età, obiettivo, livello di attività)
  in sola lettura, le metriche calcolate **BMR / BMI / fabbisogno idrico** (con
  spiegazioni), il **TDEE adattivo** dal trend del peso, e l'accesso al catalogo di
  **Alimenti, Ricette e Pasti**. La modifica dei dati è in una schermata dedicata
  ("Your data").
- **Goals** — il fabbisogno calorico giornaliero, la **ciambella dei macro** e la
  composizione della dieta: preset (Standard, Balanced, Low-fat, High-protein, Keto)
  oppure **custom**, definibile in **percentuali** o in **grammi per kg di peso**
  (proteine e grassi in g/kg, i carboidrati riempiono le calorie rimanenti).
- **Settings** — formula di calcolo del **BMR** (Mifflin-St Jeor, Harris-Benedict,
  Katch-McArdle, con spiegazioni), **Appearance** (tema chiaro/scuro/sistema, accento
  cromatico, colore di sfondo e dei box, con anteprima dal vivo) e le **credenziali**
  di connessione al backend.

### Funzioni principali
- **Scanner pasti AI** (`/api/analyze`): fotografi il piatto (fotocamera interna con
  scelta dell'obiettivo ottico ×0.5/×1/×2/×3 e zoom a pinch; depth LiDAR sui Pro),
  Gemini stima alimenti, grammi e macro; gli alimenti che hai già salvato vengono
  **abbinati** e ricalcolati dai valori reali del DB. Puoi salvare un alimento stimato
  come **Alimento Personale** (così la volta dopo viene abbinato).
- **Suggeritore AI** (`/api/suggest`): consigli "cosa mangiare" basati sui macro
  mancanti del giorno, sensati (niente condimenti da soli), con scope libreria/libero.
- **Open Food Facts**: ricerca prodotti e **scansione del codice a barre** per
  importarli come Alimenti Personali.
- **Alimenti / Ricette / Pasti personalizzati**: CRUD completo; i pasti sono liberi
  (non più i 4 fissi) e riordinabili.
- **Peso & TDEE adattivo**: registri il peso, regressione sul trend, e l'obiettivo
  calorico si ri-bilancia di conseguenza.
- **Temi**: dark/light/system, 6 accenti, colori sfondo/box personalizzabili.

---

## Architettura

Monorepo con due progetti:

```
food-tracker/
├── mobile/   # App Expo Router (TypeScript) — il client iOS
└── server/   # Backend Express (TypeScript) — API + Gemini + SQLite
```

### Mobile (`mobile/`)
- **Expo SDK 56 / React Native 0.85 / React 19**, **Expo Router** (cartella `app/`).
- **TanStack Query** per lo stato server; **expo-secure-store** (Keychain) per i segreti.
- Sistema di **tema runtime** (`src/theme/`): `useThemed(makeStyles)` legge i colori
  del tema attivo; nessun colore hardcoded nei componenti.
- L'URL del backend è in `EXPO_PUBLIC_BACKEND_URL` (inlinato nel bundle al build).
- Niente `react-native-svg` (sarebbe un modulo nativo → rebuild): grafici fatti a mano
  (es. la ciambella dei macro `MacroDonut`).

### Server (`server/`)
- **Express 5 + TypeScript** (ESM, strict).
- **DB = `node:sqlite`** (modulo built-in di Node 24+): sincrono, **zero dipendenze
  native** da compilare. Migrazioni come moduli TS in `src/db/migrations/`, applicate
  in modo idempotente allo startup. Backup con `VACUUM INTO` + retention.
- **Gemini** via `@google/genai`, modello **`gemini-3.1-flash-lite`** (quota free alta;
  configurabile con `GEMINI_MODEL`). **Structured output** nativo (`responseSchema`),
  match degli alimenti dal DB prima della chiamata, ricalcolo server-side, retry su
  errori transitori (429/5xx). La chiave Gemini vive **solo** sul server.

### Come si calcolano gli obiettivi
1. **BMR** dalla formula scelta (Mifflin-St Jeor di default; Katch-McArdle usa il
   body-fat %).
2. **TDEE** = BMR × moltiplicatore di attività (1.2 → 1.9).
3. **Calorie obiettivo** = TDEE × fattore dell'obiettivo (−20% / −10% / 0 / +10% / +20%).
4. **Macro** dalle calorie obiettivo secondo la composizione scelta (preset %, custom %
   o g/kg). 4 kcal/g per proteine e carboidrati, 9 kcal/g per i grassi.

### API del backend (tutte sotto `/api`, protette da bearer token)
| Endpoint | Cosa fa |
|---|---|
| `GET/PUT /api/profile`, `/profile/diet`, `/profile/formula` | profilo, dieta, formula BMR |
| `GET/POST/DELETE /api/foods`, `/api/recipes` | Alimenti Personali e Ricette |
| `GET/POST/DELETE/PATCH /api/meals` | pasti personalizzati (+ reorder) |
| `GET/POST /api/diary`, `PUT /api/diary/:id`, `DELETE /api/diary/:id` | diario; `PUT` cambia la grammatura |
| `GET/POST /api/water` | contatore acqua del giorno (delta, `water_log`) |
| `GET/POST /api/weight`, `/weight/adaptive`, `/weight/adaptive/apply` | peso & TDEE adattivo |
| `GET /api/off/search`, `/off/barcode/:code` | proxy Open Food Facts |
| `POST /api/analyze` | scanner pasti AI (immagine → alimenti/macro) |
| `POST /api/suggest` | suggeritore AI "cosa mangiare" |
| `GET /health` | healthcheck **pubblico** (no auth) |

---

## Sviluppo

### Backend (`server/`)
```bash
cd server
cp .env.example .env        # compila APP_BEARER_TOKEN, GEMINI_API_KEY, ...
npm install
npm run dev                 # http://localhost:8787  (healthcheck: /health)
npm run build && npm start  # build + run di produzione (migra il DB allo startup)
npm run db:migrate          # applica le migrazioni (idempotente)
npm run db:backup           # backup VACUUM INTO + retention -> backups/
npm run typecheck
```

### Mobile (`mobile/`)
```bash
cd mobile
cp .env.example .env        # imposta EXPO_PUBLIC_BACKEND_URL (LAN in dev, dominio in prod)
npm install
npm start                   # Metro / dev client
npx tsc --noEmit            # typecheck
```

> Expo Go non basta (il progetto è SDK 56, lo store è fermo a 54): per provarla sul
> telefono serve una **dev build** sideloata (vedi sotto).

---

## Produzione

Il backend gira in **Docker** sull'home server, raggiungibile da internet **solo
tramite Cloudflare Tunnel** (nessuna porta aperta sul router). Guida completa in
[`server/deploy/DEPLOY.md`](server/deploy/DEPLOY.md).

```bash
cd server
docker compose up -d --build   # build immagine + avvio (porta su 127.0.0.1, volumi persistenti)
```

- L'app si pubblica su un sottodominio del tunnel (es. `foodtracker.<dominio>`) che
  instrada verso il container; la porta `8787` è esposta **solo** su `127.0.0.1`.
- **DB e backup** in volumi Docker nominati; backup giornaliero via cron
  (`docker compose exec -T food-tracker node dist/scripts/backup.js`).

### App standalone su iPhone (senza Mac)
- **Dev build** (JS da Metro via LAN): workflow CI `.github/workflows/ios-dev-ipa.yml`.
- **Release standalone** (bundle JS incorporato, backend di produzione bakato):
  workflow `.github/workflows/ios-release-ipa.yml`.
- L'IPA non firmato si installa via **sideload** (ri-firma con Apple ID free; la firma
  scade dopo 7 giorni → ri-sideload per rinnovare).

---

## Sicurezza

- **Nessuna porta inbound** sul router: Cloudflare Tunnel è solo in uscita.
- Backend in ascolto **solo su `127.0.0.1`**; ci arriva unicamente il tunnel.
- **TLS** end-to-end (bordo Cloudflare + canale cifrato del tunnel).
- **Auth fail-closed**: ogni `/api/*` richiede un **bearer token** (256-bit, confronto
  timing-safe) → `401` senza token valido. È supportato anche **Cloudflare Access**
  (header `CF-Access-Client-*`) come secondo livello opzionale.
- Segreti: `.env` sul server (gitignorato), chiave Gemini **solo** sul backend, token
  dell'app nel **Keychain** del telefono — mai nel bundle né nel repo.

---

## Stato

Tutte le fasi pianificate sono **complete**: calcolatore TDEE, CRUD Alimenti/Ricette/
Pasti, diario, Open Food Facts, peso & TDEE adattivo, scanner AI (+ LiDAR), suggeritore
AI, persistenza acqua, sistema temi, branding. **Backend deployato in produzione** dietro
Cloudflare Tunnel e **app rilasciata** come build standalone sull'iPhone.
