# syntax=docker/dockerfile:1
# Build context = racine du repo (monorepo pnpm) : `docker build -f signaling/Dockerfile .`
# depuis la racine, pas depuis signaling/ — nécessaire pour que pnpm résolve
# le lockfile partagé du workspace.

FROM node:22-alpine AS base
RUN corepack enable

# ---- build : compile TS, isole les deps de prod de signaling/ uniquement ----
FROM base AS build
WORKDIR /repo

# Seuls les package.json d'abord (cache Docker : réinstalle seulement si les
# dépendances changent, pas à chaque changement de code source).
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY signaling/package.json signaling/package.json
COPY web/package.json web/package.json
COPY e2e/package.json e2e/package.json

# --filter signaling... : installe seulement signaling/ (+ ses deps), jamais
# Next.js/Playwright des packages voisins — surface minimale, build plus vite.
RUN pnpm install --frozen-lockfile --filter signaling...

COPY signaling/tsconfig.json signaling/tsconfig.json
COPY signaling/src signaling/src
RUN pnpm --filter signaling run build

# pnpm deploy : sortie autonome (node_modules réels, pas de symlinks du
# workspace) avec uniquement les dépendances de production — la méthode
# recommandée par pnpm pour packager un service d'un monorepo. --legacy :
# signaling/ n'a aucune dépendance interne au workspace ("workspace:*"), donc
# pas besoin du mode "injected dependencies" introduit par pnpm v10.
RUN pnpm --filter signaling deploy --prod --legacy /out

# ---- runtime : image minimale, utilisateur non-root ----
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /out ./

USER app
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
