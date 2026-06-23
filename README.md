# Food Tracker (uso personale)

App di tracking alimentare single-user: React Native (Expo) + backend leggero che
fa da proxy a **Google Gemini** per stimare calorie e macro dalle foto dei pasti.
Tutto a **costo zero**, sviluppo su **Arch Linux senza Mac**, iPhone come unico target.

## Struttura del monorepo

```
food-tracker/
├── mobile/   # App Expo Router (TS) — Zustand + TanStack Query, segreti in expo-secure-store
└── server/   # Backend Express (TypeScript) — SQLite + Gemini, dietro Cloudflare Tunnel + Access
```

### Perché Express/TypeScript per il backend
Un solo linguaggio (TS) su tutto lo stack: i tipi del JSON di Gemini e degli alimenti
sono condivisibili tra app e server. Gemini ha SDK Node ufficiale e il DB usa
**`node:sqlite`** (modulo built-in di Node 26): sincrono, zero dipendenze native da
compilare, banale da backuppare per un single-user.

## Sviluppo

### Backend (`server/`)
```bash
cd server
cp .env.example .env        # compila i segreti
npm install
npm run dev                 # http://localhost:8787  (healthcheck: /health)
npm run build && npm start  # build + run di produzione (migra il DB allo startup)
npm run db:migrate          # applica le migrazioni (idempotente)
npm run db:backup           # backup VACUUM INTO + retention -> backups/
```

> Backup automatico sull'home server: vedi `server/deploy/` (systemd timer giornaliero
> o riga cron equivalente).

### Mobile (`mobile/`)
```bash
cd mobile
cp .env.example .env        # imposta EXPO_PUBLIC_BACKEND_URL
npm install
npm start                   # Metro / Expo Dev Client
npx tsc --noEmit            # typecheck
```

## Sicurezza (riepilogo, dettagli in Fase 1c)
- **Cloudflare Access** davanti al tunnel: service token (`CF-Access-Client-*`) → blocca al bordo.
- **Bearer token applicativo** verificato dal backend → 401 senza token valido.
- Tutti i segreti lato telefono in `expo-secure-store` (Keychain iOS). Nessun segreto nel bundle.
- Chiave Gemini **solo** sul backend.

## Roadmap a fasi
- [x] **1a** Setup progetto (Expo + backend, healthcheck) ✅
- [x] **1b** Database SQLite (schema, migrazioni, backup) ✅
- [x] **1c** Sicurezza (Cloudflare Access + bearer + middleware 401) ✅
- [x] **1d** Controller Gemini (structured output + match dal DB) ✅ — *test live superato (gemini-2.5-flash)*
- [x] **2** UI & Navigazione — Bottom Tabs (Oggi/Storico/Profilo), Dashboard + Storico con dati mock ✅
- **3** Calcolatore & inserimento manuale ✅
  - [x] **3a** Calcolatore TDEE (Mifflin-St Jeor) + obiettivo Cut/Bulk/Normo + macro, persistito ✅
  - [x] **3b** CRUD Alimenti Personali + Ricette + diario per grammatura; Dashboard su dati reali ✅
  - [x] **3c** Open Food Facts (ricerca + barcode con fotocamera) → import come Alimento Personale ✅
  - [x] **3d** Tracking peso (trend) + TDEE adattivo (suggerimento da regressione + applica) ✅
- [ ] **4** Scanner IA (foto+testo, LiDAR opzionale)
- [ ] **5** Deployment (Docker/systemd, EAS Build, SideStore)
```
