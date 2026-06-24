# --- Build: compila TypeScript -> dist/ ---
# node:24 = LTS con node:sqlite built-in disponibile senza flag (come in dev).
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Runtime: solo dipendenze di produzione + dist/ ---
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# Cartelle persistenti (DB + backup). Create con owner `node` così i volumi
# nominati nascono scrivibili dall'utente non-root.
RUN mkdir -p /app/data /app/backups && chown -R node:node /app/data /app/backups

USER node
EXPOSE 8787

# index.ts esegue le migrazioni (idempotenti) all'avvio, poi serve le richieste.
CMD ["node", "dist/index.js"]
