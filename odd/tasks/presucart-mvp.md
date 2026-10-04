# PresuCart MVP Tasks

Status: in progress

## Decisions

- Build a mobile-first PWA.
- Use Supabase from the start for authentication and PostgreSQL-backed persistence.
- Keep Spanish UI and CRC/colones as the initial currency.
- Implement phase by phase with verification before continuing.
- Preserve local tolerance for active shopping flows so bad connectivity does not break the supermarket experience.

## Tasks

- [x] Task 1: Bootstrap the project base with Next.js, TypeScript, Tailwind, lint/test tooling, and Supabase dependencies.
  - Evidence: implemented project files for Next.js app, Tailwind, ESLint, Vitest, Supabase dependency, PWA manifest/icon, and Spanish landing page. `npm install`, `npm run test`, and `npm run build` completed after upgrading Next to 16.3.8. `npm audit --audit-level=moderate --omit=dev` reports 0 production vulnerabilities.
- [x] Task 2: Define the initial domain model and Supabase schema for User/Profile, Store, Product, Purchase, and PurchaseItem.
  - Evidence: implemented `types/database.ts` and `supabase/migrations/20260101000000_initial_schema.sql` with UUID-based tables, integer money amounts, generated subtotals, indexes, constraints, and RLS policies.
- [x] Task 3: Implement core money, price parsing, and budget calculation utilities with critical tests.
  - Evidence: implemented `domain/money.ts`, `domain/budget.ts`, `domain/ocrPrice.ts`, and `tests/domain.test.ts` for CRC formatting/parsing, budget totals, alert thresholds, quantity/edit/remove scenarios, invalid values, multiple OCR numbers, and no OCR price. `npm run test` passed 12/12 tests.
- [x] Task 4: Document setup, environment variables, and Phase 1 verification steps.
  - Evidence: implemented `README.md` setup, env vars, Supabase schema application, and verification commands. `.env.example` could not be created because the harness blocks env-like files as sensitive paths; README includes the required variable names.

## Commit evidence

- No commits yet. User has not explicitly authorized commits.
