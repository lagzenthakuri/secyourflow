# syntax=docker/dockerfile:1

################################################################################
# Base
################################################################################
FROM node:22-alpine AS base
# https://github.com/nodejs/docker-node#nodealpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

################################################################################
# Full dependency tree (dev included) — needed to build Next.
################################################################################
FROM base AS deps
COPY package.json package-lock.json .npmrc ./
RUN npm ci

################################################################################
# Runtime-only dependency tree — used by the worker and migrate images.
# `prisma`, `@prisma/client`, `tsx` and `dotenv` are runtime deps so these
# images can generate the client and run `prisma migrate deploy` themselves.
################################################################################
FROM base AS prod-deps
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev
COPY prisma ./prisma
COPY prisma.config.ts ./
# prisma.config.ts throws unless DATABASE_URL is set, and client generation
# never connects. A syntactically valid placeholder is enough; the real URL is
# supplied at runtime. Declared as an ARG so it stays out of the final image.
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/secyourflow
RUN DATABASE_URL=$DATABASE_URL npx prisma generate

################################################################################
# Build the Next application (standalone output).
################################################################################
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma only needs a syntactically valid URL to generate the client; the real
# one is injected at runtime. Kept as an ARG so it does not persist in the image.
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/secyourflow
RUN DATABASE_URL=$DATABASE_URL npx prisma generate \
 && DATABASE_URL=$DATABASE_URL npm run build

################################################################################
# web — the Next server
################################################################################
FROM base AS web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

################################################################################
# worker — background job processor. Same source tree, different entrypoint.
# Runs under tsx because the worker is not part of the Next build graph.
################################################################################
FROM base AS worker
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs package.json tsconfig.json prisma.config.ts ./
COPY --chown=nextjs:nodejs prisma ./prisma
COPY --chown=nextjs:nodejs src ./src

USER nextjs

# `node --import tsx`, not `npx tsx`: npx and the tsx CLI both spawn the worker
# as a *child*, so SIGTERM to PID 1 never reaches it and the graceful shutdown
# handler never runs — the container would be SIGKILLed with jobs in flight.
# This form makes the worker the process itself.
CMD ["node", "--import", "tsx", "src/worker/index.ts"]

################################################################################
# migrate — one-shot `prisma migrate deploy`
################################################################################
FROM base AS migrate
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json prisma.config.ts ./
COPY prisma ./prisma
CMD ["npx", "prisma", "migrate", "deploy"]
