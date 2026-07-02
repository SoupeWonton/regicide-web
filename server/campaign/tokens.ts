// Ascending Deck — token effect helpers (Step 5).
// A token attaches to a *logical* card id (`${suit}${rank}`, e.g. 'S6'), so every
// instance of that card shares it. All effect math funnels through here so the
// engine sites stay thin. Design: docs/design/ascending-deck.md → "Tokens".

import type { Card } from '../types'
import type { CampaignState, ClientToken, Token } from './types'
import { TOKEN_DEFS, getTokenDef } from './content'

export function logicalId(card: { suit: string; rank: string }): string {
  return `${card.suit}${card.rank}`
}

export function tokensFor(c: CampaignState, card: { suit: string; rank: string }): Token[] {
  return c.cardTokens?.[logicalId(card)] ?? []
}

function defsFor(c: CampaignState, card: { suit: string; rank: string }) {
  return tokensFor(c, card).map(t => ({ t, d: getTokenDef(t.defId) })).filter(x => x.d) as { t: Token; d: NonNullable<ReturnType<typeof getTokenDef>> }[]
}

/** Value delta applied when the card is PLAYED (offense + suit-lever size). */
export function spendDelta(c: CampaignState, card: Card): number {
  return defsFor(c, card).reduce((s, { d }) => s + (d.spend ?? 0), 0)
}

/** Value delta applied when the card is DISCARDED to soak a counterattack. */
export function holdDelta(c: CampaignState, card: Card): number {
  return defsFor(c, card).reduce((s, { d }) => s + (d.hold ?? 0), 0)
}

/** Effective suits a card fires: base (or transmuted) suit + any grafted suits. */
export function cardSuits(c: CampaignState, card: Card): Set<string> {
  let base = card.suit
  const adds: string[] = []
  for (const { t, d } of defsFor(c, card)) {
    if (d.kind === 'suit' && t.suit) {
      if (d.suitOp === 'replace') base = t.suit
      else if (d.suitOp === 'add') adds.push(t.suit)
    }
  }
  return new Set<string>([base, ...adds])
}

/** Count of lever tokens of a kind among played cards whose effective suits include `suit`. */
export function leverBonus(c: CampaignState, cards: Card[], lever: NonNullable<ReturnType<typeof getTokenDef>>['lever'], suit: string): number {
  let n = 0
  for (const card of cards) {
    if (!cardSuits(c, card).has(suit)) continue
    for (const { d } of defsFor(c, card)) if (d.kind === 'lever' && d.lever === lever) n++
  }
  return n
}

/** Flat damage from Mark tokens on the played cards (+2 each). */
export function markDamage(c: CampaignState, cards: Card[]): number {
  let n = 0
  for (const card of cards) for (const { d } of defsFor(c, card)) if (d.keyword === 'mark') n += 2
  return n
}

export function hasKeyword(c: CampaignState, cards: Card[], kw: NonNullable<ReturnType<typeof getTokenDef>>['keyword']): boolean {
  return cards.some(card => defsFor(c, card).some(({ d }) => d.keyword === kw))
}

// ── Forge application ────────────────────────────────────────────────────────

export const MAX_TOKENS_PER_CARD = 3

/** Validate + stamp a token onto a logical card id. Returns an error string or null. */
export function stampToken(c: CampaignState, cardId: string, token: Token): string | null {
  const d = getTokenDef(token.defId)
  if (!d) return 'Unknown token.'
  if (d.needsSuit && !token.suit) return 'This token needs a target suit.'
  c.cardTokens ??= {}
  const list = c.cardTokens[cardId] ?? []
  if (list.length >= MAX_TOKENS_PER_CARD) return `That card is full (max ${MAX_TOKENS_PER_CARD} tokens).`
  c.cardTokens[cardId] = [...list, token]
  return null
}

/**
 * §F shim: a replacement graft changed a card's effective logical id — move its
 * legacy token list to the new key so stamped tokens (class signatures, forge
 * marks) ride the physical card. If the new face already has tokens the lists
 * merge (two physical cards sharing an effective face share the legacy key —
 * an accepted interim wart until slice 9 rekeys tokens by physicalId).
 */
export function rekeyCardTokens(c: CampaignState, fromId: string, toId: string) {
  if (fromId === toId || !c.cardTokens) return
  const list = c.cardTokens[fromId]
  if (!list?.length) return
  delete c.cardTokens[fromId]
  c.cardTokens[toId] = [...(c.cardTokens[toId] ?? []), ...list]
}

// ── Client projection ────────────────────────────────────────────────────────

function tone(d: NonNullable<ReturnType<typeof getTokenDef>>): ClientToken['tone'] {
  if (d.kind === 'value') {
    const net = (d.spend ?? 0) + (d.hold ?? 0)
    return net > 0 ? 'good' : net < 0 ? 'bad' : 'neutral'
  }
  // graft (added suit), levers, and keywords are beneficial → green; transmute
  // (replaces the suit, a sidegrade) stays neutral.
  if (d.kind === 'suit') return d.suitOp === 'replace' ? 'neutral' : 'good'
  return 'good'
}

// One clear glyph per token type (the card-face symbol). Suit tokens show the
// resolved suit glyph instead (the grafted/transmuted suit must be visible).
const TOKEN_SYMBOLS: Record<string, string> = {
  hone: '⬆', temper: '⏫', undercut: '⬇',
  ballast: '⚓', glasswork: '💠', deadweight: '🪨',
  plate: '🛡', provision: '📦', mend: '✚', edge: '🗡',
  scry: '👁', mark: '✦', banner: '⚑', bloodprice: '🩸',
}
const SUIT_GLYPH: Record<string, string> = { C: '♣', D: '♦', H: '♥', S: '♠' }

export function projectToken(t: Token): ClientToken | null {
  const d = getTokenDef(t.defId)
  if (!d) return null
  // resolve the suit glyph into the short badge for suit tokens
  let short = d.short
  let sym = TOKEN_SYMBOLS[d.id] ?? d.short
  if (d.kind === 'suit' && t.suit) {
    const g = SUIT_GLYPH[t.suit] ?? t.suit
    short = d.suitOp === 'replace' ? `→${g}` : `+${g}`
    sym = g   // show the actual grafted/transmuted suit
  }
  return {
    defId: d.id, name: d.name, short, sym, kind: d.kind, suit: t.suit,
    spend: d.spend ?? 0, hold: d.hold ?? 0, suitOp: d.suitOp, lever: d.lever, keyword: d.keyword,
    tone: tone(d), text: d.text,
  }
}

/** Project the whole cardTokens map for the client. */
export function projectCardTokens(c: CampaignState): Record<string, ClientToken[]> | undefined {
  if (!c.cardTokens) return undefined
  const out: Record<string, ClientToken[]> = {}
  for (const [cardId, list] of Object.entries(c.cardTokens)) {
    const projected = list.map(projectToken).filter((t): t is ClientToken => t !== null)
    if (projected.length) out[cardId] = projected
  }
  return Object.keys(out).length ? out : undefined
}

/** Build the level-1 preview cardTokens for a class (for ClassSelect), without mutating state. */
export function previewSignature(cards: string[], tokens: Token[]): Record<string, ClientToken[]> {
  const out: Record<string, ClientToken[]> = {}
  for (let i = 0; i < cards.length && i < tokens.length; i++) {
    const ct = projectToken(tokens[i]!)
    if (!ct) continue
    ;(out[cards[i]!] ??= []).push(ct)
  }
  return out
}

export { TOKEN_DEFS }
