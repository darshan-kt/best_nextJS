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

## Authentication

Auth.js (NextAuth v5) with a Credentials provider — email and password,
hashed with Node's built-in scrypt. Sessions are stateless JWTs, which is
what Auth.js requires when using credentials.

The Account / Session / VerificationToken tables exist but are unused by
the credentials flow. They are there so that adding an OAuth or magic-link
provider later is a configuration change, not a migration.

Authorization goes through a single policy function,
[`src/features/auth/policy.ts`](./src/features/auth/policy.ts). Features
must call `can()` rather than inspecting roles themselves, so that a rule
never ends up implemented in two places that can disagree. Routes enforce
it via the guards in
[`src/features/auth/guards.ts`](./src/features/auth/guards.ts):

```ts
// In a protected Server Component or Server Action:
const actor = await requireUser("/dashboard");        // authentication
await requirePermission({ type: "course:update", course }); // authorization
```

Enforcement lives in the Server Components and Actions that touch data —
deliberately not in middleware, which is a bypassable place to put an
authorization boundary.

Self-service sign-up always creates a `STUDENT`. Elevated roles are
granted administratively; there is no UI for that yet.

> Roles are copied into the session token at sign-in, so a role change
> only takes effect the next time that user signs in.

## Project structure

```text
prisma/
├── schema.prisma      # Domain schema
└── migrations/        # Versioned SQL migrations

src/
├── app/               # Routes (App Router)
├── features/
│   └── auth/           # Auth.js config, policy layer, guards, actions
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
