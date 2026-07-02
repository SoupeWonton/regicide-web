// V3 §7 (slice 7) — relic_v1_design_3.0: the 29-relic pool, four named slots.
// Catalog: docs/canon/v3/systems/relics.md (decision 2026-06-28); implementation
// pins (each ⚑ simplification recorded): docs/delivery/contracts/relics.md.
// Slot themes locked: Cloak = roads · Ring = economy · Hat = recruitment ·
// Amulet = activated. One relic per slot, equipped from the run's BAG; swaps
// are free at every between-encounter screen and locked in combat (Decision 7).
// Acquisition: Lair (raid) and Caravan (pay-from-hand) — never ordinary drops.

import type { CampaignState } from './types'

export type RelicSlot = 'cloak' | 'ring' | 'hat' | 'amulet'
export const RELIC_SLOT_ORDER: RelicSlot[] = ['hat', 'amulet', 'ring', 'cloak']

export interface RelicDef {
  id: string
  slot: RelicSlot
  name: string
  text: string           // pinned contract wording (what the code actually does)
  activated?: boolean    // Amulet + the road-activated Ring/Cloak utilities
  road?: boolean         // activation happens on the road, not in combat
}

export const V3_RELICS: RelicDef[] = [
  // ── Cloak — roads (6) ──────────────────────────────────────────────────────
  { id: 'v3r-forked-road', slot: 'cloak', name: 'Forked Road',
    text: 'Every reachable next node on the road is revealed before you commit.' },
  { id: 'v3r-forced-march', slot: 'cloak', name: 'Forced March',
    text: 'Once per province: arriving at an ordinary fight, you may march past it — no fight, no recruit, no graft.' },
  { id: 'v3r-bedroll', slot: 'cloak', name: 'Bedroll', activated: true, road: true,
    text: 'Once per province, on the road: reshuffle your discard into the Tavern without a Camp.' },
  { id: 'v3r-vanguard', slot: 'cloak', name: 'Vanguard',
    text: 'The first enemy of each fight cannot counterattack the first time it would.' },
  { id: 'v3r-slip-away', slot: 'cloak', name: 'Slip Away', activated: true,
    text: 'In combat: discard 5+ of hand value to retreat — keep your hand; the enemy is not defeated.' },
  { id: 'v3r-scout-ahead', slot: 'cloak', name: 'Scout Ahead',
    text: 'Every fight begins with the enemy lineup revealed.' },
  // ── Ring — economy (8) ─────────────────────────────────────────────────────
  { id: 'v3r-hoard', slot: 'ring', name: 'Hoard',
    text: 'Your maximum hand size is +2.' },
  { id: 'v3r-interest', slot: 'ring', name: 'Interest',
    text: 'Pay no discards for a whole fight → start the next fight drawing +1 card.' },
  { id: 'v3r-debt', slot: 'ring', name: 'Debt', activated: true,
    text: 'Once per fight: draw 2 now; your next two counterattack payments cost +1 value each.' },
  { id: 'v3r-requisition-writ', slot: 'ring', name: 'Requisition Writ', activated: true, road: true,
    text: 'Once per province, on the road: discard your two lowest cards for one fragment.' },
  { id: 'v3r-liquidate', slot: 'ring', name: 'Liquidate', activated: true,
    text: 'Once per fight: discard your lowest card to draw 2.' },
  { id: 'v3r-last-coin', slot: 'ring', name: 'Last Coin',
    text: 'Once per fight: the first time your hand empties, draw 3.' },
  { id: 'v3r-caravan-coin', slot: 'ring', name: 'Caravan Coin',
    text: 'The Caravan’s pay-from-hand cost is reduced by 2.' },
  { id: 'v3r-double-or-nothing', slot: 'ring', name: 'Double or Nothing', activated: true,
    text: 'Once per fight: discard your whole hand and draw that many cards +1.' },
  // ── Hat — recruitment (8) ──────────────────────────────────────────────────
  { id: 'v3r-conscription', slot: 'hat', name: 'Conscription',
    text: 'An overkill still recruits the card — it enters rewritten one rank DOWN (§F provenance), instead of being lost.' },
  { id: 'v3r-press-gang', slot: 'hat', name: 'Press-gang',
    text: 'Recruits arrive pre-shaped: rewritten to your class’s home suit (§F provenance).' },
  { id: 'v3r-rallying-cry', slot: 'hat', name: 'Rallying Cry',
    text: 'When you recruit, your best discard card also returns to the Tavern.' },
  { id: 'v3r-battlefield-promotion', slot: 'hat', name: 'Battlefield Promotion',
    text: 'The first card you recruit each fight enters upgraded one rank (cap 10).' },
  { id: 'v3r-black-standard', slot: 'hat', name: 'Black Standard',
    text: 'Recruits enter the TOP of the Tavern (your next draw) instead of the bottom.' },
  { id: 'v3r-apprentice', slot: 'hat', name: 'Apprentice',
    text: 'When you recruit, also draw 1.' },
  { id: 'v3r-muster', slot: 'hat', name: 'Muster',
    text: 'Royals you keep at the gates enter the TOP of the Tavern instead of shuffling in.' },
  { id: 'v3r-plunder', slot: 'hat', name: 'Plunder',
    text: 'An exact-kill recruit is swapped for the best same-suit card in your discard, when that card is stronger.' },
  // ── Amulet — activated (7) ─────────────────────────────────────────────────
  { id: 'v3r-sainted-scalpel', slot: 'amulet', name: 'Sainted Scalpel', activated: true,
    text: 'Once per fight: shuffle up to 6 discards into the Tavern and draw 1.' },
  { id: 'v3r-unbinding', slot: 'amulet', name: 'Unbinding', activated: true,
    text: 'Once per enemy: your next play ignores the enemy’s immunity.' },
  { id: 'v3r-second-wind', slot: 'amulet', name: 'Second Wind', activated: true,
    text: 'Once per fight: your next play triggers NO counterattack — you act again.' },
  { id: 'v3r-aegis', slot: 'amulet', name: 'Aegis', activated: true,
    text: 'Once per enemy: the next counterattack is reduced by 5.' },
  { id: 'v3r-bloodlust', slot: 'amulet', name: 'Bloodlust', activated: true,
    text: 'Once per enemy: your next play deals +3 damage.' },
  { id: 'v3r-echo', slot: 'amulet', name: 'Echo', activated: true,
    text: 'Once per fight: your best discard card strikes for its value only (no suit power; it stays in the discard).' },
  { id: 'v3r-lodestone', slot: 'amulet', name: 'Lodestone', activated: true,
    text: 'Once per fight: pull the best card of the Tavern into your hand.' },
]

export function getV3Relic(id: string | undefined | null): RelicDef | undefined {
  return id ? V3_RELICS.find(r => r.id === id) : undefined
}

/** The run's bag (relics found, not necessarily equipped). */
export function relicBagOf(c: CampaignState): string[] {
  c.relicBag ??= []
  return c.relicBag
}

/** The run's equipment: one relic per named slot. Solo-scope: hero 0 wears it. */
export function equipmentOf(c: CampaignState): Partial<Record<RelicSlot, string>> {
  c.relicEquipment ??= {}
  return c.relicEquipment
}

/** True when the given V3 relic is currently equipped in its slot. */
export function relicEquipped(c: CampaignState, id: string): boolean {
  const def = getV3Relic(id)
  if (!def) return false
  return equipmentOf(c)[def.slot] === id
}

/** Every relic id the run already holds (bag + equipped). */
export function relicsOwned(c: CampaignState): Set<string> {
  return new Set([...relicBagOf(c), ...Object.values(equipmentOf(c)).filter((x): x is string => !!x)])
}
