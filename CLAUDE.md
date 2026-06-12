# Regicide Web — Campaign MVP (AI setup guide)

This file is written for an AI coding assistant (Claude Code, Copilot, etc.) helping a human install, run, or extend this project. Follow it literally.

## What this is

A browser multiplayer adaptation of the card game Regicide (Vue 3 + Socket.IO), extended on this branch (`campaign`) with a roguelite **campaign mode MVP**: seeded road maps, encounter modifiers, 9 hero classes, items, hero death/replacement, and persistent saves. The design docs in `campaign/`, `classes/`, `systems/`, and `items/` are the source of truth — `campaign/campaign-bible.md` wins all conflicts.

## Requirements

- **Node.js 18+** (20 LTS recommended) — check with `node -v`
- **npm** (ships with Node)
- No database, no Docker, no env vars needed. Persistence is JSON files written to `server/data/` (auto-created, gitignored).
- Works on Windows, macOS, Linux. ~200 MB of node_modules.

## Install (exact steps)

```bash
git clone https://github.com/SoupeWonton/regicide-web.git
cd regicide-web
git checkout campaign
npm run install:all     # installs root + server/ + client/ dependencies
```

If `npm run dev` later complains that `concurrently` is not recognized, run `npm install` in the repo root (older checkouts of `install:all` skipped the root).

## Run

```bash
npm run dev
```

- Game server: http://localhost:3001 (health check: `GET /health` → `{"ok":true}`)
- Web client: **http://localhost:5173** ← open this in a browser
- LAN play: other devices browse to `http://<host-LAN-IP>:5173` (Vite proxies websockets; only port 5173 needed).

To play campaign mode: create a room → all players tap **Ready** → host taps **⚜️ Campaign** → pick chapter (1 to start) and an optional seed (any string; same seed = same map) → **Begin a new lineage**. Saves appear under "or resume" in the same panel after a campaign has started.

## Verify the install

```bash
cd server
npx tsx scripts/smoke.ts    # engine test suite — must end with "All smoke tests passed ✅"
```

Optional protocol test (needs the dev server running in another terminal):

```bash
cd server
npx tsx scripts/e2e.ts      # must end with "E2E passed ✅"
```

Client typecheck: `cd client && ./node_modules/.bin/vue-tsc --noEmit` (no output = clean).
Client production build: `cd client && npm run build`.

## Project layout

```
server/
  index.ts              Socket.IO event wiring (lobby + quick game + campaign)
  rooms.ts, game.ts     Base Regicide (quick game) — unchanged by campaign mode
  deck.ts               Card/deck helpers shared by both modes
  rng.ts                Seeded deterministic RNG (mulberry32), serializable state
  campaign/
    types.ts            All campaign + client-projection types
    content.ts          Data: 9 classes, items, encounter modifiers, boss modifiers
    maps.ts             Handcrafted Ch1/Ch2 road graphs + seeded permutation
    encounter.ts        Combat engine (modifiers, class abilities, items, death)
    campaign.ts         Campaign state machine (road, camp, votes, drafts, unlocks)
    sessions.ts         Room-code → campaign binding, action dispatcher
    store.ts            JSON persistence (server/data/kingdom.json + campaigns/)
  scripts/smoke.ts      Engine tests   scripts/e2e.ts  socket-protocol tests
client/src/components/
  campaign/             CampaignView (root), ClassSelect, RoadMap,
                        EncounterBoard, CampPanel, cards.ts (ui helpers)
  Room.vue              Lobby: quick game / new campaign / resume
```

## Key conventions (do not break these)

- **CT values** (Catastrophe Tolerance) are design/debug only — logged to the server console as `[CT] ...`, never sent to or shown in the player UI.
- **Determinism**: every campaign-mode shuffle/roll goes through `rng.ts` with state stored in `campaign.rngState`. Never use `Math.random()` in campaign logic (lobby code generation is the only exception).
- **Deck persistence canon**: the deck (Tavern + discard + hands) carries across road encounters — held in `campaign.deck` between fights, adopted by the encounter while one is active. Only camp/interlude rests (`campRest`) reshuffle and redraw, and an empty Tavern is only refilled by Hearts or a rest — never auto-recycled. Don't reintroduce per-encounter deck rebuilds.
- All campaign mutations flow through `sessions.dispatchCampaignAction`, which persists the save after every successful action. New actions must be added to the `CampaignAction` union and the dispatcher switch.
- Validate-then-mutate: action handlers return `{ error }` without mutating on invalid input.
- The base quick game (`game.ts`/`rooms.ts` state) must keep working unchanged.
- **Third-party assets** must allow commercial use, and every addition is recorded in `CREDITS.md`. The icon set (game-icons.net) and patterns (Hero Patterns) are CC BY — keep the attribution line in the Home screen footer. Fonts are self-hosted OFL files in `client/public/fonts/`; don't reintroduce the Google Fonts CDN.

## Debug / playtest controls

- Seed field at campaign creation (deterministic maps + draws).
- Host-only socket action: `campaign_action` with `{ type: 'debug_force', encounterId?, rewardId? }` forces the next encounter modifier / reward offer (ids in `server/campaign/content.ts`).
- Reset all progression: stop the server and delete `server/data/`.

## Known MVP gaps (intentional, see README)

Specialization effects, card-upgrade Forge, value-adjust tokens, meta currency, multiple map variants per chapter, and mid-session reconnection are not implemented yet. Balance is untuned by design — the point of this MVP is to play it and argue about it.
