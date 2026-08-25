# LMS Platform

Foundation for a production-grade Learning Management System. See
[`CLAUDE.md`](./CLAUDE.md) for the full engineering charter, pinned stack,
and architecture rules governing this repository.

## Stack

Next.js (App Router) · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui
(Radix-based) · pnpm

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `pnpm dev` — start the dev server
- `pnpm build` — production build
- `pnpm start` — run the production build
- `pnpm lint` — run ESLint
- `pnpm typecheck` — run `tsc --noEmit`

## Project structure

```text
src/
├── app/               # Routes (App Router)
├── features/          # Feature-oriented business logic (auth, courses, ...)
├── components/
│   ├── ui/             # shadcn/ui primitives
│   └── shared/          # Composite shared components (EmptyState, ErrorState)
├── lib/               # Cross-cutting utilities
├── server/            # Server-only logic
├── db/                # Database layer (Prisma, once introduced)
├── types/             # Shared domain types
└── config/            # App configuration
```
