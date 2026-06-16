# Regicide Web — Campaign MVP (AI setup guide)

This file is written for an AI coding assistant (Claude Code, Copilot, etc.) helping a human install, run, or extend this project. Follow it literally.

## What this is

A browser multiplayer adaptation of the card game Regicide (Vue 3 + Socket.IO), extended on the `Design_V2` branch with a roguelite **campaign mode**: seeded road maps, encounter modifiers, 9 hero classes, relics + spells, hero death/replacement, and persistent saves. The design docs live under `docs/` (start at `docs/README.md`); `docs/design/` is current canon and `docs/design/campaign/campaign-bible.md` wins design conflicts, but note the **solo economy redesign** below has since superseded parts of it (memories and preparations are removed; relics now use two slots). When in doubt about what's *implemented*, the code and this file win.

### Solo economy redesign (current — see `docs/design/` and the items section)

Province mode (the active Chapter-1 prototype) is being reworked around a tighter item economy. Already shipped:

- **Two relic slots per hero** (`Hero.relicIds`, cap `RELIC_SLOTS`). A third offered relic forces releasing one via a `relic_full` choice. **Relics are rule-bends** (hand cap, death insurance, reshuffle, combo→12, etc.) — the old axis-engine relics were retired in the ascending-deck item revamp (the flat-axis role is the token system now). Relics come from important battles + the **Caravan** (was Market); spells from the **Sanctum** (was Abbey); the **Shrine** cleanses curses. Pools are Kingdom-gated (`unlockedRelics/Spells`, start 5/4, grow on death) and capped at 3 item-stops/chapter. See `content.ts` + Q10.
- **Memories removed** — the `memory_draft` phase is gone; the final boss flows straight to chapter clear / win. `checkEncounterEnd(c, kingdom?)` carries the post-boss unlocks.
- **Preparations removed** — no more camp-activated preps; Markets and skirmish spoils now grant **spells**.
- **Road restructured** (`PROVINCE_1`): each act guarantees a fight + a bonus fork + a lair-vs-safe fork, ramping skirmish → veteran → elite to the three gates (Jacks / Queens / Kings).

**Next direction — the Ascending Deck (`docs/design/ascending-deck.md`, 2026-06-14, LARGELY BUILT behind `EXPERIMENTS.ascendingDeck` = false):** progression moves to a *start-small-grow-up* model. **Continent 1 (ch1–3)** = ramp: start with a small low deck, recruit number-enemies (6–10) via exact-kill, draft, and **backfill** ranks at chapter checkpoints, ending with a complete A–10 deck. **Continent 2 (ch4–6)** = mastery: royal recruiting + fine-tuning, **no backfill** (≈ today's shipped province). The deck carries across. Core rule: an **exact kill recruits the enemy card** (numbers and royals alike); backfill grants a **token** instead of a duplicate for cards you already own. New base ♦ rule = **overdraw-and-select** (draw the full value into a pool, keep up to empty hand slots). Tokens = the Forge below, shown on the card face (green/red ±value on top, green added suit in the middle). This **supersedes the class-curation deckbuild** (`CURATION_CUT`). System consolidation (locked 2026-06-14): the **deck is the one engine**; **class** is **pure-token** — every class starts from the *same 20-card deck* and differs only by which signature tokens are pre-stamped on it (no global passive; 3 stamps; you select a class by *seeing which cards it stamps*). A class owns a region of the token catalog + a unique tree (in-run = one branch, one ★★★★ stamp/chapter; cross-class/diversification only on death/milestone). The token catalog + spend/hold-value model is drafted in the spec. **relics** demote to passive riders (**revamp pending**; death expands the pool); **spells** stay thin (held burst + curse-delivery, **revamp pending**); **dual-type cards** are just a Graft suit-token; **meta** banks *options, not power* (new classes, tree diversification, relic-pool expansion). This **overrides the campaign-bible's ch1–2 v0 scope** (same precedent as the two-relic-slot override). Base game stays untouched: no `'draw_select'` on base `TurnPhase`, no change to `enemyStats`/`buildPlayerDeck`; new save fields are optional+guarded; gated behind `EXPERIMENTS.ascendingDeck`.

**Ascending Deck build status (2026-06-14, code-verified, smoke Tests A–E green; flag now LIVE):** Steps 0–3, **5 (+4 merged)**, 6, 9, 10 are **built + tested**; the full arc ch1→ch2→ch3→Council→ch4 province→win passes. `EXPERIMENTS.ascendingDeck = true` paired with `provinceMode = false` is now the **live default** (smoke pins both off for canon tests; flip both back for the province prototype). **Step 5 (tokens/Forge) is built:** catalog `TOKEN_DEFS` + class signatures in `content.ts`; effect helpers in `campaign/tokens.ts`; engine hooks in `encounter.ts` (spend value→base, hold value→soak, graft/transmute→active suits, Plate/Provision/Mend/Edge levers, Mark/Edge damage, Scry, Banner/Bloodprice); forge is an **offer-menu** at forge nodes (`forge_token`→`forge_card`, +1 budget/node); signatures stamp at ch1 `setupChapterDeck`; card-face badges + select-by-cards `ClassSelect`. Classes are **pure-token** (first 4 suited tuned; 5–9 stamped-as-drafted/parked). Simplifications to revisit: Scry = deterministic next-draw nudge, Mark = flat +2 dmg, curses = forge-`undercut` only (Shrine spell-delivery awaits the spell revamp); Echo/Wildcard not shipped. Deferred: class tree, Step 7 (exile cap), Step 8 (telemetry + tuning), relic/spell revamps. Full status: `docs/ideas/open-design-questions.md` → Q10.

Not yet built: the four-axis camp allocation (♦/♥/♠/♣ pips), the Forge (now scoped as the **token** system above — +permanent value/suit tokens on cards), and Exile-as-a-landmark-service. See "Known gaps" below.

## Requirements

- **Node.js 18+** (20 LTS recommended) — check with `node -v`
- **npm** (ships with Node)
- No database, no Docker, no env vars needed. Persistence is JSON files written to `server/data/` (auto-created, gitignored).
- Works on Windows, macOS, Linux. ~200 MB of node_modules.

## Install (exact steps)

```bash
git clone https://github.com/SoupeWonton/regicide-web.git
cd regicide-web
git checkout Design_V2
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
    content.ts          Data: 9 classes, relics + spells, encounter/boss modifiers (RELIC_SLOTS)
    maps.ts             Handcrafted road graphs (CHAPTER_1/2 + PROVINCE_1) + seeded permutation
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

## Git workflow (STRICT — do not break)

- **All work happens on the `Design_V2` branch.** `master` is read-only by
  convention: NEVER commit to it, merge into it, pull on it, or push it.
  Local hooks (`.git/hooks/pre-commit`, `pre-push`) physically block master
  commits and pushes — do not bypass them (`--no-verify` is forbidden).
- **Pulls and commits are always deliberate, never automatic.** No script or
  tool may pull implicitly. The launcher (`play.cmd`) never pulls on its own;
  `play.cmd update` pulls only when the checkout is on `Design_V2`.
- Pushing is allowed only to `Design_V2` (`git push -u origin Design_V2`),
  and only when the human asks for it.

## Key conventions (do not break these)

- **CT values** (Catastrophe Tolerance) are design/debug only — logged to the server console as `[CT] ...`, never sent to or shown in the player UI.
- **Determinism**: every campaign-mode shuffle/roll goes through `rng.ts` with state stored in `campaign.rngState`. Never use `Math.random()` in campaign logic (lobby code generation is the only exception).
- **Deck persistence canon**: the deck (Tavern + discard + hands) carries across road encounters — held in `campaign.deck` between fights, adopted by the encounter while one is active. Only camp/interlude rests (`campRest`) reshuffle and redraw, and an empty Tavern is only refilled by Hearts or a rest — never auto-recycled. Don't reintroduce per-encounter deck rebuilds.
- All campaign mutations flow through `sessions.dispatchCampaignAction`, which persists the save after every successful action. New actions must be added to the `CampaignAction` union and the dispatcher switch.
- Validate-then-mutate: action handlers return `{ error }` without mutating on invalid input.
- The base quick game (`game.ts`/`rooms.ts` state) must keep working unchanged.

## Debug / playtest controls

- Seed field at campaign creation (deterministic maps + draws).
- Host-only socket action: `campaign_action` with `{ type: 'debug_force', encounterId?, rewardId? }` forces the next encounter modifier / reward offer (ids in `server/campaign/content.ts`).
- Reset all progression: stop the server and delete `server/data/`.

## Known gaps (intentional)

Not yet implemented: the **four-axis camp allocation** (spend pips across ♦ draw / ♥ recover / ♠ shield / ♣ edge), **Exile-as-a-landmark-service** (deck thinning outside the Exile class), the **class tree** (post-signature progression), specialization effects, meta currency, multiple map variants per chapter, and mid-session reconnection. (The **Forge** is now built as the ascending-deck token system — see the build status above.) The **party** economy is deliberately left on the old single-relic assumptions for now — the redesign is solo-first.

Removed (do **not** reintroduce): **memories** (the old `memory_draft` chapter-end draft) and **preparations** (camp-activated `p-*` items). Both are gone from types, content, engine, and UI.

Balance is untuned by design — the point is to play it and argue about it.
