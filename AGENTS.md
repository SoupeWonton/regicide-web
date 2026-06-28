# Regicide Web — AI engineering guide

This repository contains base Regicide plus a persistent, seeded campaign built with
Vue 3, TypeScript, and Socket.IO.

> **Branch model (read before coding).** `Design_V3` is the **design-of-record** branch — canon,
> decisions, and delivery docs. **V3 game code is NOT implemented on `Design_V3`:** its code predates
> the live deployment, so building V3 on it would **regress the tutorial, graft, UI, and campaign work
> already running on llgames.ca.** V3 **implementation** happens on a separate **`v3-integration`**
> branch cut from the **deployed live commit `91d3677`**, bringing the docs across but **never merging
> `Design_V3` code into live.** The sole implementation plan is
> [`docs/delivery/plans/v3.0-integration.md`](docs/delivery/plans/v3.0-integration.md)
> (the older `v3-integration-plan.md` is **superseded**).

## Documentation authority

- Start at [`docs/README.md`](docs/README.md).
- Intended behavior is listed exhaustively by [`docs/canon/README.md`](docs/canon/README.md).
- Shipped behavior is summarized in
  [`docs/delivery/current-state.md`](docs/delivery/current-state.md), but code and tests
  are the final authority for what is actually implemented.
- Proposals, research, and archived V0/V2 files never override canon.
- For wiki creation or maintenance, follow [`docs/WIKI.md`](docs/WIKI.md).
  Brainstorming does not authorize wiki changes; obtain explicit confirmation before
  writing to the wiki.

## Requirements and installation

- Node.js 18+; Node 20 LTS recommended.
- npm; no database, Docker, or environment variables are required.

```bash
npm run install:all
npm run dev
```

- Server and health check: `http://localhost:3001/health`
- Client: `http://localhost:5173`
- Persistent local data: `server/data/` (generated and gitignored)

## Verification

```bash
cd server
npx tsx scripts/smoke.ts
```

The smoke suite must end with `All smoke tests passed ✅`.

Optional checks:

```bash
cd server && npx tsx scripts/e2e.ts
cd client && ./node_modules/.bin/vue-tsc --noEmit
cd client && npm run build
```

## Project layout

```text
server/                 lobby, quick game, campaign engine, persistence
server/campaign/        campaign state, encounters, content, maps, tokens, saves
server/scripts/         smoke, E2E, simulation and bot tooling
client/src/components/  lobby, quick-game and campaign UI
docs/canon/             intended V3 behavior
docs/decisions/         design rationale and status
docs/delivery/          implementation state, roadmap and migration
docs/proposals/         unaccepted directions
docs/research/          simulations, playtests and assessments
docs/archive/           frozen V0/V2 and removed mechanics
```

## Git workflow

- **Design/docs** commit to `Design_V3`. **V3 code** goes on `v3-integration` (cut from live
  `91d3677`) — never merge `Design_V3`'s older code into live. `master` remains read-only.
- Never bypass hooks with `--no-verify`.
- Pull, commit, and push only when the human explicitly asks.
- Push only the current design branch and never push `master`.
- Preserve unrelated local changes.

## Engineering invariants

- Campaign randomness goes through `rng.ts` with serialized `campaign.rngState`.
  `Math.random()` is allowed only for lobby room codes.
- The campaign deck persists across road encounters. Only explicit rests reshuffle
  and redraw; an empty Tavern is replenished only by Hearts or a rest.
- Cards added permanently come from the starting court or defeated enemies. Permanent
  removal is an open design axis; do not implement it before consensus and canon.
- A redundant exact kill targets one card in hand and permanently replaces either its
  rank with the defeated rank or its suit with the defeated suit. It never grants flat
  `+1` value or an additional suit; current additive behavior is delivery drift.
- The campaign is one continuous five-act expedition (the full design). **V3.0 implements only
  Continents 1–2** (the Claim + Shape beats; victory = clear C2); Continents 3–5, the opt-in
  forge-to-Full ending, and multi-session resume are **V3.5**. Death restarts at Act 1; later
  acts are never player-selectable starts. Direct act entry is internal seeded test
  infrastructure only, and meta progression unlocks breadth rather than required stats.
- Campaign mutations flow through `sessions.dispatchCampaignAction` and persist after
  every successful action. Extend `CampaignAction` and the dispatcher together.
- Validate before mutation: invalid actions return `{ error }` without changing state.
- Keep quick-game Regicide isolated from campaign-only phases and mechanics.
- CT values are design/debug information logged as `[CT]`; never expose them in UI.
- New design decisions update canon, a decision record, and delivery status together.

## Debug controls

- Campaign creation accepts a deterministic seed.
- The host-only `debug_force` campaign action can force an encounter or reward ID.
- To reset local progression, stop the server and delete `server/data/`.
