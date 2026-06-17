import type { ClassDef, ClassId, EncounterDef, ItemDef, Token, TokenDef } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Classes (v0 roster — core abilities only; specializations are post-Ch1 canon
// and not implemented in this MVP)
// ─────────────────────────────────────────────────────────────────────────────

// Road CT flattened to 0.75 for the base four: leave-one-out simulation
// (2026-06-10, 400 seeds × 2 personas) measured them near-equal under
// team-wide triggers. Differentiation now lives in the siege ultimates
// (once per castle, automatic). Siege CT per the v2 dual-axis scale.
export const CLASSES: Record<ClassId, ClassDef> = {
  sentinel: {
    id: 'sentinel', tier: 1, name: 'Sentinel', theme: 'Shield / Stability', suit: 'S', ct: 0.75, siegeCt: 0.5,
    abilityText: 'When you play only Spades in a turn, they gain +3 shield. Mix any other suit and the bonus is lost — commit or diversify.',
    siegeText: 'Hold the Gate — once per boss fight, a counterattack against the Sentinel is fully negated.',
  },
  quartermaster: {
    id: 'quartermaster', tier: 1, name: 'Quartermaster', theme: 'Draw / Access', suit: 'D', ct: 0.75, siegeCt: 1.0,
    abilityText: 'Your first Diamond trigger each enemy draws +1 extra card, and your hand cap is +1.',
    siegeText: 'Last Requisition — once per castle, when the Quartermaster’s hand empties, the whole party draws back to full.',
  },
  surgeon: {
    id: 'surgeon', tier: 1, name: 'Surgeon', theme: 'Recovery / Precision', suit: 'H', ct: 0.75, siegeCt: 1.0,
    abilityText: 'Your first Heart trigger each enemy recovers +1 additional card.',
    siegeText: 'Field Triage — once per castle, when the Tavern runs dry, return up to 8 discard cards to it.',
  },
  executioner: {
    id: 'executioner', tier: 1, name: 'Executioner', theme: 'Thresholds / Initiative', suit: 'C', ct: 0.75, siegeCt: 0.5,
    abilityText: 'Once per enemy, if your damage leaves the enemy at 1-2 HP, deal +2 finishing damage.',
    siegeText: 'Regicide — in the castle, the Executioner’s own attacks finish royals from 1-4 HP.',
  },
  commander: {
    id: 'commander', tier: 2, name: 'Commander', theme: 'Initiative / Sequencing', suit: null, ct: 0.75, siegeCt: 0.3,
    abilityText: 'Press the Advantage — after your kill, draw 2 cards (solo) or draw 1 and pass your follow-up turn to any ally (multiplayer).',
    siegeText: 'Rally the Line — the first boss handoff to an ally also re-arms them with 2 cards.',
  },
  warden: {
    id: 'warden', tier: 2, name: 'Warden', theme: 'Death Mitigation', suit: null, ct: 0.75, siegeCt: 1.0,
    abilityText: 'Vigil — once per act, the Warden’s own collapse does not spend the party’s second wind. Once per run, death forks gain Defiant Stand.',
    siegeText: 'Deathward — once per castle, the first death is prevented; the hero discards what they can and stands.',
  },
  gambler: {
    id: 'gambler', tier: 3, name: 'Gambler', theme: 'Uncertainty / Tempo', suit: null, ct: 0.75, siegeCt: 0.3,
    abilityText: 'Once per encounter, wager before a play: if the enemy dies this turn, draw 2 cards and choose who acts next; if not, discard 1 random card.',
    siegeText: 'All In — once per boss fight, the Gambler’s first strike is doubled or halved on a coin flip.',
  },
  exile: {
    id: 'exile', tier: 3, name: 'Exile', theme: 'Deck Evolution', suit: null, ct: 0.75, siegeCt: 0.5,
    // Exile's card-removal abilities were retired (no mechanic may thin the deck —
    // the deck only ever grows). The class is parked behind its signature tokens
    // until it is repurposed; it currently has no active or siege ability.
    abilityText: 'Parked — reworking. Starts with its signature tokens; no active ability for now.',
    siegeText: '',
  },
  oracle: {
    id: 'oracle', tier: 3, name: 'Oracle', theme: 'Displacement / Foresight', suit: null, ct: 0.75, siegeCt: 0.75,
    abilityText: 'At the start of each encounter, look at the top 3 Tavern cards and reorder them. The card you place at the top is Marked — when you play it, deal +2 bonus damage.',
    siegeText: 'Throne Sight — at a boss fight, the Marked card deals +3 instead of +2.',
  },
}

export const TIER1_CLASSES: ClassId[] = ['sentinel', 'quartermaster', 'surgeon', 'executioner']
export const TIER2_CLASSES: ClassId[] = ['commander', 'warden']
export const TIER3_CLASSES: ClassId[] = ['gambler', 'exile', 'oracle']

// Province direction 2026-06-11: the two support (commander, warden) and two
// weird (gambler, oracle) classes are start-available. Exile's deck-exile
// identity overlaps class curation and is being rethought, but for playtest
// coverage ALL classes are unlocked for now (2026-06-11, Gab).
// Warden disabled: entire kit references the cut death-fork — non-functional until
// candle canvas is built (see docs/design/roadmap.md Tier 2b and docs/design/classes/class-design.md Warden section).
export const STARTING_CLASSES: ClassId[] = [...TIER1_CLASSES, 'commander', 'gambler', 'oracle', 'exile']

// ─────────────────────────────────────────────────────────────────────────────
// Encounter modifiers — implemented subset of the Chapter 1 encounter pack.
// Mechanics are simplified where the tabletop wording needs digital adaptation;
// names/pressure/category follow docs/design/campaign/encounters-chapter-1.md.
// ─────────────────────────────────────────────────────────────────────────────

export const ENCOUNTERS: EncounterDef[] = [
  // Skirmishes (0.25)
  { id: 'cracked-buckler', name: 'Cracked Buckler', tier: 'skirmish', pressure: 0.25, category: 'Shield',
    mechanicText: 'Each enemy’s first counterattack deals +1 unless a Spade was already played against it.' },
  { id: 'bleeder-patrol', name: 'Bleeder Patrol', tier: 'skirmish', pressure: 0.25, category: 'Recovery',
    mechanicText: 'The first counterattack you fail to fully shield this encounter costs +1 extra discard value.' },
  { id: 'dry-cart', name: 'Dry Cart', tier: 'skirmish', pressure: 0.25, category: 'Access',
    mechanicText: 'The first Diamond trigger this encounter draws 1 fewer card (min 1).' },
  { id: 'wrong-relay', name: 'Wrong Relay', tier: 'skirmish', pressure: 0.25, category: 'Initiative',
    mechanicText: 'After the first kill this encounter, the killer discards 1 random card if they keep the follow-up turn.' },
  { id: 'fog-marker', name: 'Fog Marker', tier: 'skirmish', pressure: 0.25, category: 'Consistency',
    mechanicText: 'Intel is partial: the top of the Tavern stays hidden to setup peeks this encounter.' },
  { id: 'hooked-blades', name: 'Hooked Blades', tier: 'skirmish', pressure: 0.25, category: 'Shield',
    mechanicText: 'A net counterattack of exactly 1 is treated as 2 unless a Spade contributed this turn.' },

  // Veterans (0.5)
  { id: 'shieldbreaker-line', name: 'Shieldbreaker Line', tier: 'veteran', pressure: 0.5, category: 'Shield',
    mechanicText: 'Each full round without a Spade play adds +1 pending damage to the next counterattack.' },
  { id: 'rot-ward', name: 'Rot Ward', tier: 'veteran', pressure: 0.5, category: 'Recovery',
    mechanicText: 'The first two Heart recoveries recover 1 fewer card. Each exact kill removes one remaining penalty.' },
  { id: 'starved-caravan', name: 'Starved Caravan', tier: 'veteran', pressure: 0.5, category: 'Access',
    mechanicText: 'Diamond draws are capped at 2 cards. Every second Diamond trigger ignores the cap.' },
  { id: 'command-fracture', name: 'Command Fracture', tier: 'veteran', pressure: 0.5, category: 'Initiative',
    mechanicText: 'After a kill, if the killer keeps the follow-up turn, the next enemy’s first counterattack deals +2.' },
  { id: 'iron-rain-file', name: 'Iron Rain File', tier: 'veteran', pressure: 0.5, category: 'Shield',
    mechanicText: 'Every second round, the first unshielded counterattack costs +1 extra discard value.' },

  // Elites (0.75-1.0)
  { id: 'blackwall-captain', name: 'Blackwall Captain', tier: 'elite', pressure: 0.75, category: 'Shield',
    mechanicText: 'Enemies start with 3 Guard. Each counterattack consumes 1 Guard to deal +1. Each Spade play removes 1 Guard.' },
  { id: 'pale-bell-matron', name: 'Pale Bell Matron', tier: 'elite', pressure: 0.75, category: 'Recovery',
    mechanicText: 'Hearts recover half (rounded up) until the party lands two exact kills this encounter.' },
  { id: 'banner-of-knives', name: 'Banner of Knives', tier: 'elite', pressure: 0.75, category: 'Initiative',
    mechanicText: 'After each kill, the killer keeping the follow-up turn costs 2 random discards.' },
  { id: 'garrison-crusher', name: 'Garrison Crusher', tier: 'elite', pressure: 1.0, category: 'Shield',
    mechanicText: 'Heavy rounds alternate: every second counterattack deals +2 unless fully shielded.' },
]

// Chapter 2 boss hidden modifiers (canon: pool intentionally open; small MVP pool)
export const BOSS_MODIFIERS: { id: string; name: string; text: string }[] = [
  { id: 'iron-court', name: 'Iron Court', text: 'All castle enemies have +5 max HP.' },
  { id: 'cruel-court', name: 'Cruel Court', text: 'All castle enemies attack for +2.' },
  { id: 'starving-court', name: 'Starving Court', text: 'Maximum hand size is reduced by 1 for this fight.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Items — implemented subset of docs/retired/synthetic-item-pools.md.
// Effects whose rules are dead under the v0 fresh-Tavern encounter reset
// (discard-pile recovery preps) or need value-adjust UI are deferred.
// ─────────────────────────────────────────────────────────────────────────────

export const ITEMS: ItemDef[] = [
  // Relics — RULE-BENDS, not axis-engines (the flat-axis role moved to tokens, so
  // the old Iron Stitch / Field Satchel / Grand Provision / Bastion Sigil engines
  // are RETIRED 2026-06-14). Relics now bend a rule once or passively.
  { id: 'r-bone-thread', kind: 'relic', tier: 'standard', name: 'Bone Thread', ct: 0.25, siegeCt: 0.2, slot: 'arms', category: 'Recovery',
    text: 'Activate once per encounter: shuffle 4 discard cards back into the Tavern.' },
  { id: 'r-reliquary', kind: 'relic', tier: 'standard', name: 'Reliquary', ct: 0.25, siegeCt: 0.3, slot: 'trinket', category: 'Access',
    text: 'Your hand cap is raised by 1, every encounter.' },
  { id: 'r-duel-charm', kind: 'relic', tier: 'standard', name: 'Duel Charm', ct: 0.25, slot: 'arms', category: 'Initiative',
    text: 'After every exact kill, your next attack deals +3 damage.' },
  { id: 'r-last-lantern', kind: 'relic', tier: 'standard', name: 'Last Lantern', ct: 0.25, siegeCt: 0.3, slot: 'trinket', category: 'Recovery',
    text: 'The first time you would die each encounter, the discard requirement is reduced by 4.' },
  { id: 'r-scry-band', kind: 'relic', tier: 'standard', name: 'Scry Band', ct: 0.25, slot: 'trinket', category: 'Consistency',
    text: 'At encounter start, see the top 3 Tavern cards and optionally reorder them.' },

  // Relics — rare (Lair / Throne / Caravan dark-deal: the run-defining chase)
  { id: 'r-sainted-scalpel', kind: 'relic', tier: 'rare', name: 'Sainted Scalpel', ct: 0.75, siegeCt: 0.5, slot: 'arms', category: 'Recovery',
    text: 'Activate once per encounter: shuffle up to 6 discard cards into the Tavern, then draw 2 cards.' },
  { id: 'r-iron-reprieve', kind: 'relic', tier: 'rare', name: 'Iron Reprieve', ct: 0.75, siegeCt: 0.5, slot: 'armor', category: 'Recovery',
    text: 'Once per chapter (automatic): prevent your death and set that discard check to 1.' },
  { id: 'r-combat-cache', kind: 'relic', tier: 'mythic', name: 'Combat Cache', ct: 0.75, slot: 'trinket', category: 'Access',
    text: 'Your combos may total up to 12 instead of 10 (bigger matched plays).' },

  // ── Mythic relics (Item-3 shiny decoys) — net-positive, flashy; max 3/continent ──
  { id: 'r-glass-core', kind: 'relic', tier: 'mythic', name: 'Glass Core', ct: 1, slot: 'trinket', category: 'Initiative',
    text: 'Your tokened cards deal +2 damage when played.' },
  { id: 'r-warhorn', kind: 'relic', tier: 'mythic', name: 'Warhorn', ct: 1, slot: 'arms', category: 'Initiative',
    text: 'Every play deals +2 damage.' },
  { id: 'r-bloodhound', kind: 'relic', tier: 'mythic', name: 'Bloodhound', ct: 1, slot: 'trinket', category: 'Access',
    text: 'Every exact kill draws a card.' },
  { id: 'r-hoard', kind: 'relic', tier: 'mythic', name: 'Hoard', ct: 1, slot: 'armor', category: 'Access',
    text: 'Your hand cap is raised by 2, every encounter.' },
  // ── Premium bridge relic (Item 4) — the Catalyst (Continent 1) ──
  { id: 'r-catalyst', kind: 'relic', tier: 'mythic', name: 'Catalyst', ct: 1.25, slot: 'arms', category: 'Initiative',
    text: 'Once per turn, the value tokens on your first play count double.' },

  // ── Hail-mary spells (Item 2) — held, swingy clutch swings (cap 2) ──
  { id: 's-overdrive', kind: 'spell', tier: 'rare', name: 'Overdrive', ct: 0.75, category: 'Initiative',
    text: 'Your next play this turn deals triple damage.' },
  { id: 's-bulwark', kind: 'spell', tier: 'rare', name: 'Bulwark', ct: 0.75, category: 'Shield',
    text: 'Negate the next counterattack entirely.' },
  { id: 's-mass-muster', kind: 'spell', tier: 'rare', name: 'Mass Muster', ct: 0.75, category: 'Access',
    text: 'Draw 4 cards.' },
  { id: 's-full-recovery', kind: 'spell', tier: 'rare', name: 'Full Recovery', ct: 0.75, category: 'Recovery',
    text: 'Shuffle your entire discard into the Tavern, then draw to a full hand.' },
  { id: 's-execute', kind: 'spell', tier: 'rare', name: 'Execute', ct: 0.75, category: 'Initiative',
    text: 'Instantly kill an enemy at 10 HP or less.' },

  // Spells — team owned, one-shot, cast on your turn
  { id: 's-keen-edge', kind: 'spell', tier: 'standard', name: 'Keen Edge', ct: 0.25, category: 'Initiative',
    text: 'Your next play this turn deals double damage.' },
  { id: 's-quick-muster', kind: 'spell', tier: 'standard', name: 'Quick Muster', ct: 0.25, category: 'Access',
    text: 'Draw 2 cards.' },
  { id: 's-refit', kind: 'spell', tier: 'standard', name: 'Refit', ct: 0.25, siegeCt: 0.2, category: 'Recovery',
    text: 'Shuffle up to 3 discard cards back into the Tavern.' },
  { id: 's-guard-up', kind: 'spell', tier: 'standard', name: 'Guard Up', ct: 0.25, category: 'Shield',
    text: 'Add +3 shield to the current enemy immediately.' },
  { id: 's-bulwark-chant', kind: 'spell', tier: 'standard', name: 'Bulwark Chant', ct: 0.25, category: 'Shield',
    text: 'The next counterattack this encounter deals 2 less.' },
  { id: 's-calm-pulse', kind: 'spell', tier: 'standard', name: 'Calm Pulse', ct: 0.25, category: 'Recovery',
    text: 'Reduce your current discard check by 2 (cast during your discard).' },
  { id: 's-tactical-surge', kind: 'spell', tier: 'rare', name: 'Tactical Surge', ct: 0.75, siegeCt: 0.3, category: 'Access',
    text: 'Foresee the top 5 of the Tavern and keep 2 of them.' },
  { id: 's-crownbreaker', kind: 'spell', tier: 'rare', name: 'Crownbreaker', ct: 0.75, category: 'Initiative',
    text: 'Your next play this turn deals triple damage.' },
  { id: 's-full-recycle', kind: 'spell', tier: 'rare', name: 'Full Recycle', ct: 0.75, siegeCt: 0.5, category: 'Recovery',
    text: 'Shuffle up to 6 discard cards into the Tavern, then draw 2 cards.' },
]

// ── Lookup helpers ───────────────────────────────────────────────────────────

const itemIndex = new Map(ITEMS.map(i => [i.id, i]))
const encounterIndex = new Map(ENCOUNTERS.map(e => [e.id, e]))

export function getItem(id: string): ItemDef {
  const it = itemIndex.get(id)
  if (!it) throw new Error(`Unknown item: ${id}`)
  return it
}
export function getEncounterDef(id: string): EncounterDef {
  const e = encounterIndex.get(id)
  if (!e) throw new Error(`Unknown encounter: ${id}`)
  return e
}
export function itemsOf(kind: ItemDef['kind'], tier?: ItemDef['tier']): ItemDef[] {
  return ITEMS.filter(i => i.kind === kind && (!tier || i.tier === tier))
}
export function encountersOf(tier: EncounterDef['tier']): EncounterDef[] {
  return ENCOUNTERS.filter(e => e.tier === tier)
}
// Solo relic economy: two carried relics; a third forces the player to release one.
export const RELIC_SLOTS = 2

// ── Fragment-shop content (economy-and-identity.md) ──────────────────────────
export const HAILMARY_SPELL_IDS = ['s-overdrive', 's-bulwark', 's-mass-muster', 's-full-recovery', 's-execute']
export const MYTHIC_RELIC_IDS = ['r-glass-core', 'r-warhorn', 'r-bloodhound', 'r-hoard', 'r-combat-cache']
export const BRIDGE_RELIC_ID = 'r-catalyst'   // Item 4 (Continent-1 premium)
// Max mythic relics acquired per continent (Caravan + Lair + shop, combined).
export const MYTHIC_PER_CONTINENT = 3

// ── Item unlock pools (meta: start limited, death/milestone grows it) ─────────
// Death = +breadth not power: the Kingdom starts with a small pool and unlocks
// more entries (in order) on death/milestone. Both stay deliberately small.
export const STARTING_RELICS = ['r-bone-thread', 'r-reliquary', 'r-duel-charm', 'r-last-lantern', 'r-scry-band']
export const STARTING_SPELLS = ['s-quick-muster', 's-keen-edge', 's-guard-up', 's-bulwark-chant']
// The order in which death/milestone unlocks add to the pool (the rares last).
export const RELIC_UNLOCK_ORDER = ['r-sainted-scalpel', 'r-iron-reprieve', 'r-combat-cache']
export const SPELL_UNLOCK_ORDER = ['s-refit', 's-calm-pulse', 's-tactical-surge', 's-crownbreaker', 's-full-recycle']

export const ALL_RELIC_IDS = [...STARTING_RELICS, ...RELIC_UNLOCK_ORDER]
export const ALL_SPELL_IDS = [...STARTING_SPELLS, ...SPELL_UNLOCK_ORDER]

// ─────────────────────────────────────────────────────────────────────────────
// Ascending Deck — Token catalog (Step 5). Numbers are first-pass / tunable.
// Design canon: docs/design/ascending-deck.md → "Tokens". A token never changes
// a card's rank/identity; it changes interaction on play (SPEND) or on discard-to-
// soak (HOLD). Forgeable F-market + the C/S tokens classes start with are LIVE;
// Echo/Wildcard/curses-via-spell are deferred (not in this table yet).
// ─────────────────────────────────────────────────────────────────────────────

export const TOKEN_DEFS: Record<string, TokenDef> = {
  // A. value — SPEND
  hone:        { id: 'hone', name: 'Hone', short: '+1', kind: 'value', spend: 1, power: 1, source: 'F', forgeable: true, text: '+1 value when played (damage & suit power).' },
  temper:      { id: 'temper', name: 'Temper', short: '+2', kind: 'value', spend: 2, power: 2, source: 'F', forgeable: true, text: '+2 value when played.' },
  undercut:    { id: 'undercut', name: 'Undercut', short: '−1', kind: 'value', spend: -1, power: 1, source: 'S', forgeable: false, text: '−1 value when played — undershoot onto an exact kill.' },
  // B. value — HOLD
  ballast:        { id: 'ballast', name: 'Ballast', short: '⛨+1', kind: 'value', hold: 1, power: 1, source: 'F', forgeable: true, text: 'Discards as +1 value (soaks a bigger hit).' },
  'bulwark-weave':{ id: 'bulwark-weave', name: 'Bulwark-weave', short: '⛨+2', kind: 'value', hold: 2, power: 2, source: 'F', forgeable: true, text: 'Discards as +2 value.' },
  // C. value — SPLIT
  glasswork:   { id: 'glasswork', name: 'Glasswork', short: '+2/−1', kind: 'value', spend: 2, hold: -1, power: 2, source: 'F', forgeable: true, text: '+2 played, −1 to soak (glass cannon).' },
  deadweight:  { id: 'deadweight', name: 'Deadweight', short: '−1/+2', kind: 'value', spend: -1, hold: 2, power: 2, source: 'F', forgeable: true, text: '−1 played, +2 to soak (turtle).' },
  // D. suit
  graft:       { id: 'graft', name: 'Graft', short: '+◆', kind: 'suit', suitOp: 'add', power: 3, source: 'F', needsSuit: true, forgeable: true, text: 'Adds a second suit — fires two levers at once.' },
  transmute:   { id: 'transmute', name: 'Transmute', short: '→◆', kind: 'suit', suitOp: 'replace', power: 3, source: 'F', needsSuit: true, forgeable: true, text: 'Changes the card’s suit entirely.' },
  // E. lever magnitude
  plate:       { id: 'plate', name: 'Plate', short: '♠+1', kind: 'lever', lever: 'shield', power: 2, source: 'F', forgeable: true, text: '+1 shield when this card’s ♠ power fires.' },
  provision:   { id: 'provision', name: 'Provision', short: '♦+1', kind: 'lever', lever: 'draw', power: 2, source: 'F', forgeable: true, text: '+1 to the draw pool when this card’s ♦ power fires.' },
  mend:        { id: 'mend', name: 'Mend', short: '♥+1', kind: 'lever', lever: 'recover', power: 2, source: 'F', forgeable: true, text: '+1 recovery when this card’s ♥ power fires.' },
  edge:        { id: 'edge', name: 'Edge', short: '♣+2', kind: 'lever', lever: 'edge', power: 2, source: 'F', forgeable: true, text: '+2 damage when this card’s ♣ power fires.' },
  // F. sequencing / triggers (LIVE this build)
  scry:        { id: 'scry', name: 'Scry', short: '👁', kind: 'keyword', keyword: 'scry', power: 2, source: 'C', forgeable: true, text: 'On play, foresee the Tavern: tee up your next draw.' },
  mark:        { id: 'mark', name: 'Mark', short: '✦+2', kind: 'keyword', keyword: 'mark', power: 2, source: 'C', forgeable: true, text: '+2 damage on play (the foreseen strike).' },
  banner:      { id: 'banner', name: 'Banner', short: '⚑', kind: 'keyword', keyword: 'banner', power: 2, source: 'C', forgeable: false, text: 'On a kill with this card, draw 1.' },
  bloodprice:  { id: 'bloodprice', name: 'Bloodprice', short: '🩸', kind: 'keyword', keyword: 'bloodprice', power: 3, source: 'C', forgeable: false, text: 'On an exact kill with this card, +1 forge budget.' },
}

export function getTokenDef(id: string): TokenDef | undefined { return TOKEN_DEFS[id] }

/** Tokens a forge node may offer (F-market, plus suit tokens resolve a suit). */
export const FORGEABLE_TOKEN_IDS = Object.values(TOKEN_DEFS).filter(d => d.forgeable).map(d => d.id)

/** C-tier ("not too strong") tokens the fragment track may apply on the road.
 * 2 fragments → 1 application. Weak by design — value bumps + light consistency;
 * the Forge keeps the stronger F-tier tokens (Temper / Graft / lever / suit). */
export const C_TIER_TOKEN_IDS = ['hone', 'ballast', 'scry', 'mark']

// ── Class level-1 signatures (pure-token; locked 2026-06-14) ─────────────────
// Each class stamps its signature tokens onto specific cards of the shared 20-card
// start (A–5 ×4). First 4 suited classes are the active design; 5–9 are drafted/
// parked. cardId = `${suit}${rank}`. Suit tokens carry a resolved `suit`.
export const CLASS_SIGNATURES: Record<ClassId, Token[]> = {
  // suited — own-suit lever stamps
  sentinel:     [{ defId: 'plate' },      // → applied to 3♠ 4♠ 5♠ (see SIGNATURE_CARDS)
                 { defId: 'plate' }, { defId: 'plate' }],
  quartermaster:[{ defId: 'provision' }, { defId: 'provision' }, { defId: 'provision' }],
  surgeon:      [{ defId: 'mend' }, { defId: 'mend' }, { defId: 'mend' }],
  executioner:  [{ defId: 'edge' }, { defId: 'edge' }, { defId: 'undercut' }],
  // suitless — token-family stamps (parked: drafted, not balance-tuned)
  commander:    [{ defId: 'banner' }, { defId: 'banner' }, { defId: 'banner' }],
  warden:       [{ defId: 'bulwark-weave' }, { defId: 'bulwark-weave' }, { defId: 'bulwark-weave' }],
  gambler:      [{ defId: 'glasswork' }, { defId: 'glasswork' }, { defId: 'mark' }],
  exile:        [{ defId: 'transmute', suit: 'S' }, { defId: 'transmute', suit: 'C' }],
  oracle:       [{ defId: 'scry' }, { defId: 'scry' }, { defId: 'mark' }],
}

/** Which cards each class stamps (parallel to CLASS_SIGNATURES order). */
export const SIGNATURE_CARDS: Record<ClassId, string[]> = {
  sentinel:      ['S3', 'S4', 'S5'],
  quartermaster: ['D3', 'D4', 'D5'],
  surgeon:       ['H3', 'H4', 'H5'],
  executioner:   ['C4', 'C5', 'C2'],
  commander:     ['D3', 'S4', 'C5'],
  warden:        ['S2', 'H2', 'C3'],
  gambler:       ['D5', 'C5', 'H4'],
  exile:         ['S5', 'C5'],
  oracle:        ['D2', 'D3', 'S4'],
}
