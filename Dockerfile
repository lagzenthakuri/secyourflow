# syntax=docker/dockerfile:1

FROM oven/bun:1.3.9 AS build
WORKDIR /workspace
COPY . .
RUN bun install --frozen-lockfile

# Prisma generation is offline; this placeholder only satisfies Prisma's
# config loader. The real connection string is provided at runtime.
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/secyourflow
RUN DATABASE_URL=$DATABASE_URL bun run db:generate \
 && DATABASE_URL=$DATABASE_URL bun run build

FROM node:22-alpine AS web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
COPY --from=build --chown=nextjs:nodejs /workspace/public ./public
COPY --from=build --chown=nextjs:nodejs /workspace/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /workspace/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

FROM node:22-alpine AS worker
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
COPY --from=build --chown=nextjs:nodejs /workspace/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /workspace/packages ./packages
COPY --from=build --chown=nextjs:nodejs /workspace/src ./src
COPY --from=build --chown=nextjs:nodejs /workspace/package.json /workspace/tsconfig.json ./
USER nextjs
CMD ["node", "--import", "tsx", "src/worker/index.ts"]

FROM oven/bun:1.3.9 AS migrate
ENV NODE_ENV=production
WORKDIR /workspace
COPY . .
RUN bun install --frozen-lockfile
CMD ["bun", "run", "db:migrate"]
