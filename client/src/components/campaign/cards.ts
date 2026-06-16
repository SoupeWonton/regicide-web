import type { Card, ClientToken } from '../../types'

export function logicalId(c: { suit: string; rank: string }): string {
  return `${c.suit}${c.rank}`
}

/** Tokens stamped on a card, from a projected cardTokens map. */
export function tokensOf(
  map: Record<string, ClientToken[]> | undefined,
  c: { suit: string; rank: string },
): ClientToken[] {
  return map?.[logicalId(c)] ?? []
}

export function tokenToneClass(tone: ClientToken['tone']): string {
  return tone === 'good' ? 'bg-success/25 text-success border-success/50'
    : tone === 'bad' ? 'bg-error/25 text-error border-error/50'
    : 'bg-info/20 text-info border-info/50'
}

// ── Token-aware play math (mirrors server campaign/tokens.ts for the preview) ──

/** Played-value delta from value tokens (Hone +1, Temper +2, Undercut −1, …). */
export function tokenSpend(tokens: ClientToken[]): number {
  return tokens.reduce((s, t) => s + (t.spend ?? 0), 0)
}

/** Suits a card actually fires: base (or transmuted) suit + any grafted suits. */
export function effectiveSuits(card: { suit: string }, tokens: ClientToken[]): string[] {
  let base = card.suit
  const adds: string[] = []
  for (const t of tokens) if (t.kind === 'suit' && t.suit) {
    if (t.suitOp === 'replace') base = t.suit
    else adds.push(t.suit)
  }
  return [base, ...adds]
}

export function cardValue(rank: string): number {
  if (rank === 'A') return 1
  if (rank === 'Jo') return 0
  if (rank === 'J') return 10
  if (rank === 'Q') return 15
  if (rank === 'K') return 20
  return parseInt(rank) || 0
}

export function suitSymbol(suit: string): string {
  return { C: '♣', D: '♦', H: '♥', S: '♠' }[suit] ?? suit
}

export function suitColor(suit: string): string {
  return suit === 'H' || suit === 'D' ? 'text-red-400' : 'text-base-content'
}

// Proper card-face suit colors (matches the in-fight deck viewer): red pips for
// hearts/diamonds, dark pips for spades/clubs — readable on the light card face.
export function suitClass(suit: string): string {
  return suit === 'H' || suit === 'D' ? 'suit-red' : 'suit-black'
}

export function cardLabel(c: Card): string {
  if (c.rank === 'Jo') return '🃏'
  return `${c.rank}${suitSymbol(c.suit)}`
}

export const CLASS_ICONS: Record<string, string> = {
  sentinel: '🛡', quartermaster: '📦', surgeon: '⚕️', executioner: '🪓',
  commander: '⚜️', warden: '🏮', gambler: '🎲', exile: '🔥', oracle: '🔮',
}

export const NODE_ICONS: Record<string, string> = {
  start: '🏁', camp: '🏕', boss: '👑', skirmish: '⚔️', veteran: '🗡',
  elite: '💀', forge: '⚒️', abbey: '✨', market: '🐫', tower: '🗼',
  shrine: '⛩', lair: '🕸', event: '🎭', recruit: '🪖', draft: '🃏', unknown: '❓',
}

export const NODE_LABELS: Record<string, string> = {
  start: 'Trailhead', camp: 'Camp', boss: 'The Castle', skirmish: 'Skirmish',
  veteran: 'Veterans', elite: 'Elite', forge: 'Forge', abbey: 'Sanctum',
  market: 'Caravan', tower: 'Tower', shrine: 'Shrine', lair: 'Lair',
  event: 'Event', recruit: 'Recruit', draft: 'Draft', unknown: '???',
}

// ascending-deck Step 5 — client mirror of the locked class level-1 signatures
// (server: content.ts CLASS_SIGNATURES + SIGNATURE_CARDS). Used by ClassSelect to
// show "which cards a class stamps" before you pick (select-by-cards UX).
export interface SigStamp { card: string; short: string; tone: 'good' | 'bad' | 'neutral'; name: string }
function stamp(cardId: string, short: string, tone: SigStamp['tone'], name: string): SigStamp {
  const suit = cardId[0]!
  const rank = cardId.slice(1)
  return { card: `${rank}${suitSymbol(suit)}`, short, tone, name }
}
export const CLASS_SIGNATURE_PREVIEW: Record<string, SigStamp[]> = {
  sentinel:      [stamp('S3', '♠+1', 'neutral', 'Plate'), stamp('S4', '♠+1', 'neutral', 'Plate'), stamp('S5', '♠+1', 'neutral', 'Plate')],
  quartermaster: [stamp('D3', '♦+1', 'neutral', 'Provision'), stamp('D4', '♦+1', 'neutral', 'Provision'), stamp('D5', '♦+1', 'neutral', 'Provision')],
  surgeon:       [stamp('H3', '♥+1', 'neutral', 'Mend'), stamp('H4', '♥+1', 'neutral', 'Mend'), stamp('H5', '♥+1', 'neutral', 'Mend')],
  executioner:   [stamp('C4', '♣+2', 'neutral', 'Edge'), stamp('C5', '♣+2', 'neutral', 'Edge'), stamp('C2', '−1', 'bad', 'Undercut')],
  commander:     [stamp('D3', '⚑', 'neutral', 'Banner'), stamp('S4', '⚑', 'neutral', 'Banner'), stamp('C5', '⚑', 'neutral', 'Banner')],
  warden:        [stamp('S2', '⛨+2', 'good', 'Bulwark-weave'), stamp('H2', '⛨+2', 'good', 'Bulwark-weave'), stamp('C3', '⛨+2', 'good', 'Bulwark-weave')],
  gambler:       [stamp('D5', '+2/−1', 'good', 'Glasswork'), stamp('C5', '+2/−1', 'good', 'Glasswork'), stamp('H4', '✦+2', 'neutral', 'Mark')],
  exile:         [stamp('S5', '→♠', 'neutral', 'Transmute'), stamp('C5', '→♣', 'neutral', 'Transmute')],
  oracle:        [stamp('D2', '👁', 'neutral', 'Scry'), stamp('D3', '👁', 'neutral', 'Scry'), stamp('S4', '✦+2', 'neutral', 'Mark')],
}

export const NODE_DESCRIPTIONS: Record<string, string> = {
  start: 'Where the lineage set out.',
  camp: 'Rest: the deck is reshuffled, hands redrawn to full. Replace fallen heroes.',
  boss: 'The full castle — 12 royals. No retreat once a hero falls.',
  skirmish: 'A light fight (2 Jacks) with a minor twist. Your hand and deck carry over from the road.',
  veteran: 'A harder fight (Jacks + a Queen) with a nastier twist.',
  elite: 'A dangerous fight (Jack, Queen, King) with a punishing rule.',
  forge: 'The Forge: stamp tokens onto your cards (spends forge budget).',
  abbey: 'The Sanctum: take one of two spells — or pay the rite (spend your deck’s top 2) for a rare.',
  market: 'The Caravan: take one of two relics — or strike a dark deal (curse 3 cards) for a rare.',
  tower: 'The Tower: study the road for boss intel, and brace for the next fight.',
  shrine: 'The Shrine: lift a curse from one of your cards (or a blessing if you carry none).',
  lair: 'An elite gate guards a rare prize. High risk, rare reward.',
  event: 'A strange happening on the road. A choice with real consequences — fortune, bargains, or chaos.',
  recruit: 'A number-enemy fight. An exact kill recruits the card into your deck; otherwise it arrives later via backfill.',
  draft: 'Steer your deck: pick an unowned tier card — each option comes with an immediate tempo burst.',
  unknown: 'Unscouted. You will only know what it is once you commit.',
}
