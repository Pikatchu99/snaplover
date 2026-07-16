# syntax=docker/dockerfile:1
# Build context = racine du repo (monorepo pnpm) : `docker build -f web/Dockerfile .`
# depuis la racine, pas depuis web/ — nécessaire pour que pnpm résolve le
# lockfile partagé du workspace.

FROM node:22-alpine AS base
RUN corepack enable

# ---- build ----
FROM base AS build
WORKDIR /repo

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY web/package.json web/package.json
COPY signaling/package.json signaling/package.json
COPY e2e/package.json e2e/package.json

# --filter web... : installe web/ (+ ses deps), sans embarquer les deps de
# signaling/e2e — surface minimale, build plus rapide.
RUN pnpm install --frozen-lockfile --filter web...

COPY web/ web/

# Next.js inline les variables NEXT_PUBLIC_* dans le bundle client AU BUILD,
# pas à l'exécution — doivent donc être fournies en --build-arg, jamais en
# variable d'env runtime seule (voir docs/DEPLOY.md). Les secrets serveur
# (STUN_URLS, TURN_*) ne sont PAS ici : ils restent runtime-only, lus par la
# route /api/turn-credentials à la demande, jamais inlinés dans un bundle.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SIGNALING_URL
ARG NEXT_PUBLIC_UMAMI_SCRIPT_URL
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_SIGNALING_URL=${NEXT_PUBLIC_SIGNALING_URL} \
    NEXT_PUBLIC_UMAMI_SCRIPT_URL=${NEXT_PUBLIC_UMAMI_SCRIPT_URL} \
    NEXT_PUBLIC_UMAMI_WEBSITE_ID=${NEXT_PUBLIC_UMAMI_WEBSITE_ID}

RUN pnpm --filter web run build

# ---- runtime : sortie standalone Next.js, utilisateur non-root ----
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

RUN addgroup -S app && adduser -S app -G app

# Structure de .next/standalone (racine du monorepo fixée via
# `outputFileTracingRoot`, voir next.config.ts) : `node_modules` partagés
# hoistés à LA RACINE du dossier standalone, `web/server.js` dans un
# sous-dossier — on garde cette structure relative telle quelle (copier
# seulement `standalone/web/` casse la résolution de `next` lui-même).
COPY --from=build --chown=app:app /repo/web/.next/standalone ./
COPY --from=build --chown=app:app /repo/web/.next/static ./web/.next/static
COPY --from=build --chown=app:app /repo/web/public ./web/public

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "web/server.js"]
