# Regicide Web

An unofficial browser adaptation of
[Regicide](https://www.badgersfrommars.com/regicide), with two game modes:

- **Quick Game:** cooperative base Regicide for 1–4 players.
- **Campaign:** a persistent, seeded roguelike campaign currently migrating to the
  accepted V3 conquest-deck design.

V3 is actively being designed and developed on `Design_V3`. The playable campaign
still contains inherited V2 systems; implementation status is tracked separately from
intended design.

## Start here

| Need | Read |
|---|---|
| Install, run, and verify | [`AGENTS.md`](AGENTS.md) |
| Documentation map | [`docs/README.md`](docs/README.md) |
| Accepted V3 design | [`docs/canon/README.md`](docs/canon/README.md) |
| Current implementation state | [`docs/delivery/current-state.md`](docs/delivery/current-state.md) |
| Active design questions | [`docs/proposals/open-design-questions.md`](docs/proposals/open-design-questions.md) |

Code and tests are authoritative for shipped behavior. Canon defines accepted intended
behavior, including accepted work that is not implemented yet.

## Requirements

- Node.js 18+; Node 20 LTS recommended.
- npm.
- No database, Docker, or environment variables required.

## Install and run

```bash
npm run install:all
npm run dev
```

- Client: <http://localhost:5173>
- Server health check: <http://localhost:3001/health>

For local-network play, share the host machine's IP on port `5173`. Vite proxies the
Socket.IO connection through the same port.

Persistent local campaign data is generated under `server/data/` and is gitignored.

## Verify

Required campaign smoke suite:

```bash
cd server
npx tsx scripts/smoke.ts
```

The suite must end with `All smoke tests passed ✅`.

Additional checks:

```bash
cd server && npx tsx scripts/e2e.ts
cd client && ./node_modules/.bin/vue-tsc --noEmit
cd client && npm run build
npm run docs:check
```

## Quick Game

Quick Game preserves base Regicide and remains isolated from campaign mechanics.
Players cooperatively defeat the Jack, Queen, and King courts using card values,
same-rank combinations, Aces, Jesters, and the four suit powers:

| Suit | Power |
|---|---|
| Clubs | Double damage. |
| Spades | Reduce enemy attack through shielding. |
| Hearts | Return cards from discard to the Tavern. |
| Diamonds | Draw cards without exceeding hand limits. |

The enemy is immune to its own suit power. An exact kill recruits the defeated royal
into the Tavern for the current quick game; an overkill discards it.

## V3 campaign direction

The campaign's accepted identity is:

> You don't build a deck—you conquer one.

The current V3 foundation includes:

- One continuous five-act expedition:
  **Claim → Shape → Exploit → Adapt → Master**.
- Death ends the expedition and the next run begins at Act 1.
- Exact-killing an unowned number card recruits it.
- Exact-killing an already-owned card replaces one hand card's rank or suit with the
  defeated rank or suit.
- The expedition deck persists across road encounters; explicit rests reshuffle and
  redraw.
- Four core class identities own Block, Kill, Combine, and Persist.
- Meta progression widens future options rather than supplying required permanent
  statistical power.

These are design statements, not claims that the current build already implements all
of them. Read the [canon manifest](docs/canon/README.md) for the complete accepted design
and [current state](docs/delivery/current-state.md) for every known migration gap.

## Project layout

```text
server/                 lobby, quick game, campaign engine, persistence
server/campaign/        campaign state, encounters, maps, content, tokens, saves
server/scripts/         smoke, E2E, simulation, and bot tooling
client/src/components/  lobby, quick-game, and campaign UI
docs/canon/             accepted intended design
docs/decisions/         dated rationale for canon changes
docs/delivery/          implementation state and migration
docs/proposals/         active and deferred design work
docs/research/          simulations, playtests, and assessments
docs/archive/           frozen V0/V2 and retired material
```

## Development rules

- Work on `Design_V3`; `master` remains read-only.
- Preserve unrelated local changes.
- Do not bypass Git hooks.
- Pull, commit, and push only when explicitly requested.
- Campaign randomness uses serialized seeded RNG.
- Campaign mutations use the central campaign action dispatcher and persist after every
  successful action.

See [`AGENTS.md`](AGENTS.md) for the complete engineering guide.

## Technology

- Vue 3, Vite, and TypeScript.
- Node.js, Express, Socket.IO, and TypeScript.
- Local JSON persistence for campaign and Kingdom state.
