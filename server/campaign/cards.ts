// §F card-state model (V3.0 slice 1) — the physical card registry.
//
// The live game keys cards by LOGICAL id (`${suit}${rank}`): fine while a
// card's face never changes, fatal once replacement grafts (V3 §1) rewrite
// rank or suit. This module gives every owned card a stable PHYSICAL identity:
//   printed face   — what is inked on the card; never changes
//   grafts         — ordered replacement records (provenance; movable — Sanctum)
//   effective face — printed + grafts folded in order (derived, never stored)
// Runtime deck cards are built FROM the registry (encounter.setupChapterDeck):
// Card.id === physicalId and Card.{suit,rank} === the effective face, so the
// engine math is untouched while identity survives replacement and rebuilds.
//
// Compatibility shim (until the additive-token systems retire, slice 9):
// ownedCards / cardTokens stay keyed by logical id. physicalByLogical resolves
// a logical id by EFFECTIVE face (how the legacy systems see cards; valid while
// effective faces are unique — slice 2+ code must key by physicalId instead).
// Registration dedups by PRINTED face, which stays unique per campaign (a card
// is recruited at most once, and grafts never touch the printed face).

import type { CampaignState, CardFace, GraftRecord, PhysicalCard, ClientPhysicalCard } from './types'
import { EXPERIMENTS } from './experiments'

/** Persisted CampaignState format version. 1 (implicit — the field is absent)
 * = legacy logical-id saves; 2 = §F physical card registry. */
export const CAMPAIGN_SCHEMA_VERSION = 2

/** The ascending-deck starting ranks (A–5 × 4 suits = the 20-card small start). */
export const START_RANKS = ['A', '2', '3', '4', '5'] as const
const SUITS = ['C', 'D', 'H', 'S'] as const
/** Legal `to` values for a rank graft — A–10 only: the royal cap (§3) is a
 * structural invariant here, not just trigger-site policy. */
const GRAFT_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10']

export function logicalOf(face: CardFace): string { return `${face.suit}${face.rank}` }

/** Effective face = printed + grafts in order (the last of each kind wins). */
export function effectiveFace(pc: PhysicalCard): CardFace {
  let suit = pc.printed.suit
  let rank = pc.printed.rank
  for (const g of pc.grafts) {
    if (g.kind === 'suit') suit = g.to
    else rank = g.to
  }
  return { suit, rank }
}

function nextSeq(c: CampaignState): number {
  c.cardSeq = (c.cardSeq ?? 0) + 1
  return c.cardSeq
}

/** Mint + register a new physical card. The printed face is fixed forever. */
export function mintPhysicalCard(c: CampaignState, printed: CardFace): PhysicalCard {
  const pc: PhysicalCard = { physicalId: `pc${nextSeq(c)}`, printed: { ...printed }, grafts: [] }
  c.cards ??= {}
  c.cards[pc.physicalId] = pc
  return pc
}

export function physicalById(c: CampaignState, physicalId: string): PhysicalCard | undefined {
  return c.cards?.[physicalId]
}

/** Find the physical card whose PRINTED face matches (unique per campaign). */
export function physicalByPrinted(c: CampaignState, logicalId: string): PhysicalCard | undefined {
  return Object.values(c.cards ?? {}).find(pc => logicalOf(pc.printed) === logicalId)
}

/**
 * Compat shim: resolve a logical id (`${suit}${rank}`) by EFFECTIVE face — how
 * the legacy systems (cardTokens, ownedCards, client token maps) see cards.
 */
export function physicalByLogical(c: CampaignState, logicalId: string): PhysicalCard | undefined {
  return Object.values(c.cards ?? {}).find(pc => logicalOf(effectiveFace(pc)) === logicalId)
}

/** Register a logical (printed) card if it has no physical entry yet. */
export function registerLogicalCard(c: CampaignState, logicalId: string): PhysicalCard {
  const existing = physicalByPrinted(c, logicalId)
  if (existing) return existing
  return mintPhysicalCard(c, { suit: logicalId[0]!, rank: logicalId.slice(1) })
}

/**
 * Idempotent registry sync: every card the run owns has a physical entry —
 * the A–5 small start plus everything in ownedCards. Called at deck setup, at
 * each recruit site, and on legacy-save migration. Ascending-deck only.
 */
export function syncCardRegistry(c: CampaignState) {
  if (!EXPERIMENTS.ascendingDeck) return
  for (const suit of SUITS)
    for (const rank of START_RANKS) registerLogicalCard(c, `${suit}${rank}`)
  for (const id of c.ownedCards ?? []) registerLogicalCard(c, id)
}

// ── Grafts (replacement semantics — V3 §1) ───────────────────────────────────

/** Record a replacement graft. Returns an error string or null (stampToken style). */
export function applyGraft(
  c: CampaignState, physicalId: string, kind: GraftRecord['kind'], to: string, source: string,
): string | null {
  const pc = physicalById(c, physicalId)
  if (!pc) return 'Unknown card.'
  if (kind === 'suit' && !(SUITS as readonly string[]).includes(to)) return 'Invalid suit.'
  if (kind === 'rank' && !GRAFT_RANKS.includes(to)) return 'Rank grafts are capped at 10.'
  const cur = effectiveFace(pc)
  const from = kind === 'suit' ? cur.suit : cur.rank
  if (from === to) return 'That graft would change nothing.'
  pc.grafts.push({ seq: nextSeq(c), kind, from, to, source })
  return null
}

/**
 * Sanctum: move a graft between cards WITHOUT losing the card underneath.
 * The record keeps its kind/to/source; `from` re-anchors to the new host's
 * current effective value; the old host's face re-derives from what remains.
 */
export function moveGraft(
  c: CampaignState, fromPhysicalId: string, seq: number, toPhysicalId: string,
): string | null {
  const src = physicalById(c, fromPhysicalId)
  if (!src) return 'Unknown source card.'
  const dst = physicalById(c, toPhysicalId)
  if (!dst) return 'Unknown target card.'
  if (fromPhysicalId === toPhysicalId) return 'Choose two different cards.'
  const idx = src.grafts.findIndex(g => g.seq === seq)
  if (idx < 0) return 'No such graft on that card.'
  const g = src.grafts[idx]!
  const dstFace = effectiveFace(dst)
  const from = g.kind === 'suit' ? dstFace.suit : dstFace.rank
  if (from === g.to) return 'That graft would change nothing on the target.'
  src.grafts.splice(idx, 1)
  dst.grafts.push({ ...g, seq: nextSeq(c), from })
  return null
}

// ── Migration + projection ───────────────────────────────────────────────────

/** Forward-migrate a loaded save to the current schema (store.loadCampaign).
 * v1 → v2 builds the registry from the legacy logical-id fields; a mid-run
 * deck keeps its old runtime ids until the next setupChapterDeck rebuild —
 * lookups meanwhile resolve through physicalByLogical. */
export function migrateCampaign(c: CampaignState): CampaignState {
  if ((c.schemaVersion ?? 1) < 2) {
    syncCardRegistry(c)
    c.schemaVersion = CAMPAIGN_SCHEMA_VERSION
  }
  return c
}

/** Client projection: printed vs effective (+ provenance) per physical card. */
export function projectPhysicalCards(c: CampaignState): Record<string, ClientPhysicalCard> | undefined {
  if (!c.cards) return undefined
  const out: Record<string, ClientPhysicalCard> = {}
  for (const pc of Object.values(c.cards)) {
    out[pc.physicalId] = {
      physicalId: pc.physicalId,
      printed: { ...pc.printed },
      effective: effectiveFace(pc),
      grafts: pc.grafts.map(g => ({ kind: g.kind, from: g.from, to: g.to, source: g.source })),
    }
  }
  return Object.keys(out).length ? out : undefined
}
