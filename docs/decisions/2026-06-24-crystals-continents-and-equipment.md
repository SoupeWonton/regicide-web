---
kind: decision
edition: v3
status: accepted
date: 2026-06-24
questions: [Q11]
supersedes: [2026-06-22-spell-and-relic-models]
amends: [2026-06-20-five-act-continuous-expedition]
---

# Design decision — crystals, continents, and equipment *(the V3 direction)*

> **Status: accepted.** This record promotes the spell/relic *proposed-design* pass into the
> committed direction for V3, and resolves it with the campaign and class models. It
> **supersedes** [`2026-06-22-spell-and-relic-models.md`](2026-06-22-spell-and-relic-models.md)
> (the silver/gold/purple spell tier and the slotless-relic model are replaced) and **amends**
> [`2026-06-20-five-act-continuous-expedition.md`](2026-06-20-five-act-continuous-expedition.md)
> (the five act *purposes* are retained as the pressure skeleton; a continent + God of Luck lore
> layer is laid over them). Source: 2026-06-24 Landry design-session notes
> (`../wiki/v3/spells/proposed-design/Notes from Design Session.md`) and the clarifying Q&A.

## Decision A — Spells are crystals you assemble; only two tiers are castable

There are still exactly **four spell identities — one per suit** (♣ attack · ♦ draw · ♠ block ·
♥ recover), and a player can never hold a second of a suit. The vertical tier is **renamed and
recut** as a **crystal** the player forges from collected **fragments**:

1. **Fragment** — the floor. The suit's direct, castable emergency spell.
2. **Half** — forging fragments together yields the half-crystal: the **strongest castable**
   expression of the suit (the old "rare").
3. **Full** — forging further yields the full crystal. **A Full is NOT castable.** It emits a
   strange light and is **set aside, permanently unavailable for the rest of the run.** It is the
   **game-unlock / win token**, not a power tier. (The previous "mythic/purple" *playable* tier is
   deleted — there is no castable third rung.)

Supporting rules:
- **Fragments are suit-specific.** A ♦ fragment only builds the Diamonds crystal.
- **Forging consumes.** Fragments are consumed when transformed into a Half; the Half is consumed
  when transformed into a Full. The spell **transforms**, it does not accumulate copies.
- **Creating Fulls must itself be unlocked.** You cannot simply ask the Forge for a Full; the
  ability to complete a crystal is an unlock (endgame-gated).
- **The crystals live in a gauntlet/bracelet** (working name) that holds **exactly four** — one per
  suit. Each held crystal is either a Fragment or a Half; a Full leaves the active four because it
  is reserved for the finale.
- **In-combat cap is four** — one castable spell per suit. Spells remain scarce one-use trump cards
  in a dedicated area (not shuffled into the Tavern, not against the hand limit); casting consumes.
- **Spells sit above suit immunity** (current lean): a ♦ spell is castable against a ♦-immune
  enemy, because its purpose is to restore the denied axis. Must be visually explicit.
- The spell idea direction is held (e.g. Diamonds ≈ "draw your counterattack / draw from discard");
  exact effects and numbers need rebalancing — **not** locked by this record.

**Why:** the crystal narrative ties spells directly to the endgame and to the Forge; the
two-castable-rung cut keeps the moment-to-moment kit legible; and completing the four Fulls becomes
a *player-chosen, surprising, irreversible* act of self-weakening (see Decision B's endgame).

## Decision B — Five continents over the five-act pressure skeleton; finish by self-weakening

The five act **purposes** (Claim · Shape · Exploit · Adapt · Master) are retained as the **pressure
skeleton**. A **lore layer of continents** is laid over them. Genre is **all-in roguelike** for now
(an RPG built from this process is possible future work, explicitly out of scope).

Lore frame: the player, wronged by a king, is recruited by the **God of Luck**.

| Pressure beat | Continent (lore) | What happens |
|---|---|---|
| **Claim** | Continent 1 | Recruit / set up your forces. |
| **Shape** | Continent 2 | Defeat the first King. |
| **Exploit** | Continent 3 | Defeat another King — push your identity to the max. |
| **Adapt** | Continent 4 | **The loop.** Bigger; you always lose the God of Luck wager and are sent onward. First clear shows "You win?", then loops. You have *become* the king, fighting versions of yourself — a dream/betrayal loop. |
| **Master** | Continent 5 | The **God of Luck showdown** — a smaller road, not a full continent, ending in the fight against the God of Luck. Final mastery → credits. |

- **Continent 4 can be ridden indefinitely.** A player may loop without realizing the run is
  unfinished. **Completing the run is opt-in and discovery-driven.**
- **The win condition is forging all four crystals to Full.** Doing so strips your spells, so
  endgame difficulty rises by **subtracting the player's power, not buffing enemies.** Walking into
  it is a deliberate, **irreversible surprise/risk**.
- **The God of Luck wager between continents is an animation only** — the player may pick which card
  goes on top, but always "loses" (fakes bad RNG). When all four crystals are Full, the animation
  **changes**: the player flips a card, the God of Luck is surprised, and the C5 showdown begins.

**Why:** keeps the validated five-beat pressure curve intact while giving V3 a narrative spine, an
elegant opt-in ending, and a difficulty ramp that doesn't rely on enemy stat inflation.

## Decision C — Relics become equipment in five fixed slots; the class ability is a swappable staff

The **slotless** relic model is **overturned.** V3 has **five equipment slots, and only these five**:

- **Staff** — the **class ability**. Exactly one per character; everyone has a staff. The staff is
  the **swappable passive enabler** (it may be an activated ability, but it is the "passive
  signature" layer, not a scaling resource).
- **Cloak · Ring · Hat · Amulet** — up to four **relics**. Existing relic candidates (Split Seal,
  Doorstop, Crown of First Claim, Black Standard, etc.) are **re-standardized** into these slots.

Class progression resolves with the slots:
- Each class **keeps one linear ladder** (the payoff engine) — its own suit/station — which is **not
  swappable**. The **staff/passive enabler is swappable.** This is the
  [enabler × payoff-ladder split](../wiki/v3/classes/facet-and-linear-candidates.md): staff =
  enabler, ladder = payoff.
- **Diversification** comes from swapping staffs and from **unlocking the other suit ladders over
  the run** — you start with the ladder that most exactly matches your suit, and broaden later.
- A new, relatively early landmark — **Fallen Heroes** — lets the player **swap the staff**, mixing
  one class's linear ladder with another class's staff (e.g. Quartermaster ladder + Executioner
  staff). Where each pairing makes sense is to be defined.

**Why:** unifies "relic," "equipment," and "class ability" into one legible slot model; makes
class identity a pairing decision; and turns the relic pool into themed equipment that improves
replayability.

## Open / to-be-defined (not blocked by this record)
- **Forge economy:** fragments per drop (≈1 in 4 combats yields fragments), count to make a Half
  (tentatively 2), count to make a Full ("a lot" — placeholder 3 or 6), whether the Full unlock
  permits fragments→Full directly or requires the Half first.
- **Gauntlet/bracelet:** final name and what (if anything) "having all four" does before they go Full.
- **Slot themes:** Cloak ≈ roads (reroute / skip events or landmarks), Ring ≈ economy, Hat ≈
  recruitment, Amulet ≈ activated are intuitive placeholders only — open to brainstorming.
- **Tree-unlock mechanism:** how the other three suit ladders unlock over a run (elegance +
  replayability target).
- **Fallen Heroes:** placement, cost, and which staff↔ladder pairings are legal/meaningful.
- **Spell effects/numbers:** all spell text and balance (incl. the Diamonds draw idea).
- **Re-standardized relics:** which existing candidate lands in which slot.
- **God of Luck showdown:** exact shape of the C5 road and the fight.

## On acceptance, do
- Update canon: `canon/v3/systems/items.md` (equipment slots + crystal spells),
  `canon/v3/campaign/structure.md` (continent overlay + God of Luck), `canon/v3/classes/overview.md`
  (staff/ladder model).
- Amend `decisions/2026-06-20-five-act-continuous-expedition.md` with the continent overlay note.
- Update derived wiki: spell pages (fragment/half/full + gauntlet), spells philosophy + index,
  `items-and-power-vehicles`, relics index, `forge-and-landmarks` (crystal forging + Fallen
  Heroes), `facet-and-linear-candidates`, `decisions-to-be-taken`.
- Remove the resolved spell/relic portions of **Q11** from the active queue; record new open
  questions above where appropriate.
