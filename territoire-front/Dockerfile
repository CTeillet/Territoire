# Utiliser une image de base officielle Node.js
FROM node:26-alpine

# Définir le répertoire de travail dans le conteneur
WORKDIR /app
RUN chown node:node /app
# Exécution sans les droits root (utilisateur "node" fourni par l'image)
USER node

# Copier package.json et package-lock.json (ou yarn.lock)
COPY --chown=node:node package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le reste de l'application
COPY --chown=node:node . .

# Construire l'application Next.js
RUN npm run build

# Exposer le port sur lequel l'application va tourner
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

# Commande pour démarrer l'application
CMD ["npm", "start"]
