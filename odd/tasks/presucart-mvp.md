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

### Phase 7 — Camera barcode scanning

- [x] Task 25: Add an in-screen barcode scanner for optional product identification.
  - Evidence: added `BarcodeScanner` inside the optional product identity fieldset on `/purchases/[id]`, using browser-native `BarcodeDetector` plus live camera preview/scan loop without storing frames.
- [x] Task 26: Fill the existing barcode/manual code field from scanner results without changing price.
  - Evidence: successful detection normalizes the raw barcode, fills only the existing barcode/manual code state, shows confirmation copy, and stops camera tracks; price and quantity state are untouched.
- [x] Task 27: Keep manual fallback and graceful unsupported/permission handling.
  - Evidence: unsupported `BarcodeDetector`, unsupported commercial formats, missing/denied camera, and no-clear-code states show Spanish fallback copy while the manual field remains visible and usable; close/unmount/success stops tracks.
- [x] Task 28: Add Phase 7 tests and documentation for barcode scanning behavior.
  - Evidence: added deterministic barcode scanner utility tests for result normalization and supported format labels, updated README Phase 7 usage/manual verification. `npm run test` passed 26/26 tests and `npm run build` completed successfully.

### Phase 8 — PWA/offline and mobile UX resilience

Route: delegated implementation is required because Phase 8 touches multiple non-trivial files across app shell, components, domain utilities, tests, and documentation.
Checks: use test-first where deterministic domain/browser-helper tests apply; run `npm run test` and `npm run build` before closing the phase.
Delivery: no commit yet; user has authorized implementation, not git delivery.
Assessment: native assessment was unassessable due to undeclared untracked paths; followed the high-risk fallback with independent verification. Tests/build passed independently (33/33). Final service-worker activation syntax and mocked runtime checks passed: only old PresuCart shell caches are deleted; unrelated caches are preserved.

- [x] Task 29: Add a static PWA service worker and safe registration for install/offline shell resilience.
  - Evidence: added `public/sw.js`, manifest scope, and client-only registration from the app shell; independent-verification fix narrowed caching to explicit public shell assets (`/`, `/manifest.json`, `/icons/presucart.svg`) and public-home navigation fallback while avoiding dynamic same-origin purchases, RSC/API/authenticated routes, external origins, and all mutations.
- [x] Task 30: Add network/offline status UX with clear Spanish recovery copy.
  - Evidence: added global `PwaLifecycle` status banner with Spanish offline/reconnected guidance that does not block shopping flows.
- [x] Task 31: Preserve active-purchase draft inputs locally during reload/offline interruptions.
  - Evidence: active purchase add-form fields are saved per authenticated user id and purchase id in `localStorage`, blocked storage is treated as a recoverable no-op, drafts are restored with Spanish recovery copy, and the purchase draft clears after successful item add/finalization. Logout clears only the `presucart:active-purchase-draft:*` namespace.
- [x] Task 32: Normalize Supabase/network error messages into actionable mobile UX copy.
  - Evidence: added reusable `domain/offline.ts` normalization for offline/network/auth/permission/generic failures and used it on auth, history, new purchase, and active purchase flows.
- [x] Task 33: Add Phase 8 tests and documentation for PWA/offline/mobile recovery behavior.
  - Evidence: added deterministic helper tests for service-worker allowlist/dynamic-route denial, user-scoped draft keys, namespace-only draft clearing, blocked storage safety, network/error copy, and draft normalization; updated README Phase 8 usage/manual verification with public-home offline fallback and authenticated offline limitations. Independent verification fix also changed item deletion to defer UI removal until Supabase delete succeeds, preserving total-sync behavior. RED evidence for this fix is limited: issues came from external independent verification after the initial Phase 8 GREEN rather than a newly captured pre-fix local failing run. GREEN: `npm run test` passed 33/33 tests and `npm run build` completed successfully. Manual browser checks are still pending.

- [ ] Task 34: Validate Phase 8 in a real production browser with live Supabase.
  - Pending: installation, offline/reconnect banner, public-home fallback, draft restoration after reconnect, logout cleanup, and failed delete behavior. No browser validation was available in this session.

### Phase 8 follow-up — Optional panels on demand

- [x] Task 35: Collapse product identification and local price scanner by default with accessible independent toggles; unmount scanners on collapse while preserving form inputs.
  - Evidence: added reusable `OptionalPanel` with `type="button"`, `aria-expanded`, and `aria-controls`; active purchase price and quantity remain visible while `Escáner local de precio` and `Identificar producto (opcional)` mount only when independently opened, so closing unmounts scanner children and preserves parent-held form state. Added React Testing Library jsdom coverage for default-collapsed panels, independent opening, unmount on collapse, and no accidental parent form submit. RED: `npm run test` failed before implementation because `@/components/OptionalPanel` did not exist. GREEN/verification: `npm run test` passed 35/35 tests and `npm run build` completed successfully. No commit authorized.

### Phase 8 follow-up — Compact add flow and top configuration

- [x] Task 36: Hide optional sections completely by default; add top settings to independently enable them and put submit immediately after price/quantity.
  - Evidence: active purchase now uses a top closed-by-default `PurchaseToolSettings` panel with independent labelled checkboxes for the OCR price scanner and product identification, both disabled by default with no persisted enable preference. Enabling a checkbox mounts its section content immediately without a second expansion click; hiding unmounts scanner children while parent-held draft values remain intact, and finalized purchases still render read-only with no add/settings tools. The `Agregar al carrito` submit now sits immediately after price and quantity before undo and optional sections. RED: `npm run test` failed before implementation because `@/components/PurchaseToolSettings` did not exist and submit still followed optional panels. GREEN/verification: `npm run test` passed 39/39 tests and `npm run build` completed successfully. Manual browser checks are still pending.

## Commit evidence

- `29e8f00` — `feat: bootstrap PresuCart foundation`
- `f38c1fb` — `feat: add Supabase auth and manual purchase flow`
- `0f413da` — `feat: improve active shopping corrections`
- `0c7a9a4` — `merge: phase 3 active shopping corrections`
- `a110b91` — `feat: add OCR price scanner`
- `c1b32d0` — `feat: add purchase history checkout`
- `0c0cb3b` — `feat: add optional product identification`
