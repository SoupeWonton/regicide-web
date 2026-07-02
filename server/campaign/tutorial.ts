// Scripted onboarding tutorial — a deterministic rail, not a fair fight.
// Fixed deck + fixed enemies with EXPLICIT hp/atk (we don't use rank×3 here, so
// every exact-kill is a single highlighted card and the math is guaranteed).
// Beat progress is tracked by cumulative flags (order-independent — playing a
// card early can't desync the guide), and off-script plays are bounced while a
// beat highlights a specific card. See docs/design/tutorial-onboarding-*.md.
import type { Card, Suit } from '../types'
import type { CampaignState, EncounterState } from './types'
import { registerLogicalCard } from './cards'

let seq = 0
const tc = (suit: Suit, rank: Card['rank']): Card => ({ suit, rank, id: `tut-${seq++}` })

// ── Scripted enemies (explicit stats; reward keys the recruit/graft lessons) ──
// reward: 'none'   → dies with no recruit/graft (a punching bag for suit lessons)
//         'recruit'→ unowned 6, exact-kill recruits it
//         'graft'  → owned ≤5, exact-kill grafts onto a hand card
//         'kill'   → royal Gatekeeper, just defeat it
export interface TutEnemy { suit: Suit; rank: Card['rank']; hp: number; atk: number; reward: 'none' | 'recruit' | 'graft' | 'kill' }
const ENEMY_DEFS: TutEnemy[] = [
  { suit: 'H', rank: '7', hp: 14, atk: 2, reward: 'none' },     // Bag: 4♥+2♣(×2)+3♦+6♠ = 17 ≥ 14 → dies on the ♠
  { suit: 'C', rank: '6', hp: 5,  atk: 2, reward: 'recruit' },  // exact-kill with 5♦ → recruit 6♣
  { suit: 'S', rank: '3', hp: 3,  atk: 2, reward: 'graft' },    // exact-kill with 3♥ → graft
  { suit: 'D', rank: 'J', hp: 12, atk: 3, reward: 'kill' },     // Gatekeeper — ♦-immune royal (survives the lesson plays so the finish beat shows)
]

export function tutorialEnemies(): Card[] {
  return ENEMY_DEFS.map(e => ({ suit: e.suit, rank: e.rank, id: `tut-foe-${e.suit}${e.rank}` }))
}
/** Explicit stats + reward for a revealed tutorial enemy (matched by suit+rank). */
export function tutorialEnemyMeta(card: Card): TutEnemy | undefined {
  return ENEMY_DEFS.find(e => e.suit === card.suit && e.rank === card.rank)
}

// ── Fixed deck ────────────────────────────────────────────────────────────────
// Hand carries the highlighted card for every beat; the rest is discard fodder.
// The "tools" — the cards each beat needs. Everything else is fodder you pay
// counters with. Keyed by suit+rank (the deck has no duplicate identities here).
const TOOL_IDS = new Set(['H4', 'C2', 'D3', 'S6', 'D5', 'S3', 'H2', 'D4', 'SA', 'CJo'])
export const isFodder = (cd: Card) => !TOOL_IDS.has(`${cd.suit}${cd.rank}`)

function tutorialHand(): Card[] {
  return [
    tc('H', '4'),   // attack (plain — no club-on-club optics)
    tc('C', '2'),   // ♣ double
    tc('D', '3'),   // ♦ draw
    tc('S', '6'),   // ♠ shield (Sentinel: all-Spade turn → +3 shield)
    tc('D', '5'),   // recruit finisher (exact 5 on the 6♣)
    tc('S', '3'),   // graft finisher (exact 3 on the 3♠ — non-♥ so it can't skip the Hearts beat)
    tc('H', '2'),   // ♥ recover (Gatekeeper)
    tc('D', '4'),   // ♦ played into the ♦-immune Gatekeeper — the immunity lesson (fizzles)
    tc('S', 'A'),   // Ace — pairs with any card
    tc('C', 'Jo'),  // Jester — break the seal + reload
    // discard fodder — the spares the Steward flashes when you must pay (♦ reloads more)
    tc('S', '2'), tc('D', '2'),
  ]
}
function tutorialTavern(): Card[] {
  // draws + more discard-to-pay fodder (all fodder; never a tool)
  return [
    tc('S', '5'), tc('C', '5'), tc('C', '4'), tc('D', '6'),
    tc('H', '5'), tc('H', '6'), tc('C', '3'), tc('S', '4'),
  ]
}

export function buildTutorialDeck(c: CampaignState) {
  const hands = c.heroes.map((_, i) => (i === 0 ? tutorialHand() : []))
  c.deck = { tavern: tutorialTavern(), discard: [], hands }
  // §F: register the fixed cards so the graft beat can rewrite one (the deck
  // has no duplicate faces, so printed-face registration is safe). Jesters
  // keep their script ids — they are not graftable.
  for (const cd of [...c.deck.tavern, ...hands.flat()])
    if (cd.rank !== 'Jo') cd.id = registerLogicalCard(c, `${cd.suit}${cd.rank}`).physicalId
}

// ── Beat runner ───────────────────────────────────────────────────────────────
// Each beat: a guide line, the card to highlight, and the flag that retires it.
// Flags are set cumulatively (see advanceTutorialStep) so progress never desyncs.
// `gate` beats reject any play that isn't the highlighted card (deterministic rail);
// the Gatekeeper beats are un-gated (free play, the royal needs no exact kill).
interface TutorialBeat {
  line: string
  highlight?: { suit?: Suit; rank?: Card['rank'] }
  flag: string            // retire the beat once s.flags[flag] is set
  gate?: boolean          // hard-gate: only the highlighted card may be played
}

const BEATS: TutorialBeat[] = [
  { line: 'Strike — play the highlighted card. Its number is the wound.', highlight: { suit: 'H', rank: '4' }, flag: 'tut.attacked', gate: true },
  { line: 'It hits back. Pay the blow with the flashing spare cards — never one you need.', flag: 'tut.discarded' },
  { line: '♣ Clubs strike for double. Play it.', highlight: { suit: 'C', rank: '2' }, flag: 'tut.played.C2', gate: true },
  { line: '♦ Diamonds draw — refill your hand before you pay.', highlight: { suit: 'D', rank: '3' }, flag: 'tut.played.D3', gate: true },
  { line: '♠ Spades shield — blunt the next blow. Block now, pay less.', highlight: { suit: 'S', rank: '6' }, flag: 'tut.played.S6', gate: true },
  { line: 'An exact kill recruits the card. Hit this one for exactly 5 — it joins your deck.', highlight: { suit: 'D', rank: '5' }, flag: 'tut.recruited', gate: true },
  { line: 'Kill a card you already own and you graft instead — rewrite one held card’s value or suit to the slain card’s. Permanent.', highlight: { suit: 'S', rank: '3' }, flag: 'tut.grafted', gate: true },
  { line: '♥ Hearts recover spent cards from the discard — this is why you never run dry.', highlight: { suit: 'H', rank: '2' }, flag: 'tut.played.H2', gate: true },
  { line: 'An Ace pairs with any card, adding its value. Play it before the seal falls.', highlight: { rank: 'A' }, flag: 'tut.played.SA', gate: true },
  { line: 'The Gatekeeper is a crown — it seals ♦. Play your Diamond and watch its draw fizzle.', highlight: { suit: 'D', rank: '4' }, flag: 'tut.played.D4', gate: true },
  { line: 'The Jester answers to no crown — play it to shatter the seal and reload your hand.', highlight: { rank: 'Jo' }, flag: 'tut.played.CJo', gate: true },
  { line: 'Now bring the Gatekeeper home.', flag: 'tut.won' },
]

/** Record the suits/cards just played as cumulative flags. Called from
 *  applyEncounterPlay BEFORE a kill can clear s.lastPlayed (that erasure was the
 *  "stuck on the ♠ beat" bug — a killing play never set its suit flag). */
export function recordTutorialPlay(c: CampaignState, s: EncounterState, cards: Card[]) {
  if (!c.tutorial) return
  s.flags['tut.attacked'] = true
  // Key by EXACT card identity (suit+rank) so e.g. the 4♥ attack can't satisfy
  // the later "play the 2♥" Hearts beat.
  for (const cd of cards) s.flags[`tut.played.${cd.suit}${cd.rank}`] = true
}

/** Skip past every retired beat (flags are set by the play/discard/kill handlers). */
export function advanceTutorialStep(c: CampaignState, s: EncounterState) {
  if (!c.tutorial) return
  if (s.outcome === 'won') s.flags['tut.won'] = true
  s.tutorialStep ??= 0
  while (s.tutorialStep < BEATS.length - 1 && s.flags[BEATS[s.tutorialStep]!.flag]) s.tutorialStep++
}

function currentBeat(s: EncounterState): TutorialBeat {
  return BEATS[Math.min(s.tutorialStep ?? 0, BEATS.length - 1)]!
}
function highlightId(beat: TutorialBeat, hand: Card[]): string | undefined {
  const hl = beat.highlight
  if (!hl) return undefined
  return hand.find(cd =>
    (hl.suit === undefined || cd.suit === hl.suit) && (hl.rank === undefined || cd.rank === hl.rank))?.id
}

/** Hard-gate: while a gated beat is active, only its highlighted card may be played. */
export function tutorialBlocksPlay(c: CampaignState, s: EncounterState, hand: Card[], playedIds: string[]): string | undefined {
  if (!c.tutorial) return undefined
  const beat = currentBeat(s)
  if (!beat.gate || !beat.highlight) return undefined
  const wanted = highlightId(beat, hand)
  if (wanted && (playedIds.length !== 1 || playedIds[0] !== wanted))
    return 'Follow the Steward — play the highlighted card.'
  return undefined
}

/** Project the current beat for the client (guide line + which hand card to highlight). */
export function tutorialBeatProjection(c: CampaignState, s: EncounterState, hand: Card[]):
  { line: string; highlightCardId?: string; step: number; total: number } | undefined {
  if (!c.tutorial) return undefined
  const step = Math.min(s.tutorialStep ?? 0, BEATS.length - 1)
  const beat = BEATS[step]!
  return { line: beat.line, highlightCardId: highlightId(beat, hand), step, total: BEATS.length }
}

/** During discard-to-pay, the fodder card ids the client should flash (safe to pay with). */
export function tutorialDiscardHints(c: CampaignState, s: EncounterState, hand: Card[]): string[] | undefined {
  if (!c.tutorial || s.turnPhase !== 'discard') return undefined
  return hand.filter(isFodder).map(cd => cd.id)
}

/** Replacement grafts rewrite a card's FACE — on the rail that could destroy a
 * tool a later beat needs (e.g. the 2♥ Hearts lesson). Only fodder may take
 * the tutorial's graft. */
export function tutorialBlocksGraft(c: CampaignState, target: Card): string | undefined {
  if (!c.tutorial) return undefined
  if (!isFodder(target)) return 'Graft onto a spare card — the Steward needs your tools intact.'
  return undefined
}

/** Block paying a counter with a needed tool card — unless no fodder is left (never softlock). */
export function tutorialBlocksDiscard(c: CampaignState, hand: Card[], discarded: Card[]): string | undefined {
  if (!c.tutorial) return undefined
  if (hand.some(isFodder) && discarded.some(cd => !isFodder(cd)))
    return 'Pay with the spare cards the Steward is flashing — keep the ones you need.'
  return undefined
}
