// V3 §6 (slice 6) — the four suit crystals: gauntlet content + helpers.
// Design (revised 2026-07-03, Landry playtest): 4 spell identities, one per
// suit, held in the GAUNTLET — one crystal per suit slot (empty / Fragment /
// Half). Accumulation lives in the AGNOSTIC POOLS, not in a slot:
// CampaignState.tokenFragments (50/50 drop after each won encounter) and
// tokenHalves (forged, 2 fragments → 1 Half). The BRACELET arms one pool item
// into an EMPTY slot (fragment → Fragment spell; Half → the stronger Half
// spell). The FORGE landmark always opens a menu and converts fragments → Halves.
// Cast = consume the slot to EMPTY (Decision 2); one cast per suit per combat;
// castable over matching-suit immunity.
// Numbers are placeholders (plan §A): FRAGMENTS_PER_HALF = 2 · RALLY_CAP = 5.
// Pins: docs/delivery/contracts/spells.md.

import type { CampaignState } from './types'

export const FRAGMENTS_PER_HALF = 2
export const RALLY_CAP = 5
export const GAUNTLET_SUITS = ['S', 'D', 'H', 'C'] as const

export interface CrystalTierDef { name: string; text: string }

export const CRYSTALS: Record<string, { fragment: CrystalTierDef; half: CrystalTierDef }> = {
  C: {
    fragment: { name: 'Keen Edge', text: 'Your next attack deals double damage.' },
    half: { name: 'Commit', text: 'Your next play may include ONE extra off-rank card (combo cap still applies; not with an Ace pair).' },
  },
  D: {
    fragment: { name: 'Quick Muster', text: 'Draw 2.' },
    half: { name: 'Rally', text: 'Armed: before you pay the next counterattack, draw cards equal to it (max 5).' },
  },
  S: {
    fragment: { name: 'Guard Up', text: 'Shield +3 against the current enemy.' },
    half: { name: 'Brace', text: 'Cast while paying a counterattack: your highest hand card is spent as emergency shield — its value cuts the payment.' },
  },
  H: {
    fragment: { name: 'Refit', text: 'Return 3 discards to the Tavern and draw 1.' },
    half: { name: 'Full Recycle', text: 'Rebuild the Tavern from your entire discard and draw 2.' },
  },
}

/** The gauntlet, defaulted: four empty suit slots (one crystal each). */
export function gauntletOf(c: CampaignState): NonNullable<CampaignState['gauntlet']> {
  c.gauntlet ??= {
    S: { tier: 0 }, D: { tier: 0 }, H: { tier: 0 }, C: { tier: 0 },
  }
  return c.gauntlet
}

/** The crystal a hole currently answers with (null = empty). */
export function crystalOf(suit: string, tier: number): CrystalTierDef | null {
  const cry = CRYSTALS[suit]
  if (!cry || tier <= 0) return null
  return tier >= 2 ? cry.half : cry.fragment
}

/** Client projection: per-suit tier/name/text + live castability. */
export function projectGauntlet(c: CampaignState): Record<string, { tier: 0 | 1 | 2; name: string; text: string; castable: boolean }> {
  const g = gauntletOf(c)
  const s = c.encounter
  const out: Record<string, { tier: 0 | 1 | 2; name: string; text: string; castable: boolean }> = {}
  for (const su of GAUNTLET_SUITS) {
    const hole = g[su]!
    const def = crystalOf(su, hole.tier)
    out[su] = {
      tier: hole.tier,
      name: def?.name ?? '—',
      text: def?.text ?? 'Empty — arm a fragment or Half here via the bracelet.',
      castable: hole.tier > 0 && !!s && s.outcome === 'active' && !s.flags[`gauntletCast:${su}`],
    }
  }
  return out
}
