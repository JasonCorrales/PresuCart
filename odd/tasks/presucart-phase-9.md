# PresuCart Phase 9 — Production readiness

Status: automated work verified; waiting for manual environment validation

## Scope

Validate the MVP without adding product features. Current offline support is limited to drafts, connection UX, and a public-home fallback; no offline mutation queue. User explicitly authorized commit and push for Phase 9. Do not deploy, open PRs, merge, or mutate production Supabase.

## Tasks

- [x] 1. Establish reliable release gates: lint, explicit typecheck, tests, production build.
  - Status: completed; scripts and ESLint gate are configured, and the source issues exposed by the stricter lint pass are fixed without disabling rules.
  - Route: delegated multi-file writer; package.json, ESLint configuration, purchase loading pages, and barcode scanner cleanup lifecycle.
  - Checks: baseline `npm run lint` failed because `next lint` is no longer a valid Next 16 command; after switching to ESLint and adding explicit `typecheck`, the remaining lint findings were fixed by deriving initial loading from Supabase availability, restoring purchase drafts through the async load path, and making barcode camera cleanup callbacks stable. `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass.
- [x] 2. Fix asynchronous route/draft/camera lifecycle risks and silent purchase total synchronization failures with focused tests.
  - Status: completed; stale route purchase loads are cancellation-guarded, draft write readiness is bound to the current user/purchase identity, in-flight barcode detection cannot callback after close, and camera streams acquired after close are stopped. Purchase total sync now surfaces insert/edit/delete total-update failures without undoing successful item mutations, confirms the scoped active purchase row with `select(...).single()`, handles thrown update rejections, keeps finalized purchases readonly, and offers an explicit retry for the preserved item/user/purchase snapshot that clears after success.
  - Checks: deterministic component regressions in `tests/purchaseLifecycle.test.tsx`, `tests/barcodeScanner.test.tsx`, and `tests/purchaseTotalSync.test.tsx`; shared total-sync service coverage in `tests/purchaseTotalSync.test.ts` for insert/edit/delete failures, retry success without item mutations, thrown rejection, and no-row confirmations.
  - Route: delegated scoped exploration/implementation after release gates; no persistence redesign or production database mutation.
- [x] 3. Add automated browser-lifecycle checks for existing PWA/offline behavior and a production-readiness checklist.
  - Status: completed for automation/docs only; real browser/mobile/Supabase evidence remains pending in task 4.
  - Route: delegated writer; actual `public/sw.js` is executed in a Node VM with mocked `self`, `caches`, and `fetch`, and `PwaLifecycle` is covered with React RTL for registration safety plus online/offline cleanup.
  - Checks: focused `npm run test -- tests/serviceWorker.test.ts tests/pwaLifecycle.test.tsx` passes after adding runtime tests. Production-readiness checklist added at `docs/production-readiness.md` and linked from README without asserting installability or full offline page functionality.
- [ ] 4. Validate real mobile camera/PWA/shopping flows and Supabase authorization/finalized guards in a safe test environment.
  - Status: real mobile/browser/Supabase checks pending. Public GET checks at https://presu-cart.vercel.app/ passed for HTTPS, root, auth, manifest, SW, and icon; deployed SW matched local. This does not establish installability, authenticated behavior, or deployment of Phase 9 fixes.

## Mobile UX follow-up

- [x] 5. Compact the active purchase summary and quick-add area to reduce scrolling on phones.
  - Status: completed for code and mocked regression coverage; real 320px mobile/browser viewport verification remains pending because jsdom cannot prove actual geometry, scroll length, keyboard behavior, or rendered overflow.
  - User requested removal of the visible `Agregar precio` heading and explanatory text, plus smaller budget/spent/finalize summary. Preserve visible labels, dominant availability, accessible touch targets, calculations, actions, and default-hidden optional tools. No sticky overlay or persistence changes.
  - Route: delegated page/test changes; test-first rendered regression for removed copy, preserved totals/actions/order, and default-hidden optional panels; structural Tailwind spacing changes only. No commit/push authorized for this follow-up.
  - Checks: RED `npm run test -- tests/purchaseMobileLayout.test.tsx` failed on the visible `Agregar precio` heading before the UI change. GREEN `npm run test -- tests/purchaseMobileLayout.test.tsx tests/purchasePage.test.tsx` passed after the compact layout changes. Full follow-up verification commands passed: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- [x] 6. Keep the active purchase summary visible after adding an item on mobile.
  - Status: completed for code and automated regression coverage; real mobile browser verification remains pending because jsdom cannot prove actual scroll position, keyboard behavior, or rendered viewport geometry.
  - User reported that tapping `Agregar al carrito` left the page scrolled down, forcing manual scroll back to the `Compra activa` summary/disponible card.
  - Implementation: successful item adds now request scrolling the active summary section into view after the add state updates, while validation failures, product resolution failures, insert errors, inactive purchases, undo behavior, optional tools, total sync, and finalized guards remain unchanged. Reduced-motion users get non-smooth scrolling.
  - Route: delegated page/test change with independent verification.
  - Checks: RED `npm test -- tests/purchaseMobileLayout.test.tsx` failed before implementation because `scrollIntoView` was not called. GREEN focused regression passed after implementation. Independent verification passed: `npm test -- tests/purchaseMobileLayout.test.tsx`, `npm run typecheck`, `npm run lint`, `npm run test` (11 files / 60 tests), and `npm run build`.
- [x] 7. Color the active purchase progress bar by budget consumption threshold.
  - Status: completed for code and automated regression coverage; real mobile browser visual confirmation remains pending.
  - User requested green under 70%, yellow from 70%, and red from 90% consumption.
  - Implementation: the progress fill keeps the existing `bg-emerald-300` below 70%, switches to `bg-yellow-300` at 70% through 89%, and switches to `bg-red-500` at 90% or more without changing budget math, item persistence, undo behavior, total sync, optional tools, scroll-to-summary behavior, or finalized guards.
  - Route: delegated page/test change with independent verification.
  - Checks: RED `npm test -- tests/purchaseMobileLayout.test.tsx` failed before implementation for 70%, 89%, and 90% because the fill remained green. GREEN focused regression passed after implementation. Independent verification passed: `npm test -- tests/purchaseMobileLayout.test.tsx`, `npm run typecheck`, `npm run lint`, `npm run test` (11 files / 64 tests), and `npm run build`.

## Acceptance and evidence

Commands must be reported as observed, not inferred. Use test-first for behavior fixes where meaningful; configuration and passive documentation use ordinary command/structural verification. Each unit receives independent verification according to native assessment (unavailable assessment is high risk). Record manual checks as pending until performed.

## Independent final verification

`npm run lint`, `npm run typecheck`, `npm run test` (10 files / 58 tests), `npm run build`, and `git diff --check` passed independently. Actual service-worker VM tests and React lifecycle tests were inspected. No real mobile browser, live Supabase authorization, or deployment validation was performed. `.codegraph/` and `tsconfig.tsbuildinfo` remain untracked and must be excluded from commits. RDD is off; native assessment was unavailable due to undeclared untracked paths, so independent high-risk fallback verification was used.

## Delivery

Branch: `feature/presucart-phase-9`, based on the existing Phase 8 branch. User authorized push; no PR/merge or deployment performed. Existing Phase 8 commits remain unchanged. The lifecycle fix unit exceeds the 400-line review heuristic; most of its additions are regression tests. PR review scope remains a separate decision.

## Commit evidence

- `96604bd` — `chore: establish production lint and typecheck gates`
- `fdb4c34` — `fix: guard shopping lifecycle and retry saved totals`
- The next verification/docs work-unit commit includes this document, runtime PWA tests, and the production readiness guide.
