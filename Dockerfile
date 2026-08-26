# syntax=docker/dockerfile:1
#
# Builds the app for `docker compose --profile full up` (see README's
# "Run everything in Docker" section). This is a *local convenience path*
# for running the whole stack without installing Node/pnpm on the host —
# it is not the eventual AWS deployment image, which will have its own
# concerns (ECR auth, health-check-driven rollout, etc.) layered on top.
#
# No Prisma binary-engine target to worry about here — the classic
# Docker+Prisma gotcha (a query-engine binary built for the wrong
# OS/libc). This app runs Prisma through `@prisma/adapter-pg`
# (src/db/client.ts), a driver adapter that executes queries via the
# plain `pg` package instead of Prisma's own compiled engine, so there is
# no `binaryTargets` to get wrong for Alpine/musl.
#
# Two stages:
#   `builder` — full toolchain (all devDependencies, the Prisma CLI, tsx
#               for the seed script). Also used directly, via
#               `--target builder`, by docker-compose.yml's one-off
#               `migrate` and `seed` services — same image, no second
#               Dockerfile needed for them.
#   `runner`  — just Next.js's traced `standalone` output plus a Node
#               runtime, running as a non-root user. This is the image
#               the `app` service actually runs.

FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY . .

# `pnpm install`'s `postinstall` (`prisma generate`) loads
# `prisma7.config.ts`, which imports `src/config/env.ts` and validates the
# *entire* environment schema (§30) just to read `DATABASE_URL` out of it
# — including, since Milestone 12, REDIS_URL and AUTH_URL in production.
# These are build-time placeholders only (same pattern as
# .github/workflows/ci.yml's build step): nothing at build time connects
# to a database, calls Gemini, or verifies a session. Real values are
# supplied at container *runtime* instead, via docker-compose.yml.
ARG DATABASE_URL="postgresql://build:build@build/build"
ARG AUTH_SECRET="docker-build-time-placeholder-32-chars-min"
ARG AUTH_URL="https://build.example.com"
ARG GEMINI_API_KEY="docker-build-time-placeholder"
ARG REDIS_URL="redis://build:6379"
ENV DATABASE_URL=$DATABASE_URL \
    AUTH_SECRET=$AUTH_SECRET \
    AUTH_URL=$AUTH_URL \
    GEMINI_API_KEY=$GEMINI_API_KEY \
    REDIS_URL=$REDIS_URL

# `pnpm install` has to run *before* NODE_ENV is set to "production" —
# pnpm skips devDependencies entirely once it is, which would also skip
# the `prisma` CLI and `tsx`, both devDependencies that
# docker-compose.yml's `migrate` and `seed` services (this same `builder`
# stage) need at runtime, not just `postinstall`.
RUN pnpm install --frozen-lockfile

ENV NODE_ENV=production
RUN pnpm build

# ---- runner: minimal image, only the traced standalone output ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
