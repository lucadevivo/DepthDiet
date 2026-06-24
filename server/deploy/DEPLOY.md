# Deploy del backend food-tracker (Fase 5)

Deploy single-user su **luca-server** (Debian, SSH porta 52222, niente sudo, tutto
in container), dietro il **Cloudflare Tunnel** già esistente — lo stesso che serve
`webluca.app` e `immich.webluca.app`. Esposizione scelta: **solo bearer token**
dietro il Tunnel (nessun Cloudflare Access davanti a quest'app).

> ⚠️ Questi file (`Dockerfile`, `docker-compose.yml`, `.dockerignore`) sono pronti
> nel repo ma **non è ancora stato fatto alcun deploy**: la procedura qui sotto va
> eseguita a mano su luca-server quando si decide di andare in produzione.

## 1. Prerequisiti (già presenti su luca-server)
- Docker + Docker Compose v2.
- Il container `cloudflared` del Tunnel esistente (quello di `webluca.app`).
- Una API key Gemini e un `APP_BEARER_TOKEN` (genera: `openssl rand -hex 32`).

## 2. Portare il codice sul server
```bash
ssh -p 52222 luca@luca-server
mkdir -p ~/apps/food-tracker && cd ~/apps/food-tracker
git clone git@github.com:lucadevivo/food-tracker.git .   # oppure git pull se già clonato
cd server
```

## 3. Configurare i segreti
```bash
cp .env.example .env
# Compila .env:
#   NODE_ENV=production
#   APP_BEARER_TOKEN=<openssl rand -hex 32>   # lo stesso che metti nell'app
#   GEMINI_API_KEY=<la tua chiave>
#   GEMINI_MODEL=gemini-3.1-flash-lite
#   CF_ACCESS_TEAM_DOMAIN / CF_ACCESS_AUD = vuoti (no CF Access davanti a quest'app)
```
DB e backup vivono in **volumi Docker nominati** (`food-tracker-data`,
`food-tracker-backups`), quindi sopravvivono a rebuild e update.

## 4. Avviare
```bash
docker compose up -d --build
docker compose logs -f food-tracker          # deve loggare "in ascolto su :8787"
docker compose exec food-tracker node -e "fetch('http://localhost:8787/health').then(r=>r.json()).then(console.log)"
```
La porta è pubblicata su `127.0.0.1:8787` (non sulla LAN): ci arriva solo il Tunnel.

## 5. Collegare il Cloudflare Tunnel
Aggiungi un ingress per il nuovo sottodominio (es. `foodtracker.webluca.app`) →
`http://localhost:8787`. A seconda di come è gestito il Tunnel esistente:

- **config.yml di cloudflared** — aggiungi sotto `ingress:` (PRIMA della regola
  catch-all `service: http_status:404`):
  ```yaml
    - hostname: foodtracker.webluca.app
      service: http://localhost:8787
  ```
  poi `docker restart cloudflared` (o il nome del container del tunnel).
  Se cloudflared gira in un suo container, `localhost` è quello del container:
  usa la rete/host giusta (es. `http://host.docker.internal:8787` o metti
  food-tracker sulla stessa rete docker del tunnel e usa `http://food-tracker:8787`).
- **Dashboard Zero Trust** (tunnel gestito da remoto) — Tunnels → il tuo tunnel →
  Public Hostname → Add: `foodtracker.webluca.app` → `http://localhost:8787`.

Crea anche il record DNS (CNAME `foodtracker` → `<tunnel-id>.cfargotunnel.com`,
proxied) se non lo fa la dashboard automaticamente.

## 6. Verifica end-to-end
```bash
curl -s https://foodtracker.webluca.app/health          # { "status": "ok", ... }
curl -s -H "Authorization: Bearer <APP_BEARER_TOKEN>" https://foodtracker.webluca.app/api/ping
```

## 7. Puntare l'app al backend di produzione
In `mobile/.env`:
```
EXPO_PUBLIC_BACKEND_URL=https://foodtracker.webluca.app
```
- Con la **dev build + Metro** (setup attuale): le `EXPO_PUBLIC_*` sono lette quando
  Metro fa il bundle → **riavvia Metro** dopo la modifica (niente rebuild nativo).
- Per un'app **standalone** (release) servirà un nuovo build, perché la variabile
  viene inlinata nel bundle JS.

Poi, sul telefono: Profile → ⚙️ → incolla l'`APP_BEARER_TOKEN` → Verifica connessione.
Così l'app funziona ovunque (non più solo sulla LAN di casa).

## 8. Backup automatici
Lo script di backup è compilato in `dist/scripts/backup.js` (VACUUM INTO + retention,
usa `BACKUP_DIR`/`BACKUP_RETENTION` dal `.env`). Schedula un host-cron che lo lancia
dentro il container:
```cron
0 3 * * *  cd ~/apps/food-tracker/server && docker compose exec -T food-tracker node dist/scripts/backup.js >> ~/apps/food-tracker/backup.log 2>&1
```
(Le unit systemd in `deploy/food-tracker-backup.{service,timer}` sono un'alternativa
se in futuro si girasse il server con node sull'host invece che in container.)

## 9. Aggiornare / ridepoyare
```bash
cd ~/apps/food-tracker && git pull
cd server && docker compose up -d --build
```
I volumi nominati preservano DB e backup tra un deploy e l'altro.
