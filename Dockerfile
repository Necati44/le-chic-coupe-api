# ---------- Builder ----------
FROM node:24-slim AS builder
WORKDIR /app

# Dépendances
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Sources
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Prisma client (dev deps OK ici) + build Nest
RUN npx prisma generate
RUN npm run build

# ---------- Runner ----------
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copie package + node_modules complets du builder (contain @prisma/client généré)
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# On retire les dev deps mais on garde le client Prisma généré
RUN npm prune --omit=dev

# Artéfacts runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Script d'entrée (migrations + seed admin + launch)
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
CMD ["/entrypoint.sh"]
