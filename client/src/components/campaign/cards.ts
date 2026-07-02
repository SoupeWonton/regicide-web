import type { Card, ClientToken, ClientPhysicalCard } from '../../types'

export function logicalId(c: { suit: string; rank: string }): string {
  return `${c.suit}${c.rank}`
}

// ── §F card-state (V3.0): printed vs effective display ──────────────────────

/** The physical card behind a runtime deck card (Card.id === physicalId). */
export function physicalOf(
  map: Record<string, ClientPhysicalCard> | undefined,
  card: { id: string },
): ClientPhysicalCard | null {
  return map?.[card.id] ?? null
}

/** True when the card's effective face differs from its printed face. */
export function isGrafted(pc: ClientPhysicalCard | null): boolean {
  return !!pc && (pc.printed.suit !== pc.effective.suit || pc.printed.rank !== pc.effective.rank)
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

/** Discard-soak delta (Ballast +1, …) — added to a card's value when paying a counter. */
export function tokenHold(tokens: ClientToken[]): number {
  return tokens.reduce((s, t) => s + (t.hold ?? 0), 0)
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
  shrine: '⛩', lair: '🕸', event: '🎭', recruit: '🪖', draft: '🃏',
  hunt: '🏹', heroes: '🪦', unknown: '❓',
}

export const NODE_LABELS: Record<string, string> = {
  start: 'Trailhead', camp: 'Camp', boss: 'The Gate', skirmish: 'Skirmish',
  veteran: 'Veterans', elite: 'Elite', forge: 'Forge', abbey: 'Sanctum',
  market: 'Caravan', tower: 'Tower', shrine: 'Shrine', lair: 'Lair',
  event: 'Event', recruit: 'Recruit', draft: 'Draft',
  hunt: 'Hunt', heroes: 'Fallen Heroes', unknown: '???',
}

// ── V3 §2 — client mirror of the Staff roster (server: campaign/paths.ts) ────
// ClassSelect offers the class's four at pick time; EncounterBoard shows the
// activation button for the activated ones.
export interface StaffChoice { id: string; name: string; text: string; activated?: boolean; usesCard?: boolean }
export const STAFF_CHOICES: Record<string, StaffChoice[]> = {
  sentinel: [
    { id: 'hold-the-line', name: 'Hold the Line', activated: true, text: 'Once per enemy: replay your best discard Spade for shield only (it stays in the discard).' },
    { id: 'reinforce', name: 'Reinforce', text: 'Combos may include ONE Spade of adjacent rank (±1).' },
    { id: 'footwork', name: 'Footwork', activated: true, usesCard: true, text: 'Once per enemy: bury a hand Spade to the Tavern bottom, draw 1.' },
    { id: 'parry', name: 'Parry', activated: true, usesCard: true, text: 'Once per enemy, while paying a counter: a hand Spade blocks (its value reduces the payment).' },
  ],
  executioner: [
    { id: 'steady-hand', name: 'Steady Hand', activated: true, text: 'Toggle: your next play does NOT double Clubs — control the total, land the exact.' },
    { id: 'whetstone', name: 'Whetstone', text: 'Once per enemy: a 1–2 overshoot is shaved to the exact kill automatically.' },
    { id: 'bloodletting', name: 'Bloodletting', activated: true, usesCard: true, text: 'Once per enemy: discard a card to add HALF its value to your next attack.' },
    { id: 'field-promotion', name: 'Field Promotion', text: 'Recruits enter your HAND instead of the Tavern.' },
  ],
  quartermaster: [
    { id: 'dovetail', name: 'Dovetail', text: 'Combos may include ONE card of adjacent rank (±1).' },
    { id: 'ace-in-the-hole', name: 'Ace in the Hole', activated: true, text: 'Toggle: your next Ace pair copies its partner’s rank.' },
    { id: 'stockpile', name: 'Stockpile', text: 'Once per enemy: keep one EXTRA card from an overdraw pool.' },
    { id: 'provisioner', name: 'Provisioner', activated: true, usesCard: true, text: 'Once per enemy: discard a card, then draw 1.' },
  ],
  surgeon: [
    { id: 'triage', name: 'Triage', text: 'Your recoveries return the HIGHEST-value cards from the discard.' },
    { id: 'last-rites', name: 'Last Rites', text: 'Once per enemy: the best recovered card goes straight to your HAND.' },
    { id: 'transfuse', name: 'Transfuse', activated: true, text: 'Toggle, once per enemy: your next Heart shields instead of recovering.' },
    { id: 'field-dressing', name: 'Field Dressing', text: 'Once per enemy: your first recovery recovers 1 extra card.' },
  ],
}

// (CLASS_SIGNATURE_PREVIEW was deleted with the class signatures at the V3.0
// cutover — class identity is the Staff pick + the home-suit path.)

export const NODE_DESCRIPTIONS: Record<string, string> = {
  start: 'Where the lineage set out.',
  camp: 'Camp: your discard reshuffles into the Tavern, hands top up to 5, and the next fight opens with 10 block and a doubled first strike.',
  boss: 'The full castle — 12 royals. No retreat once a hero falls.',
  skirmish: 'A light fight (2 Jacks) with a minor twist. Your hand and deck carry over from the road.',
  veteran: 'A harder fight (Jacks + a Queen) with a nastier twist.',
  elite: 'A dangerous fight (Jack, Queen, King) with a punishing rule.',
  forge: 'The Forge: forge sandbagged fragments into the next crystal tier (Fragment → Half).',
  abbey: 'The Sanctum — Rearrange: relocate up to two grafts between your cards. No new power, pure redistribution.',
  market: 'The Caravan: a relic for a visible price — pay the discard-total from your hand. No wallet.',
  tower: 'The Tower: study the road for boss intel, and brace for the next fight.',
  shrine: 'The Shrine — Consecrate: permanently transmute one owned card’s suit or rank. No kill required.',
  lair: 'The Lair: a dangerous raid — win it and claim a relic for your bag.',
  event: 'A strange happening on the road. A choice with real consequences — fortune, bargains, or chaos.',
  recruit: 'A number-enemy fight. An exact kill recruits the card into your deck; otherwise it arrives later via backfill.',
  draft: 'Steer your deck: pick an unowned tier card — each option comes with an immediate tempo burst.',
  hunt: 'The Hunt: pick a recruit you missed and track it down — an exact kill still recruits it.',
  heroes: 'The Fallen Heroes: trade your Staff for a fallen champion’s — one random Staff per class, free.',
  unknown: 'Unscouted. You will only know what it is once you commit.',
}
