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
