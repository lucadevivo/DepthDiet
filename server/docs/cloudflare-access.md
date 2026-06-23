# Cloudflare Access (Zero Trust) — configurazione del livello 1

Il backend è raggiungibile pubblicamente tramite il Cloudflare Tunnel, quindi
l'autenticazione è l'unica barriera. Questo documento configura il **livello 1**:
Cloudflare Access davanti al tunnel, con **service token**, così le richieste non
autorizzate vengono bloccate **al bordo**, prima di toccare l'home server.
Il **livello 2** (bearer token applicativo) è già nel backend e va impostato a parte
(`APP_BEARER_TOKEN`).

Tutto ciò che segue è nel piano **gratuito** di Cloudflare Zero Trust.

## 1. Prerequisiti
- Dominio su Cloudflare e Tunnel già attivo verso il backend (es. `food.tuodominio.it`).
- Accesso a **Cloudflare One / Zero Trust** dashboard (`one.dash.cloudflare.com`).

## 2. Crea un Service Token
1. Zero Trust → **Access → Service Auth → Service Tokens → Create Service Token**.
2. Dagli un nome (es. `food-tracker-iphone`) e durata (es. 1 anno; è rinnovabile).
3. Cloudflare mostra **una sola volta**:
   - **Client ID**  → andrà nell'app come header `CF-Access-Client-Id`
   - **Client Secret** → andrà nell'app come header `CF-Access-Client-Secret`
   Copiali subito: il secret non è più recuperabile.

> Nell'app questi due valori vivono in **expo-secure-store** (Keychain), mai nel bundle.
> Vedi `mobile/src/lib/secureStore.ts` (chiavi `cf_access_client_id` / `cf_access_client_secret`).

## 3. Crea l'applicazione Access (Self-hosted)
1. Access → **Applications → Add an application → Self-hosted**.
2. **Application domain**: l'hostname del tunnel (es. `food.tuodominio.it`), eventualmente
   con path (`/`), così copre tutte le rotte incluso `/api`.
3. Salva e annota l'**Application Audience (AUD) Tag** (Overview dell'app):
   serve al backend per verificare il JWT → variabile `CF_ACCESS_AUD`.

## 4. Policy che richiede il Service Token
Nell'app Access crea una **policy** con:
- **Action: Service Auth** (NON "Allow": Service Auth è la modalità per i token non-interattivi).
- **Include → Service Token →** seleziona `food-tracker-iphone`.

Risultato: solo le richieste che presentano quel service token superano Access; tutte
le altre ricevono un blocco **al bordo**, senza raggiungere l'home server.

> Healthcheck: `GET /health` deve restare raggiungibile per Docker/il tunnel. Se vuoi
> escluderlo da Access, crea un'app Access separata su `food.tuodominio.it/health` con
> policy **Bypass**. In alternativa lascialo dietro Access (l'app non ne ha bisogno).

## 5. Variabili d'ambiente del backend
Nel `.env` del server (livello 1 lato origin, opzionale ma consigliato — verifica che
la richiesta sia passata davvero da Access):

```
CF_ACCESS_TEAM_DOMAIN=https://<il-tuo-team>.cloudflareaccess.com
CF_ACCESS_AUD=<AUD tag del punto 3>
```

Il backend, se entrambe sono presenti, verifica l'header `Cf-Access-Jwt-Assertion`
contro il JWKS pubblico del team (`/cdn-cgi/access/certs`). Se le lasci vuote, ci si
affida al solo blocco al bordo (utile in dev locale senza tunnel).

## 6. Header inviati dall'app
Ogni richiesta dall'app verso il backend porta:

```
CF-Access-Client-Id:     <Client ID>
CF-Access-Client-Secret: <Client Secret>
Authorization:           Bearer <APP_BEARER_TOKEN>
```

I primi due li valida Cloudflare Access (livello 1); il terzo lo valida il backend
(livello 2). Vedi `mobile/src/api/client.ts`.

## 7. Test rapido
```bash
# Senza service token → bloccato da Access (di solito 403 al bordo):
curl -i https://food.tuodominio.it/api/ping

# Con service token ma senza bearer → arriva al backend ma riceve 401:
curl -i https://food.tuodominio.it/api/ping \
  -H "CF-Access-Client-Id: <id>" -H "CF-Access-Client-Secret: <secret>"

# Con entrambi → 200:
curl -i https://food.tuodominio.it/api/ping \
  -H "CF-Access-Client-Id: <id>" -H "CF-Access-Client-Secret: <secret>" \
  -H "Authorization: Bearer <APP_BEARER_TOKEN>"
```
