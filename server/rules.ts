import type { Rank, Suit } from './types'

// ── Hand & Jester setup ─────────────────────────────────────────────────────

export const PLAYER_SETUP: Record<number, { handSize: number; jesters: number }> = {
    1: { handSize: 8, jesters: 0 },
    2: { handSize: 7, jesters: 0 },
    3: { handSize: 6, jesters: 1 },
    4: { handSize: 5, jesters: 2 },
}

// ── Card values ─────────────────────────────────────────────────────────────

export const CARD_VALUE: Record<Rank, number> = {
    A: 1,
    '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    J: 10,
    Q: 15,
    K: 20,
    Jo: 0,
}

// ── Enemy stats ─────────────────────────────────────────────────────────────

export const ENEMY_STATS: Record<'J' | 'Q' | 'K', { hp: number; attack: number }> = {
    J: { hp: 20, attack: 10 },
    Q: { hp: 30, attack: 15 },
    K: { hp: 40, attack: 20 },
}

// ── Suit powers ─────────────────────────────────────────────────────────────

export const SUIT_POWER: Record<Suit, string> = {
    C: 'Double damage — base damage × 2.',
    S: 'Shield — add base damage to enemy shield (reduces enemy net attack).',
    H: 'Recover — move top N cards from discard back into the tavern (shuffled).',
    D: 'Draw — players draw cards clockwise up to hand limit until N cards drawn.',
}

// ── Combo rules ─────────────────────────────────────────────────────────────

/** Maximum combined value for a multi-card same-rank combo. */
export const MAX_COMBO_VALUE = 10

/** Ranks that may be paired with a single Ace. */
export const ACE_PAIR_ALLOWED = true   // any rank or suit

// ── Castle order ────────────────────────────────────────────────────────────

/** Face-card groups are shuffled within each tier then stacked J → Q → K. */
export const CASTLE_ORDER: Array<'J' | 'Q' | 'K'> = ['J', 'Q', 'K']

export const TOTAL_ENEMIES = 12   // 4 Jacks + 4 Queens + 4 Kings

// ── Win / lose ───────────────────────────────────────────────────────────────

/**
 * Win:  all 12 enemies defeated.
 * Lose: active player cannot cover net attack damage with cards in hand.
 */
export const WIN_CONDITION = 'All 12 enemies defeated.'
export const LOSE_CONDITION = 'Active player hand total < enemy net attack.'

// ── Exact-kill reward ────────────────────────────────────────────────────────

/**
 * Overkill  → enemy goes to discard pile.
 * Exact kill → enemy goes to bottom of tavern (draw pile).
 */
export const EXACT_KILL_REWARD = 'enemy placed at bottom of tavern'
export const OVERKILL_RESULT = 'enemy placed in discard pile'
