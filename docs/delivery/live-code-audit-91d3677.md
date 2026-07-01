---
kind: delivery
edition: v3
status: active
date: 2026-07-01
code_baseline: live 91d3677 (claude/cloudflare-balancing-test-setup-dlanrm)
---

# Live-code audit — commit `91d3677`

Symbol-by-symbol audit of the deployed live branch (llgames.ca), answering
[`plans/v3.0-integration.md`](plans/v3.0-integration.md) §Q #2. Paths are relative to the
repo root. "Committed" = in `91d3677`; the previously-uncommitted working-tree experiments
are preserved on branch **`experiments/reforge-replenish`** (`9ecd62f`).

## Headline corrections to prior assumptions

1. **`transmute` (suit-replace graft) IS committed** — `server/campaign/content.ts:266`,
   `suitOp:'replace'`. The earlier "do not assume reforge/transmute exist" hedge was half
   right: **`reforge` (value-replace) and `EXPERIMENTS.replacementGrafts` were uncommitted
   working-tree experiments**, now preserved on `experiments/reforge-replenish` (with a
   second experiment, `killReplenish`, and sim `--replace`/`--replenish` A/B flags — all
   OFF by default). Earlier docs that referenced them saw this local work.
2. **§F still stands.** Cards are keyed by logical `${suit}${rank}` strings
   (`content.ts:292`, `cardTokens`, `ownedCards: string[]` in `types.ts`) — **no stable
   physical card IDs, no printed-vs-effective model, no graft provenance.** The card-state
   model remains the first build slice; the Reforge experiment is a reference prototype,
   not the V3 implementation.
3. **The plan's `CONT1_CH*` symbol does not exist** — the per-chapter gate stacks are
   **`C1_GATE_RANKS`** (`server/campaign/encounter.ts:220`).
4. **Hunt is entirely absent** — no node kind, no handler. It is a **new build**, not a
   repurpose (unlike every other C1/C2 landmark, which has a live handler to upgrade).

## Symbol verification

### Grafting & card identity
| Symbol | Verdict | Location | Notes |
|---|---|---|---|
| `hone` (+1 value) | EXISTS committed | `content.ts:254` | The live default graft on redundant exact kill |
| `graft` (add suit) | EXISTS committed | `content.ts:265` | `suitOp:'add'` — second suit |
| `transmute` (replace suit) | EXISTS committed | `content.ts:266` | `suitOp:'replace'` |
| `reforge` (replace value) | experiment branch only | `experiments/reforge-replenish` | Sets card to slain card's value via `Token.amount` |
| `EXPERIMENTS.replacementGrafts` | experiment branch only | ″ | OFF by default |
| Graft-on-kill trigger | EXISTS committed | `encounter.ts` `resolveKill` (~1069), `applyGraftSelect` (~1458) | `pendingGraft` + `turnPhase='graft_select'` |
| Stable physical card IDs | **ABSENT** | `types.ts`, `content.ts:292` | Cards keyed `${suit}${rank}`; §F required |

### Flags (`server/campaign/experiments.ts`, committed)
`ascendingDeck: true` · `preBossReshuffle: false` · `castleHearts: false` ·
`shortCastle: false` · `provinceMode: false` · `autoMarchAfterGates: false`.
Also exported: `CURATION_CUT = {1:4, 2:3, 3:2, 4:2}`.

### Economy / shop (`server/campaign/campaign.ts`)
| Symbol | Verdict | Location |
|---|---|---|
| `presentFragmentShop` | EXISTS | `campaign.ts:627` (menu loops back after each purchase) |
| `FRAGMENTS_PER_TOKEN` = 6 | EXISTS | `campaign.ts:534`; `SHOP_COST {token:6, spell:18, relic:24, premium:36}` `:611` |
| `tokenFragments` | EXISTS | state field, spent/earned throughout |
| `tokenBudget` | EXISTS | forge budget; incremented at forge/lair/bloodprice (`campaign.ts:337,394,493`) |

Note for §Q #12 (graft + fragment pairing): the **in-combat** graft trigger (`resolveKill`) grants no
fragment, but the **chapter-backfill** and **Council-of-Tens** paths already convert redundancy →
fragment (`campaign.ts:1480`, `:1133` — "redundancy → fragment"). Precedent exists; the design call is
still open.

### Curses (all committed; V3 = delete)
`undercut` (−1 token, `content.ts:257`) · `cursedCardIds` (`campaign.ts:326`) ·
Cleanse rites (`sanctum:cleanse` `:403,420`; `offerShrine`/`applyShrineCleanse` `:436,451`) ·
Caravan curse-payment (`offerCaravan` `:335` / `applyCaravanMythic` `:360` — mythic relic
for stamping `undercut` on all your 2s or 3s).

### Relics (`content.ts` `ITEMS` — 13, slot model `arms|armor|trinket`, `RELIC_SLOTS = 2`)
Bone Thread, Reliquary, Duel Charm, Last Lantern, Scry Band, Sainted Scalpel,
Iron Reprieve, Combat Cache, Glass Core, Warhorn, Bloodhound, Hoard, Catalyst (bridge).
`MYTHIC_RELIC_IDS` = glass-core/warhorn/bloodhound/hoard/combat-cache; `MYTHIC_PER_CONTINENT=3`.

### Spells (`content.ts` — 14)
Hail-mary (5): Overdrive, Bulwark, Mass Muster, Full Recovery, Execute ·
Standard (6): Keen Edge, Quick Muster, Refit, Guard Up, Bulwark Chant, Calm Pulse ·
Rare (3): Tactical Surge, Crownbreaker, Full Recycle.
`SPELL_UNLOCK_ORDER` (`content.ts:239`), `HAILMARY_SPELL_IDS` (`:226`) both exist.
The four V3 suit identities (Keen Edge ♣ / Quick Muster ♦ / Guard Up ♠ / Refit ♥) are live.

### Landmarks
| Symbol | Verdict | Location |
|---|---|---|
| `offerForge` | EXISTS | `campaign.ts:492` — +1 budget, token/card offer |
| `offerSanctum` | EXISTS | `campaign.ts:392` — spell/blessing/cleanse |
| `offerCaravan` | EXISTS | `campaign.ts:335` — mythic-for-a-curse |
| `offerShrine` | EXISTS | `campaign.ts:436` — cleanse (blessing when no curse) |
| `applyLairToken` | EXISTS | `campaign.ts:371` — free strong-token stamp |
| Tower | EXISTS, retired | `maps.ts:39` node + `campaign.ts:253,885` handler; `maps.ts:160` "retired everywhere" |
| Camp/rest | EXISTS | `campRest` `encounter.ts:178`; mandatory pre-boss camp `maps.ts:54` |
| **Hunt** | **ABSENT** | new build |

Node kinds in `maps.ts`: camp, boss, recruit, forge, tower, shrine, lair, market, abbey,
elite, veteran, skirmish, draft (Market/Abbey = internal names for Caravan/Sanctum).

### Campaign machinery
| Symbol | Verdict | Location |
|---|---|---|
| `RECRUIT_RANKS_BY_CHAPTER` | EXISTS | `encounter.ts:207` — `{1:['6','7'], 2:['8','9'], 3:['10']}` |
| `continentOf` | EXISTS | `encounter.ts:12` — `ceil(chapter/3)` |
| `C1_GATE_RANKS` | EXISTS | `encounter.ts:220` — per-chapter Gates/Courtyard/Throne stacks (**not** `CONT1_CH*`) |
| Province/gate machinery | EXISTS | `buildEnemyStack` gateRanks/rankOnly (`encounter.ts:323–504`); `useProvinceBossSplit` |
| Royal full-court 4J/4Q/4K | EXISTS | `rankOnly = ['J','Q','K'][gateIndex]`, 3 solo / 4 party per rank |
| Chapter persistence | EXISTS | `store.ts` JSON saves after every action; `sessions.ts` resume + `campaign_lost` guard |

### Classes & meta
- 9 classes in `CLASSES`; **`TIER1_CLASSES`** = sentinel ♠ / quartermaster ♦ / surgeon ♥ /
  executioner ♣ (`content.ts:63`); `STARTING_CLASSES` unlocks all 9 for playtest. Exile
  parked; Warden references a cut death-fork.
- `abilityText` + `siegeText` on every ClassDef (siege retired in V3).
- Lineage: `CampaignState.name` (`campaign.ts:64,95`); "Begin a new lineage" reset
  (`index.ts:349`). Death = hero-replacement + lineage-end, not single-life permadeath.
- Unlocks: `unlockedRelics`/`unlockedSpells` grow on death/milestone (`campaign.ts:1083–1088`).

### Assets
**Zero committed media.** No images/audio/fonts in git; audio is procedural WebAudio
(`client/src/sound.ts`); portraits are optional drop-ins (`client/public/portraits/README.md`).
"Superseded assets" for V3 means **code content** (relics/spells/classes), not files.
Client = 20 source files; server/campaign = 13 files (campaign.ts 83KB, encounter.ts 91KB).

## V3.0 fate map — every live content asset

| Fate | Items |
|---|---|
| **Delete after replacement** (§11) | Fragment shop (`presentFragmentShop`, `FRAGMENTS_PER_TOKEN`, `SHOP_COST`) · curse system (`undercut`, `cursedCardIds`, Cleanse rites, Caravan curse-payment) · additive `hone` branch · Tower node + handler · `tokenBudget` · `CURATION_CUT` · `provinceMode` flag + non-ascending `else` branches |
| **Superseded content** | 11 of 13 relics (only **Hoard → Ring** and **Sainted Scalpel → Amulet** carry into `relic_v1_design_3.0`) · ~10 of 14 spells (the four suit identities Keen Edge/Quick Muster/Guard Up/Refit carry; hail-mary set, rares, Bulwark Chant, Calm Pulse collapse) · `siegeText` (retired) · 5 suitless classes (V3.0 ships the 4 suited core) · `RELIC_SLOTS=2` + `arms/armor/trinket` slot model (→ 4 named slots + bag) |
| **Keep / upgrade** | `ascendingDeck` path · `C1_GATE_RANKS` + gate machinery (→ 3/2/1 pyramid) · `RECRUIT_RANKS_BY_CHAPTER` · `continentOf` (→ provinces) · landmark handlers `offerForge`/`offerSanctum`/`offerCaravan`/`offerShrine`/`applyLairToken` (repurposed per §8) · Camp/rest · tutorial (`campaign/tutorial.ts`) · telemetry/trace · sim harness (`server/scripts/`) · `transmute` (aligns with V3 suit-replace grafting) |
| **New build (no scaffold)** | Card-state model (§F) · replacement grafting as V3 semantics (Reforge experiment = reference only) · Hunt landmark · Fallen Heroes node · gauntlet/bracelet spell UI · relic bag + 4-slot equip screen |

## Housekeeping record (2026-07-01)

- Working-tree experiments committed to `experiments/reforge-replenish` (`9ecd62f`); live
  worktree restored clean to `91d3677`.
- Deleted stray 0-byte artifacts (`server/h.playerId`, `server/k),`, root `0.23`) and
  797 MB of gitignored local sim logs (`server/data/logs`, regenerable).
