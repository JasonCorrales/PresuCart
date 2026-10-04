# PresuCart MVP Tasks

Status: in progress

## Decisions

- Build a mobile-first PWA.
- Use Supabase from the start for authentication and PostgreSQL-backed persistence.
- Keep Spanish UI and CRC/colones as the initial currency.
- Implement phase by phase with verification before continuing.
- Preserve local tolerance for active shopping flows so bad connectivity does not break the supermarket experience.

## Tasks

### Phase 1 — Foundation

- [x] Task 1: Bootstrap the project base with Next.js, TypeScript, Tailwind, lint/test tooling, and Supabase dependencies.
  - Evidence: implemented project files for Next.js app, Tailwind, ESLint, Vitest, Supabase dependency, PWA manifest/icon, and Spanish landing page. `npm install`, `npm run test`, and `npm run build` completed after upgrading Next to 16.3.8. `npm audit --audit-level=moderate --omit=dev` reports 0 production vulnerabilities.
- [x] Task 2: Define the initial domain model and Supabase schema for User/Profile, Store, Product, Purchase, and PurchaseItem.
  - Evidence: implemented `types/database.ts` and `supabase/migrations/20260101000000_initial_schema.sql` with UUID-based tables, integer money amounts, generated subtotals, indexes, constraints, and RLS policies.
- [x] Task 3: Implement core money, price parsing, and budget calculation utilities with critical tests.
  - Evidence: implemented `domain/money.ts`, `domain/budget.ts`, `domain/ocrPrice.ts`, and `tests/domain.test.ts` for CRC formatting/parsing, budget totals, alert thresholds, quantity/edit/remove scenarios, invalid values, multiple OCR numbers, and no OCR price. `npm run test` passed 12/12 tests.
- [x] Task 4: Document setup, environment variables, and Phase 1 verification steps.
  - Evidence: implemented `README.md` setup, env vars, Supabase schema application, and verification commands. `.env.example` could not be created because the harness blocks env-like files as sensitive paths; README includes the required variable names.

### Phase 2 — Login, purchase creation, and manual item entry

- [x] Task 5: Implement Supabase authentication screens and session-aware navigation.
  - Evidence: implemented `/auth` sign in/sign up UI, session-aware header/logout, Spanish missing-Supabase configuration notice, and landing navigation to auth/new purchase.
- [x] Task 6: Implement authenticated purchase creation with budget and optional store name.
  - Evidence: implemented `/purchases/new` with authenticated user lookup, positive CRC budget validation, optional store name snapshot, Supabase insert with `owner_id`, and redirect to active purchase.
- [x] Task 7: Implement active purchase view with manual price entry, quantity, live totals, and persisted purchase items.
  - Evidence: implemented `/purchases/[id]` with owner-scoped purchase fetch, persisted manual item insertion, client-side budget/spent/available/percent/alert recalculation, progress bar, and item deletion.
- [x] Task 8: Add Phase 2 tests and documentation for auth/purchase/manual-entry setup and verification.
  - Evidence: added tests for purchase form amount/text utilities, updated README Phase 2 usage/Supabase Auth/manual verification. `npm run test` passed 15/15 tests and `npm run build` completed successfully.

### Phase 3 — Active shopping UX, edit/delete, and undo

- [x] Task 9: Add quick quantity controls and faster manual-entry ergonomics for mobile shopping.
  - Evidence: active purchase view now keeps available amount dominant and adds large `−`/`+` quantity controls plus reset-to-1 while preserving manual CRC price entry.
- [x] Task 10: Add undo-after-add behavior for accidental item registration.
  - Evidence: successful item inserts show a temporary prominent `DESHACER` action scoped to the inserted item id; undo deletes that persisted row and recalculates totals.
- [x] Task 11: Add item editing for price and quantity with persisted recalculation.
  - Evidence: each item can be edited inline for unit price and quantity, saves updates to Supabase, validates with domain helpers, and refreshes local totals.
- [x] Task 12: Add Phase 3 tests and documentation for active-shopping correction flows.
  - Evidence: added quantity validation/adjustment utility tests and README Phase 3 manual verification steps. `npm run test` passed 17/17 tests and `npm run build` completed successfully.

## Commit evidence

- `29e8f00` — `feat: bootstrap PresuCart foundation`
- `f38c1fb` — `feat: add Supabase auth and manual purchase flow`
