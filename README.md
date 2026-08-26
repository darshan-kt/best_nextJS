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
pnpm db:up                # start PostgreSQL + Redis in Docker (5433, 6380)
pnpm db:migrate           # apply migrations
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The bundled Postgres listens on **port 5433** and Redis on **port 6380** —
neither the default port for its service — so neither collides with
another local instance you might already be running.

## Scripts

- `pnpm dev` — start the dev server
- `pnpm build` — production build
- `pnpm start` — run the production build
- `pnpm lint` — run ESLint
- `pnpm typecheck` — run `tsc --noEmit`
- `pnpm test` — unit tests (Vitest, no database required)
- `pnpm test:integration` — integration tests against a real, separate
  Postgres database (see [`TEST_DATABASE_URL`](./.env.example))
- `pnpm test:e2e` — Playwright end-to-end tests
- `pnpm db:up` / `pnpm db:down` — start / stop the local Postgres + Redis containers
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

**`AUTH_URL` is required in production outside Vercel.** Auth.js infers
the canonical origin automatically in local development and on Vercel (via
its own `VERCEL` env var), but nowhere else — confirmed by actually
running a production build locally without it (Milestone 12): every
sign-in failed with Auth.js's `UntrustedHost` error. `src/config/env.ts`
now refuses to start in production without it (unless `VERCEL` is set).

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
deliberately not in `src/proxy.ts` (Next's Proxy convention, formerly
"Middleware"), which is a bypassable place to put an authorization
boundary. `proxy.ts` exists only to attach a security header (see
[Security headers](#security-headers) below), not to gate access.

Self-service sign-up always creates a `STUDENT`. Elevated roles are
granted administratively; there is no UI for that yet.

> Roles are copied into the session token at sign-in, so a role change
> only takes effect the next time that user signs in.

### Sign-in rate limiting

Failed sign-ins are throttled on two independent counters — per account and
per client IP — over a rolling window (defaults: 5 per account, 20 per IP,
15 minutes). Only failures count, and a success clears both. Thresholds are
configurable; see [`.env.example`](./.env.example).

The check runs *before* the password is verified, so a throttled request
never triggers a scrypt hash — otherwise the defence would itself be a CPU
exhaustion vector.

Two caveats worth knowing:

- **The per-IP limit is defence in depth, not a guarantee.** The client
  address comes from `x-forwarded-for`, which is forgeable unless a proxy
  you control overwrites it; Next.js exposes no remote-address API to
  Server Actions. The per-account limit is the one that actually stops a
  brute-force attack, and it cannot be evaded this way.
- **The backing store is swappable, and production requires the Redis
  one.** [`src/server/rate-limit/memory.ts`](./src/server/rate-limit/memory.ts)
  stores state in process memory, which is correct only for a single
  instance — on multiple instances or serverless, each process keeps its
  own counters and the effective limit is multiplied by the instance
  count (or stops applying at all under unbounded concurrency).
  [`src/server/rate-limit/redis.ts`](./src/server/rate-limit/redis.ts)
  implements the same `RateLimiter` interface
  ([`types.ts`](./src/server/rate-limit/types.ts)) against Redis, chosen
  automatically in [`index.ts`](./src/server/rate-limit/index.ts) whenever
  `REDIS_URL` is set — no auth or chat code changes either way, which was
  the entire reason the interface existed before either implementation of
  it needed to swap. `src/config/env.ts` refuses to start in production
  without `REDIS_URL` for exactly this reason.

## Production hardening

### Security headers

`next.config.ts` sets the static security headers (`X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and — in
production only — `Strict-Transport-Security`).

The Content-Security-Policy is set separately, in
[`src/proxy.ts`](./src/proxy.ts) (Next's Proxy convention, formerly
"Middleware" — [renamed in v16](https://nextjs.org/docs/messages/middleware-to-proxy)),
because it needs a fresh nonce on every request. `script-src` carries the
real protection (`'strict-dynamic'` plus the nonce). `style-src` stays
permissive (`'unsafe-inline'`) — re-examined, not carried forward
unexamined, for two independent reasons: Radix UI positions overlays via
inline `style` attributes (which a CSP nonce can't cover — nonces only
apply to `<style>` elements), and `vaul` (the mobile Drawer) injects a
real `<style>` element at runtime whose exact content lives inside its own
bundled output, not this codebase, making it impractical to pin safely.
See the comment in `proxy.ts` for the full reasoning, including why a
split `style-src-elem`/`style-src-attr` policy was tried and rejected.
`proxy.ts` is **not** an authorization boundary — see
[Authorization](#authentication) above for why access control stays in
Server Components/Actions instead.

### Error handling

`app/not-found.tsx` and `app/error.tsx` give every route a branded fallback
instead of Next's default error screen. `app/global-error.tsx` is the
last-resort boundary for when the root layout itself throws — it renders
its own `<html>`/`<body>` with plain inline styles, deliberately not
depending on anything the failure might have taken down with it.

All three, plus the route-specific boundaries under `app/courses/`, report
through [`src/lib/logger.ts`](./src/lib/logger.ts) — a thin structured-JSON
wrapper around `console`, kept swappable for a real sink (Sentry, Datadog,
...) later without touching call sites.

### Health check

`GET /api/health` checks database connectivity and returns
`{ "status": "ok" }` (200) or `{ "status": "error" }` (503), for a load
balancer or orchestrator to poll. Deliberately unauthenticated and
deliberately minimal — the response never includes the underlying error.

### CI

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs typecheck,
lint, unit tests, and a production build on every push/PR to `main`.
Integration tests and the `@ai`-tagged Playwright spec stay local-only —
they need a live Postgres and a real Gemini API key respectively, which
isn't worth paying for on every PR.

## Project structure

```text
prisma/
├── schema.prisma      # Domain schema
└── migrations/        # Versioned SQL migrations

src/
├── app/               # Routes (App Router)
│   ├── api/health/     # Liveness/readiness probe
│   ├── error.tsx       # Root error boundary
│   ├── global-error.tsx # Last-resort boundary (root layout itself failed)
│   └── not-found.tsx   # Global 404
├── features/
│   └── auth/           # Auth.js config, policy layer, guards, actions
├── components/
│   ├── ui/             # shadcn/ui primitives
│   └── shared/          # Composite shared components (EmptyState, ErrorState)
├── lib/
│   └── logger.ts        # Structured logging (thin console wrapper)
├── server/
│   └── rate-limit/     # Swappable rate limiting (memory or Redis; Redis in prod)
├── db/
│   ├── client.ts       # Shared Prisma Client instance
│   └── generated/      # Generated Prisma Client (git-ignored)
├── types/             # Shared domain types
├── proxy.ts           # CSP nonce only — not an authorization boundary
└── config/
    └── env.ts          # Validated environment configuration
```
