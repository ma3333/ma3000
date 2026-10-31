# CLAUDE.md

Building-management SaaS for residential buildings and office towers (Israel). Hebrew-first, RTL.
Users: house committees, management companies, residents/office tenants, vendors, safety auditors, external stats consumers.

## Where things are
- `docs/01..17-*.md` – product & technical plan (Hebrew). Read the relevant doc before building a module:
  tickets/SLA `02`, architecture `03`, data model `04`, deployment `05`, white-label `06`, security `07`+`13`,
  API `08`, roadmap `09`, RFQ `10`, smart building `11`, payments `12`, debugging `14`, logging `15`, notifications `17`,
  building profile & special states `18`, module map & build order `19`.
- `deliverables/` – Hebrew Word docs (requirements, dev plan, business plan); regenerate via `tools/docgen`.
- `apps/api` – NestJS 12 API (CommonJS, global prefix `/api`). Modules under `src/<module>/`.
- `apps/web` – React 19 + Vite 8, `<html lang="he" dir="rtl">`. Dev proxy `/api` → `localhost:3000`.
- `packages/shared` – types shared by api/web. Built to `dist/`; rebuild after changes (`pnpm --filter @ma3000/shared build`).

## Commands (repo root)
- `pnpm install` · `docker compose up -d` (PostgreSQL 16 + Redis 7) · `pnpm dev` (api :3000, web :5173)
- `pnpm typecheck` · `pnpm test` · `pnpm build` · `pnpm format` / `pnpm format:check`
- API env: copy `apps/api/.env.example` → `apps/api/.env`. Config is validated with zod in `src/config.ts`.
- Run all four checks (format:check, typecheck, test, build) before committing; CI runs the same plus an API smoke test.

## Decisions
- pnpm workspaces; TypeScript pinned to 5.9 (Nest needs `emitDecoratorMetadata`).
- DB access: Drizzle ORM + `pg` (schema in `apps/api/src/db/schema.ts`, migrations via drizzle-kit). Not Prisma.
- Tests: Vitest everywhere; API tests use `unplugin-swc` for decorator metadata.
- Every request gets `x-request-id` (correlation id) – keep propagating it into logs, jobs and outbound calls.

## Rules for new code
- **Every building is different** (docs/18): never hard-code building structure or equipment. Structure is a tree
  (entrances, floors incl. underground, units, common areas, elements); equipment comes from a two-level catalog
  (platform + tenant) with JSON attribute schemas; assets may sit inside units with a `responsibility` field.
  Features must react to the building profile (derived rules) and to active special states (renovation, flood…).
- **Every charge process** has due dates, an end date, a reminder schedule and a sanction policy (grace, interest,
  late fee, escalation) with a linked legal basis; sanctions/waivers are ledger entries, never edits.
- **Multi-tenancy**: every tenant-owned table has `tenant_id` and a PostgreSQL RLS policy; add a test that
  another tenant cannot read/write it.
- **No PII in logs** (phones, emails, ID numbers, bank accounts, tokens). Sensitive actions go to the audit log.
- **Money**: double-entry ledger, never delete or update posted entries (reverse instead). The platform never holds funds.
- **UI**: all user-facing text in Hebrew (i18n-ready), RTL layout, use logical CSS (`margin-inline-start`, not `margin-left`).
- **Integrations** (SMS, WhatsApp, payments…) go behind an adapter interface; never call a vendor SDK from business code.
- Life-safety systems (fire, sprinklers) are read-only in the smart-building module – never add write commands.
- Keep modules small and focused; match existing style; no new dependency without a reason.

## Current status
Phase 1 (infrastructure) in progress. Done: monorepo skeleton, health check (DB + Redis), request ids, CI.
Next: tenancy + RLS + building profile core (tree, catalogs) → identity/auth (OTP) → audit log → structured logging → notifications core. See `docs/09-roadmap.md`
and `deliverables/02-תכנית-פיתוח.docx` §5.
