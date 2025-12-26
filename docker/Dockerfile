FROM node:18-alpine

WORKDIR /app

# Installer les dépendances système nécessaires
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --omit=dev

# Copier le code source
COPY . .

# Créer les dossiers nécessaires
RUN mkdir -p sessions logs

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["node", "src/app.js"]

