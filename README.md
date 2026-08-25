# LMS Platform

Foundation for a production-grade Learning Management System. See
[`CLAUDE.md`](./CLAUDE.md) for the full engineering charter, pinned stack,
and architecture rules governing this repository.

## Stack

Next.js (App Router) · TypeScript (strict) · PostgreSQL · Prisma · Zod ·
Tailwind CSS v4 · shadcn/ui (Radix-based) · pnpm

## Getting started

```bash
cp .env.example .env      # adjust if you are not using the bundled database
pnpm install              # also generates the Prisma Client
pnpm db:up                # start PostgreSQL in Docker (port 5433)
pnpm db:migrate           # apply migrations
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The bundled database listens on **port 5433**, not the default 5432, so it
cannot collide with another PostgreSQL instance already running locally.

## Scripts

- `pnpm dev` — start the dev server
- `pnpm build` — production build
- `pnpm start` — run the production build
- `pnpm lint` — run ESLint
- `pnpm typecheck` — run `tsc --noEmit`
- `pnpm db:up` / `pnpm db:down` — start / stop the local PostgreSQL container
- `pnpm db:migrate` — create and apply a migration (development)
- `pnpm db:deploy` — apply pending migrations (production)
- `pnpm db:generate` — regenerate the Prisma Client
- `pnpm db:studio` — browse the database in Prisma Studio

## Environment

All environment variables are declared and validated in
[`src/config/env.ts`](./src/config/env.ts) and documented in
[`.env.example`](./.env.example). Import `env` from that module rather than
reading `process.env` directly — a missing or malformed value then fails at
startup instead of surfacing later as `undefined`.

## Project structure

```text
prisma/
├── schema.prisma      # Domain schema
└── migrations/        # Versioned SQL migrations

src/
├── app/               # Routes (App Router)
├── features/          # Feature-oriented business logic (auth, courses, ...)
├── components/
│   ├── ui/             # shadcn/ui primitives
│   └── shared/          # Composite shared components (EmptyState, ErrorState)
├── lib/               # Cross-cutting utilities
├── server/            # Server-only logic
├── db/
│   ├── client.ts       # Shared Prisma Client instance
│   └── generated/      # Generated Prisma Client (git-ignored)
├── types/             # Shared domain types
└── config/
    └── env.ts          # Validated environment configuration
```
