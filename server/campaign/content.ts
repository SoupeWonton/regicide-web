import type { ClassDef, ClassId, EncounterDef, ItemDef } from './types'

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
    abilityText: 'Once per enemy, your first Spade gains +2 shield value.',
    siegeText: 'Hold the Gate — once per castle, a counterattack against the Sentinel is fully negated.',
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
    abilityText: 'After your kill, you may pass the follow-up turn to any ally — and you draw 1 card (Press the Advantage).',
    siegeText: 'Rally the Line — the first castle handoff to an ally also re-arms them with 2 cards.',
  },
  warden: {
    id: 'warden', tier: 2, name: 'Warden', theme: 'Death Mitigation', suit: null, ct: 0.75, siegeCt: 1.0,
    abilityText: 'Vigil — once per act, the Warden’s own collapse does not spend the party’s second wind. Once per run, death forks gain Defiant Stand.',
    siegeText: 'Deathward — once per castle, the first death is prevented; the hero discards what they can and stands.',
  },
  gambler: {
    id: 'gambler', tier: 3, name: 'Gambler', theme: 'Uncertainty / Tempo', suit: null, ct: 0.75, siegeCt: 0.3,
    abilityText: 'Once per chapter, wager before a play: if the enemy dies this turn, draw 2 cards and choose who acts next; if not, discard 1 random card.',
    siegeText: 'All In — once per castle, the Gambler’s first strike is doubled or halved on a coin flip.',
  },
  exile: {
    id: 'exile', tier: 3, name: 'Exile', theme: 'Deck Evolution', suit: null, ct: 0.75, siegeCt: 0.5,
    abilityText: 'Once per camp, exile one card from the deck for the rest of the chapter. Every second exile adds Burden (harsher death forks).',
    siegeText: 'Tithe of the Severed — at the castle gates, exile the top 2 Tavern cards forever; their value wounds the first royal.',
  },
  oracle: {
    id: 'oracle', tier: 3, name: 'Oracle', theme: 'Hidden Information', suit: null, ct: 0.75, siegeCt: 0.75,
    abilityText: 'At the start of each encounter, look at the top 3 Tavern cards and reorder them. Foresight: your first play after a peek deals +1 damage.',
    siegeText: 'Unveil the Court — the hidden court modifier is read in advance and nullified.',
  },
}

export const TIER1_CLASSES: ClassId[] = ['sentinel', 'quartermaster', 'surgeon', 'executioner']
export const TIER2_CLASSES: ClassId[] = ['commander', 'warden']
export const TIER3_CLASSES: ClassId[] = ['gambler', 'exile', 'oracle']

// Province direction 2026-06-11: the two support (commander, warden) and two
// weird (gambler, oracle) classes are start-available. Exile stays locked —
// its deck-exile identity overlaps the class curation system and is being
// rethought; it remains a rewards-on-death unlock.
export const STARTING_CLASSES: ClassId[] = [...TIER1_CLASSES, 'commander', 'warden', 'gambler', 'oracle']

// ─────────────────────────────────────────────────────────────────────────────
// Encounter modifiers — implemented subset of the Chapter 1 encounter pack.
// Mechanics are simplified where the tabletop wording needs digital adaptation;
// names/pressure/category follow campaign/encounters-chapter-1.md.
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
// Items — implemented subset of items/synthetic-item-pools.md.
// Effects whose rules are dead under the v0 fresh-Tavern encounter reset
// (discard-pile recovery preps) or need value-adjust UI are deferred.
// ─────────────────────────────────────────────────────────────────────────────

export const ITEMS: ItemDef[] = [
  // Memories (Chapter 1 completion drafts, 0.25 CT each)
  { id: 'm-steady-formation', kind: 'memory', tier: 'standard', name: 'Steady Formation', ct: 0.25, category: 'Shield',
    text: 'Your first Spade each encounter gains +1 shield value.' },
  { id: 'm-quartered-rations', kind: 'memory', tier: 'standard', name: 'Quartered Rations', ct: 0.25, category: 'Access',
    text: 'Your first Diamond trigger each encounter draws +1 card.' },
  { id: 'm-surgical-notes', kind: 'memory', tier: 'standard', name: 'Surgical Notes', ct: 0.25, category: 'Recovery',
    text: 'Your first Heart trigger each encounter recovers +1 card.' },
  { id: 'm-clean-finish', kind: 'memory', tier: 'standard', name: 'Clean Finish', ct: 0.25, category: 'Initiative',
    text: 'Once per encounter, if your damage would leave the enemy at exactly 1 HP, deal +1 finishing damage.' },
  { id: 'm-calm-under-fire', kind: 'memory', tier: 'standard', name: 'Calm Under Fire', ct: 0.25, category: 'Shield',
    text: 'Your first discard check each encounter is reduced by 1.' },
  { id: 'm-court-recon', kind: 'memory', tier: 'standard', name: 'Court Recon', ct: 0.25, category: 'Consistency',
    text: 'At encounter start, you see the top 2 Tavern cards.' },
  { id: 'm-first-blood-ledger', kind: 'memory', tier: 'standard', name: 'First Blood Ledger', ct: 0.25, category: 'Initiative',
    text: 'Your first exact kill each encounter draws you 1 card.' },
  { id: 'm-guard-rotation', kind: 'memory', tier: 'standard', name: 'Guard Rotation', ct: 0.25, category: 'Initiative',
    text: 'Once per encounter, after your kill you may choose the next acting hero.' },

  // Relics — standard (hero-linked design intent, usable by holder)
  { id: 'r-iron-stitch', kind: 'relic', tier: 'standard', name: 'Iron Stitch', ct: 0.25, slot: 'armor', category: 'Shield',
    text: 'Your first Spade each encounter gains +1 shield.' },
  { id: 'r-field-satchel', kind: 'relic', tier: 'standard', name: 'Field Satchel', ct: 0.25, slot: 'trinket', category: 'Access',
    text: 'Your first Diamond trigger each encounter draws +1 card.' },
  { id: 'r-bone-thread', kind: 'relic', tier: 'standard', name: 'Bone Thread', ct: 0.25, siegeCt: 0.2, slot: 'arms', category: 'Recovery',
    text: 'Activate once per encounter: shuffle 2 discard cards back into the Tavern.' },
  { id: 'r-reliquary', kind: 'relic', tier: 'standard', name: 'Reliquary', ct: 0.25, siegeCt: 0.3, slot: 'trinket', category: 'Access',
    text: 'During castle assaults, the holder’s party hand cap is raised by 1.' },
  { id: 'r-duel-charm', kind: 'relic', tier: 'standard', name: 'Duel Charm', ct: 0.25, slot: 'arms', category: 'Initiative',
    text: 'After your first exact kill each encounter, your next attack deals +2 damage.' },
  { id: 'r-signal-whistle', kind: 'relic', tier: 'standard', name: 'Signal Whistle', ct: 0.25, slot: 'trinket', category: 'Initiative',
    text: 'Activate once per encounter on your turn: choose who acts after you.' },
  { id: 'r-last-lantern', kind: 'relic', tier: 'standard', name: 'Last Lantern', ct: 0.25, siegeCt: 0.3, slot: 'trinket', category: 'Recovery',
    text: 'The first time you would die each encounter, the discard requirement is reduced by 2.' },
  { id: 'r-scry-band', kind: 'relic', tier: 'standard', name: 'Scry Band', ct: 0.25, slot: 'trinket', category: 'Consistency',
    text: 'At encounter start, see the top 2 Tavern cards and optionally reorder them.' },

  // Relics — rare (Lair / elite rewards)
  { id: 'r-grand-provision', kind: 'relic', tier: 'rare', name: 'Grand Provision', ct: 0.75, slot: 'trinket', category: 'Access',
    text: 'Your first two Diamond triggers each encounter draw +1 card each.' },
  { id: 'r-sainted-scalpel', kind: 'relic', tier: 'rare', name: 'Sainted Scalpel', ct: 0.75, siegeCt: 0.5, slot: 'arms', category: 'Recovery',
    text: 'Activate once per encounter: shuffle up to 4 discard cards into the Tavern, then draw 1 card.' },
  { id: 'r-war-drum', kind: 'relic', tier: 'rare', name: 'War Drum', ct: 0.75, siegeCt: 1.0, slot: 'arms', category: 'Access',
    text: 'During castle assaults, every fallen royal rallies the party: everyone draws 1 card.' },
  { id: 'r-bastion-sigil', kind: 'relic', tier: 'rare', name: 'Bastion Sigil', ct: 0.75, slot: 'armor', category: 'Shield',
    text: 'Your first two Spades each encounter gain +1 shield each, and your first fully-shielded counterattack draws you 1 card.' },
  { id: 'r-iron-reprieve', kind: 'relic', tier: 'rare', name: 'Iron Reprieve', ct: 0.75, siegeCt: 0.5, slot: 'armor', category: 'Recovery',
    text: 'Once per chapter (automatic): prevent your death and set that discard check to 1.' },

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
    text: 'Every hero draws 1 card.' },
  { id: 's-crownbreaker', kind: 'spell', tier: 'rare', name: 'Crownbreaker', ct: 0.75, category: 'Initiative',
    text: 'Your next play this turn deals triple damage.' },
  { id: 's-full-recycle', kind: 'spell', tier: 'rare', name: 'Full Recycle', ct: 0.75, siegeCt: 0.5, category: 'Recovery',
    text: 'Shuffle up to 6 discard cards into the Tavern, then draw 2 cards.' },

  // Preparations — camp activations, apply at next encounter start (cap 2)
  { id: 'p-shield-drill', kind: 'preparation', tier: 'standard', name: 'Shield Drill', ct: 0.25, category: 'Shield',
    text: 'The first enemy starts with +2 accumulated shield.' },
  { id: 'p-hand-brief', kind: 'preparation', tier: 'standard', name: 'Hand Brief', ct: 0.25, category: 'Access',
    text: 'The starting hero begins with +2 extra cards.' },
  { id: 'p-route-intel', kind: 'preparation', tier: 'standard', name: 'Route Intel', ct: 0.25, category: 'Consistency',
    text: 'At encounter start, the starting hero sees the top 3 Tavern cards and may reorder them.' },
  { id: 'p-brace-command', kind: 'preparation', tier: 'standard', name: 'Brace Command', ct: 0.25, category: 'Initiative',
    text: 'The team chooses the starting hero for this encounter.' },
  { id: 'p-light-fortify', kind: 'preparation', tier: 'standard', name: 'Light Fortify', ct: 0.25, category: 'Shield',
    text: 'The first discard check this encounter is reduced by 1.' },
  { id: 'p-spare-edge', kind: 'preparation', tier: 'standard', name: 'Spare Edge', ct: 0.25, category: 'Initiative',
    text: 'The first attack this encounter deals +2 damage.' },
  // NOTE: the pool's discard-recovery preps (Reserve Kits, Full Logistics) stay
  // out of v0 — preps fire at the first post-camp encounter, where the camp
  // rest has just emptied the discard, so they would never do anything.
  { id: 'p-fortified-entry', kind: 'preparation', tier: 'rare', name: 'Fortified Entry', ct: 0.75, siegeCt: 0.4, category: 'Shield',
    text: 'The first counterattack this encounter deals 0.' },
  { id: 'p-surgical-reserve', kind: 'preparation', tier: 'rare', name: 'Surgical Reserve', ct: 0.75, siegeCt: 0.4, category: 'Recovery',
    text: 'The first time a hero would die this encounter, that discard requirement is reduced by 3 (min 1).' },
  { id: 'p-last-march', kind: 'preparation', tier: 'rare', name: 'Banner of the Last March', ct: 0.25, siegeCt: 1.5, category: 'Recovery',
    text: 'Next encounter: if it is a castle assault, the first time the Tavern runs dry the party takes a full rest.' },
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
export const MEMORY_POOL = ITEMS.filter(i => i.kind === 'memory').map(i => i.id)
export const ACTIVE_PREP_CAP = 2
