// V3 §2 — class progression content: Staffs (selectable passives) and suit-path
// ladders. Roster locked 2026-06-28 (docs/wiki/v3/classes/facet-and-linear-candidates.md);
// semantics pinned in docs/delivery/contracts/staffs-and-ladders.md (Decision 9).
// V3.0 lights the 16 Staffs + each class's HOME-suit C2 rung; C3/C4 rungs and
// non-home paths ship as data (visible-but-locked).

import type { ClassId } from './types'

export interface StaffDef {
  id: string
  classId: ClassId       // which class offers it at class-select
  name: string
  text: string           // player-facing rule (pinned contract wording)
  activated?: boolean    // needs the staff_use action (vs always-on / automatic)
  usesCard?: boolean     // staff_use takes a hand-card index
}

export interface LadderDef {
  id: string
  classId: ClassId
  suit: string           // the payoff axis (S/H/D/C)
  name: string
  theme: string          // "block → survival" etc.
  c2: string             // rung texts (C2 live in V3.0; C3/C4 locked data)
  c3: string
  c4: string
}

// ── Staffs (16) ───────────────────────────────────────────────────────────────

export const STAFFS: StaffDef[] = [
  // Sentinel — Block
  { id: 'hold-the-line', classId: 'sentinel', name: 'Hold the Line', activated: true,
    text: 'Once per enemy: replay your highest Spade from the discard for shield only (it stays in the discard; no damage, no recovery).' },
  { id: 'reinforce', classId: 'sentinel', name: 'Reinforce',
    text: 'Add ONE Spade of any rank to a combo, still under the ≤10 combo limit.' },
  { id: 'footwork', classId: 'sentinel', name: 'Footwork', activated: true, usesCard: true,
    text: 'Once per enemy: bury a Spade from your hand to the Tavern bottom and draw 1.' },
  { id: 'parry', classId: 'sentinel', name: 'Parry', activated: true, usesCard: true,
    text: 'Once per enemy: after an attack, discard a Spade from hand — it lowers the enemy\'s attack by that amount.' },
  // Executioner — Kill
  { id: 'steady-hand', classId: 'executioner', name: 'Steady Hand', activated: true,
    text: 'Toggle before a play: your next play does NOT double Club damage (base value — control your total to land the exact).' },
  { id: 'whetstone', classId: 'executioner', name: 'Whetstone',
    text: 'Once per enemy: an attack that overshoots by 1–2 is shaved down to the exact kill automatically.' },
  { id: 'bloodletting', classId: 'executioner', name: 'Bloodletting', activated: true, usesCard: true,
    text: 'Once per enemy: discard a card to add HALF its value (rounded down) to your next attack this fight.' },
  { id: 'field-promotion', classId: 'executioner', name: 'Field Promotion',
    text: 'A card you recruit enters your HAND instead of the Tavern (hand-cap permitting).' },
  // Quartermaster — Combine
  { id: 'dovetail', classId: 'quartermaster', name: 'Dovetail',
    text: 'Your combos may include ONE card of adjacent rank (±1), still under the combo limit.' },
  { id: 'ace-in-the-hole', classId: 'quartermaster', name: 'Ace in the Hole', activated: true,
    text: 'Toggle before a play: your next Ace acts as the value of the card it combos with (instead of adding just +1).' },
  { id: 'stockpile', classId: 'quartermaster', name: 'Stockpile', activated: false,
    text: 'Once per enemy: keep one EXTRA card from an overdraw pool (exceed your hand cap by 1).' },
  { id: 'provisioner', classId: 'quartermaster', name: 'Provisioner', activated: true, usesCard: true,
    text: 'Once per enemy: discard a card, then draw 1 (dig one card deep).' },
  // Surgeon — Persist
  { id: 'triage', classId: 'surgeon', name: 'Triage',
    text: 'Your recoveries return any cards of your choice from the discard (instead of the oldest).' },
  { id: 'last-rites', classId: 'surgeon', name: 'Last Rites',
    text: 'Once per enemy: choose any card of your recovery to go straight to your HAND instead of the Tavern.' },
  { id: 'transfuse', classId: 'surgeon', name: 'Transfuse', activated: true,
    text: 'Toggle before a play, once per enemy: your next Heart skips its recovery and adds its value as SHIELD instead.' },
  { id: 'field-dressing', classId: 'surgeon', name: 'Field Dressing',
    text: 'Once per enemy: your first recovery recovers 1 extra card.' },
]

// ── Suit-path ladders (16) ────────────────────────────────────────────────────

export const LADDERS: LadderDef[] = [
  // Sentinel — what blocking gives
  { id: 'bastion', classId: 'sentinel', suit: 'S', name: 'Bastion', theme: 'block → survival',
    c2: 'Excess Spade shield beyond the enemy’s attack carries to the next enemy: 1 shield per excess Spade card.',
    c3: '3 shield per excess Spade card carried forward.',
    c4: 'Carry forward half each excess Spade’s value — over-block is never wasted.' },
  { id: 'vigil', classId: 'sentinel', suit: 'H', name: 'Vigil', theme: 'block → recycle',
    c2: 'Once per enemy, reclaim a Spade you blocked with to hand (it can’t block again this fight).',
    c3: 'Cover a block shortfall from the Tavern top (up to 5) instead of your hand.',
    c4: 'You never discard from hand to block — all shortfall comes off the Tavern top.' },
  { id: 'fortress', classId: 'sentinel', suit: 'D', name: 'Fortress', theme: 'block → cards',
    c2: 'Fully block (net 0) → draw 1.',
    c3: 'Draw 1 per 5 excess shield beyond the attack.',
    c4: 'Start of turn, draw 1 per 5 shield active.' },
  { id: 'thornline', classId: 'sentinel', suit: 'C', name: 'Thornline', theme: 'block → damage',
    c2: 'Fully block → deal 3.',
    c3: 'Fully block → deal half your shield value.',
    c4: 'Every Spade card deals double damage to the enemy.' },
  // Executioner — what the kill gives
  { id: 'bloodward', classId: 'executioner', suit: 'S', name: 'Bloodward', theme: 'overkill → survival',
    c2: 'An overkill grants shield equal to the overkill amount (max 5) against the next enemy.',
    c3: 'The overkill shield is uncapped.',
    c4: 'The overkill shield is doubled.' },
  { id: 'harvest', classId: 'executioner', suit: 'H', name: 'Harvest', theme: 'Clubs → recycle',
    c2: 'Each Club you play also shuffles 1 card from your discard into the Tavern.',
    c3: '2 cards per Club.',
    c4: 'Cards equal to half the Club’s value.' },
  { id: 'reaper', classId: 'executioner', suit: 'D', name: 'Reaper', theme: 'kill → cards',
    c2: 'An exact kill draws 1.',
    c3: 'An exact kill lets you look at the top 5 and draw 2.',
    c4: 'An exact kill returns its card to your hand, plus look at the top 5 and draw 2.' },
  { id: 'conscript', classId: 'executioner', suit: 'C', name: 'Conscript', theme: 'kill → deck-quality',
    c2: 'An exact kill recruits the card straight to your HAND.',
    c3: '…and the graft applies BOTH properties (rank and suit).',
    c4: '…and you may graft any card — in hand or the Tavern — applying both properties.' },
  // Quartermaster — what a big combine gives
  { id: 'rationing', classId: 'quartermaster', suit: 'S', name: 'Rationing', theme: 'payment → survival',
    c2: 'When you pay an attack, the FIRST card discarded counts as double its value.',
    c3: 'The first two cards discarded count double.',
    c4: 'You may pay attacks from the top of the Tavern instead of your hand.' },
  { id: 'requisition', classId: 'quartermaster', suit: 'H', name: 'Requisition', theme: 'combine → recycle',
    c2: 'When you play a combo, one of its cards goes to the top of the library instead of the discard.',
    c3: 'A combo you discard goes to the top of the Tavern instead of the discard.',
    c4: 'Once per enemy, search the discard or library for cards that complete a combo.' },
  { id: 'depot', classId: 'quartermaster', suit: 'D', name: 'Depot', theme: 'combine → cards',
    c2: 'Hand size +2.',
    c3: 'Hand size +2; playing a combo draws 1.',
    c4: 'Hand size +2; playing a combo lets you look at the top 5 and draw 2.' },
  { id: 'munitions', classId: 'quartermaster', suit: 'C', name: 'Munitions', theme: 'hand size → damage',
    c2: 'Your first attack each turn deals +1 per 3 cards in hand.',
    c3: '+1 per 2 cards in hand.',
    c4: 'Add your full hand size to your first attack’s damage.' },
  // Surgeon — what a recovery gives
  { id: 'convalescence', classId: 'surgeon', suit: 'S', name: 'Convalescence', theme: 'recover → survival',
    c2: 'Each card you recover also grants 1 shield this fight.',
    c3: '3 shield per recovered card.',
    c4: 'Shield equal to half each recovered card’s value.' },
  { id: 'renewal', classId: 'surgeon', suit: 'H', name: 'Renewal', theme: 'discard → recycle',
    c2: 'When you discard 3+ cards to pay an attack, recover 1 (best discard card returns to the Tavern).',
    c3: '…and your first attack each fight sends its paid cards to the Tavern instead of the discard.',
    c4: 'EVERY attack sends paid cards to the bottom of the library instead of the discard.' },
  { id: 'lifeline', classId: 'surgeon', suit: 'D', name: 'Lifeline', theme: 'recover → cards',
    c2: 'When you recover, also draw 1.',
    c3: 'Recovering lets you look at the top 5 and draw 2.',
    c4: 'Cards you recover go straight to your hand instead of the Tavern.' },
  { id: 'sterilize', classId: 'surgeon', suit: 'C', name: 'Sterilize', theme: 'empty discard → damage',
    c2: 'Before the enemy attacks, if your discard is empty, deal 2.',
    c3: 'If your discard holds 1 or fewer, deal 3.',
    c4: 'Deal 5 − X, where X = cards in your discard.' },
]

// ── Lookups ───────────────────────────────────────────────────────────────────

/** Home suit per core class — the path whose C2 rung lights in V3.0. */
export const HOME_SUIT: Partial<Record<ClassId, string>> = {
  sentinel: 'S', executioner: 'C', quartermaster: 'D', surgeon: 'H',
}

export function staffsOf(classId: ClassId): StaffDef[] {
  return STAFFS.filter(st => st.classId === classId)
}

export function getStaff(id: string | undefined): StaffDef | undefined {
  return id ? STAFFS.find(st => st.id === id) : undefined
}

export function laddersOf(classId: ClassId): LadderDef[] {
  return LADDERS.filter(l => l.classId === classId)
}

export function getLadder(id: string | undefined): LadderDef | undefined {
  return id ? LADDERS.find(l => l.id === id) : undefined
}

/** The ladder a class starts on (its home-suit path); undefined for non-core classes. */
export function homeLadder(classId: ClassId): LadderDef | undefined {
  const suit = HOME_SUIT[classId]
  return suit ? LADDERS.find(l => l.classId === classId && l.suit === suit) : undefined
}
