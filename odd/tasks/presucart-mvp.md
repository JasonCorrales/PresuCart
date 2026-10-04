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

### Phase 4 — Camera and local OCR price capture

- [x] Task 13: Add camera scanner panel inside the active purchase screen.
  - Evidence: added `OcrPriceScanner` to `/purchases/[id]` near manual price entry with `Escanear precio`, browser `getUserMedia`, close/stop camera controls, unsupported/permission fallback messages, and no image persistence.
- [x] Task 14: Add local OCR processing and price candidate selection.
  - Evidence: added Tesseract.js OCR processing on a temporary canvas frame, `Procesando...` progress, reuse of `extractPriceCandidates`, CRC candidate buttons, and no-candidate fallback copy.
- [x] Task 15: Connect confirmed OCR candidates to the existing add-item flow.
  - Evidence: selecting a candidate fills the existing manual unit price input and instructs the user to review quantity and press add; OCR never inserts an item automatically.
- [x] Task 16: Add Phase 4 tests and documentation for OCR fallback and verification.
  - Evidence: added noisy OCR dedupe coverage in `tests/domain.test.ts`, documented Phase 4 camera/OCR behavior and manual verification in README. After live OCR testing, scanner candidate buttons were adjusted to show plain integer colones without thousands separators that can look like decimals. Focused OCR tests passed 5/5 and `npm run build` completed successfully.

### Phase 5 — Purchase history and checkout

- [x] Task 17: Add a purchase history screen with active and finalized purchase sections.
  - Evidence: implemented authenticated `/purchases` with Supabase setup notice, user-owned purchases ordered newest first, active/finalized grouping, and mobile purchase cards with store fallback, status, budget, total, availability/over-budget signal, date, and detail link.
- [x] Task 18: Add navigation from history to existing saved purchases and surface purchase status clearly.
  - Evidence: added home and session-header navigation to `/purchases`; purchase cards link to `/purchases/[id]` and show the Spanish status badge.
- [x] Task 19: Add a finalize-purchase action on the active purchase screen with persisted status and finished timestamp.
  - Evidence: active purchase detail now has `Finalizar compra`, updates `status` to `finalizada`, sets `finished_at` to the current ISO timestamp, stores the visible total, updates local UI, and hides/guards add, edit, delete, and undo actions for read-only finalized purchases. Added `supabase/migrations/20260102000000_finalize_purchase_guards.sql` so finalized purchases cannot be updated/deleted and their items cannot be mutated at the database layer too.
- [x] Task 20: Add Phase 5 tests and documentation for purchase history, reopening, and checkout flows.
  - Evidence: added purchase-history domain utility coverage in `tests/domain.test.ts` and updated README usage/manual verification for history, reopening, checkout, and database-level finalized immutability. `npm run test` passed 21/21 tests and `npm run build` completed successfully.

### Phase 6 — Optional product identification and barcode

- [x] Task 21: Add optional product name and barcode capture without slowing quick add.
  - Evidence: active `/purchases/[id]` add form now includes Spanish mobile-first optional product name and barcode/manual code inputs while preserving required price-only quick add.
- [x] Task 22: Reuse or create user-owned products when optional product data is supplied.
  - Evidence: add flow normalizes optional identity, looks up existing user-owned products by barcode, creates user-owned products for new barcode/name identity, retries barcode reuse on unique-conflict races, and leaves price-only rows productless.
- [x] Task 23: Persist product links and snapshots on purchase items for price history readiness.
  - Evidence: purchase item insert now writes `product_id` and `product_name_snapshot` when identity exists, with barcode fallback labels, and item cards display snapshots while keeping price/subtotal dominant.
- [x] Task 24: Add Phase 6 tests and documentation for product/barcode identification flows.
  - Evidence: added `domain/productIdentity.ts` with Vitest coverage for optional identity normalization and snapshot labels; updated README Phase 6 usage and manual verification. `npm run test` passed 24/24 tests and `npm run build` completed successfully.

## Commit evidence

- `29e8f00` — `feat: bootstrap PresuCart foundation`
- `f38c1fb` — `feat: add Supabase auth and manual purchase flow`
- `0f413da` — `feat: improve active shopping corrections`
- `0c7a9a4` — `merge: phase 3 active shopping corrections`
- `a110b91` — `feat: add OCR price scanner`
- `c1b32d0` — `feat: add purchase history checkout`
