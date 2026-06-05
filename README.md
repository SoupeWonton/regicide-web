# Regicide Web — Beta

An unofficial digital multiplayer adaptation of [Regicide](https://www.badgersfrommars.com/regicide) by Badgers from Mars. Play in your browser, real-time, with 1–4 players.

> **This is a beta.** Expect rough edges, missing polish, and possible bugs. The core game loop is functional.

---

## How to Run

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm run install:all
```

This installs dependencies for both the server and the client.

### Start

```bash
npm run dev
```

Starts the game server on port `3001` and the Vite dev server on port `5173`. Open [http://localhost:5173](http://localhost:5173) in your browser.

To play with others on your local network, share your machine's local IP at port `5173` (e.g. `http://192.168.x.x:5173`). The Vite proxy handles all WebSocket traffic through port 5173 — no extra firewall rules needed.

---

## Game Rules

Regicide is a cooperative card game. All players work together to defeat 12 face-card enemies — 4 Jacks, 4 Queens, and 4 Kings — using the rest of a standard deck. You win by defeating all 12. You lose if any player can't pay the damage from a counterattack.

---

### Setup

**Enemy deck (the Castle):**
The 12 face cards are arranged in a fixed order: Jacks first, then Queens, then Kings — each group shuffled randomly within itself. Enemies are revealed one at a time, starting with a Jack.

**Player deck (the Tavern):**
The remaining 40 cards (Ace through 10 in all four suits) plus Jesters are shuffled and dealt to players as their starting hand.

| Players | Hand size | Jesters |
|---------|-----------|---------|
| 1       | 8         | 0       |
| 2       | 7         | 0       |
| 3       | 6         | 1       |
| 4       | 5         | 2       |

Undealt cards form the tavern (draw pile). The discard pile starts empty.

---

### Card Values

| Card | Value |
|------|-------|
| A    | 1     |
| 2–10 | Face value |
| Jester | 0  |
| Jack (enemy) | 10 |
| Queen (enemy) | 15 |
| King (enemy) | 20 |

---

### Enemy Stats

| Enemy | HP | Attack |
|-------|----|--------|
| Jack  | 20 | 10     |
| Queen | 30 | 15     |
| King  | 40 | 20     |

---

### On Your Turn

#### 1. Play phase

You must play one or more cards from your hand, or yield.

**Legal combos:**
- Any single card
- An Ace paired with exactly one other card (any rank or suit)
- Multiple cards of the same rank, as long as their total value is **10 or less**
- Jesters must be played alone

**Dealing damage:**
Add up the face values of all cards played. That total is the base damage dealt to the current enemy.

---

#### 2. Suit Powers

Each suit has a special power that triggers when you play a card of that suit. However, the enemy is **immune to its own suit's power** — that power is blocked if any of your played cards match the enemy's suit.

| Suit | Power |
|------|-------|
| ♣ Clubs | **Double damage.** The base damage is multiplied by 2. |
| ♠ Spades | **Shield.** Add the base attack value to the enemy's shield. The shield permanently reduces the enemy's attack (net attack = enemy ATK − shield). Shields accumulate across turns. |
| ♥ Hearts | **Recover.** Move the top N cards from the discard pile back into the tavern (shuffled in), where N equals the base attack value. |
| ♦ Diamonds | **Draw.** Starting with you and going clockwise, players draw cards up to their hand limit until N cards have been drawn total. |

If you play a mixed-suit combo, all applicable powers trigger. The Clubs damage multiplier applies to the combined total of the entire combo.

---

#### 3. Enemy Counterattack

After you play:

- If the enemy's HP drops to **exactly 0**: the enemy card is placed at the bottom of the tavern (draw pile). Exact kills are rewarded.
- If the enemy's HP drops **below 0** (overkill): the enemy card goes to the discard pile.
- If the enemy is **still alive**: the enemy counterattacks.

**Net attack = enemy ATK − shield accumulated so far.**

If net attack is 0 (fully shielded), no damage is taken and the turn passes normally.

Otherwise, you enter the **discard phase**: you must discard cards from your hand whose total value is **greater than or equal to** the net attack. If the sum of all cards in your hand is less than the net attack, the game is over — you lose.

---

#### 4. Yield

You may choose to yield instead of playing cards. You skip the attack phase but still take the full counterattack. Useful when you have no legal plays worth making.

---

### Jester

Jesters are wildcards played alone. When played:
- The enemy's suit immunity is **nullified** for this turn (all suit powers work regardless of the enemy's suit)
- The enemy does **not** counterattack
- You get to **choose which player goes next** (including yourself)

---

### Drawing Cards

Players do not draw at the start of their turn. Cards are drawn via the ♦ Diamonds power. When the tavern runs out, the discard pile is shuffled and becomes the new tavern.

---

### Win & Lose Conditions

- **Win:** All 12 enemies defeated (all 4 Jacks, 4 Queens, and 4 Kings).
- **Lose:** The active player cannot cover the enemy's net attack damage with the cards remaining in their hand.

---

## Tech Stack

- **Server:** Node.js, Express, Socket.IO, TypeScript
- **Client:** Vue 3, Vite, TypeScript
- **Transport:** WebSocket (Socket.IO)

---

## Known Limitations (Beta)

- No persistent state — rooms are lost on server restart
- No reconnection recovery after a disconnect mid-game
- Single-player mode is untested
- No mobile-optimized layout
- No sound or animations
