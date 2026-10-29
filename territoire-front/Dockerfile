# Étape 1 : build (même version majeure de Node.js que la CI)
FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Étape 2 : exécution. Seule la sortie standalone de Next.js (output: "standalone" dans next.config.ts) est copiée :
# un serveur Node.js et les seuls modules qu'il utilise, sans devDependencies, sources ni cache de build
FROM node:24-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Écoute sur toutes les interfaces (Docker définit sinon HOSTNAME à l'identifiant du conteneur)
ENV HOSTNAME=0.0.0.0

# Exécution sans les droits root (utilisateur "node" fourni par l'image)
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["node", "server.js"]
