# Claude Code instructions — `v3-integration` (the V3.0 build branch)

**This branch is where V3.0 gets built.** It is the deployed live game (`91d3677`,
llgames.ca) plus the V3 design-of-record in `docs/`. Follow [`AGENTS.md`](AGENTS.md) for
engineering conventions; design authority starts at [`docs/README.md`](docs/README.md).

## Start here (fresh session)

1. **Status:** read [`docs/delivery/BUILD-STATUS.md`](docs/delivery/BUILD-STATUS.md) —
   which slice is next and what's done.
2. **The plan:** [`docs/delivery/plans/v3.0-build-execution.md`](docs/delivery/plans/v3.0-build-execution.md)
   — slice order, ground rules, acceptance gates. Specs live in
   [`docs/delivery/plans/v3.0-integration.md`](docs/delivery/plans/v3.0-integration.md).
3. **Ground truth about this code:**
   [`docs/delivery/live-code-audit-91d3677.md`](docs/delivery/live-code-audit-91d3677.md)
   — what actually exists (symbols, file paths, V3.0 fate map).
4. **All design decisions are closed** — see
   [`docs/decisions/2026-07-01-v3.0-build-decisions.md`](docs/decisions/2026-07-01-v3.0-build-decisions.md).
   Do **not** reopen design questions; pin ambiguities as ⚑-flagged contracts under
   `docs/delivery/contracts/` and keep building.

## Hard rules

- Build **only** on `v3-integration`. Never commit code to `live` or `Design_V3`
  (`Design_V3` = docs-of-record; doc changes are cherry-picked between the two).
- `experiments/reforge-replenish` (9ecd62f) is a **reference prototype** — read it, never
  merge it.
- **Delete legacy code LAST** (slice 9) — nothing is removed before its replacement works.
- Solo campaign only; do not touch the quick-game/multiplayer paths.
- After every slice: `cd server && npx tsx scripts/smoke.ts` must end
  "All smoke tests passed ✅"; client `vue-tsc --noEmit` clean; add a smoke case for the
  slice's core rule; one commit per slice; tick BUILD-STATUS.md.

## Run / verify

```bash
npm run install:all   # once
npm run dev           # server :3001, client :5173
cd server && npx tsx scripts/smoke.ts   # engine suite
cd server && npx tsx scripts/e2e.ts     # protocol test (dev server running)
```
