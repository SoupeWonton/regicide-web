---
kind: proposal
edition: v3
status: brainstorming
last_reviewed: 2026-06-21
questions: [Q11, Q13]
---

# V3 relics and spell cards — active brainstorm

This document captures the current Landry–Codex design conversation so it can be
continued with Gab. It is not canon, an implementation brief, or an approved content
list. Names, values, tiers, acquisition rules, and interactions remain open until the
design is reviewed and accepted.

The current direction keeps relics as rare, slotless run-defining exceptions. It
reopens one part of the V3 item decision for exploration: spell effects may survive as
special one-use cards rather than as a currency, conventional inventory, or arbitrary
effects attached to ordinary conquered cards.

## Lessons from the first brainstorm

Information about Tavern order has little value in the current combat rhythm. Players
can already inspect which cards remain, draw effects often move several cards at once,
and immediate survival against the current enemy matters more than knowing one future
card. Effects such as revealing, inspecting, or rearranging the top few Tavern cards do
not solve the actual access problem.

The principal failure state is often an empty or inadequate hand. Reducing a lethal
discard requirement from a large number to one does not save a player who holds no
cards. Recovery effects therefore need to create immediate access, not merely improve
future circulation or reduce a payment the player still cannot make.

The most promising relics either let the player deliberately shape the conquered deck
or create an immediately visible exception in combat. The strongest spell direction is
different: a spell acts as a scarce trump card that temporarily restores one of the four
suit axes when an enemy or a bad hand has denied it.

## Spell cards

### Physical and interface model

A spell is represented as a special card with a Clubs, Diamonds, Spades, or Hearts
identity. It should look categorically different from the conquered court—potentially a
golden card or similarly exceptional frame—while still using the game's existing card
language. Hovering, focusing, or flipping the card reveals its rules text.

The card is held in a dedicated spell area rather than shuffled into the Tavern or
counted against the ordinary hand limit. Playing it is intended to feel like committing
a scarce trump card. The spell is then consumed unless later testing establishes a
different cadence.

This model is meant to avoid both rejected extremes: spells are not a separate currency
or shop economy, but they also do not denature ordinary playing cards with arbitrary
text effects. Their suit communicates the combat axis they restore.

### Spells and enemy immunity

**Current lean:** spell cards sit above ordinary suit immunity. A Diamond spell may be
played against a Diamond-immune enemy, and the same principle applies to the other
suits.

The reason is functional rather than merely thematic. A central spell purpose is to
compensate for an axis the encounter has shut down. If immunity also disables the
matching spell, the player who is short on cards cannot use the Diamond emergency draw
against the exact enemy creating that shortage. The spell ceases to be a get-out-of-jail
card precisely when its axis is most needed.

This exception must be visually explicit. A golden or otherwise elevated frame could
communicate that the card has a suit identity for organization and theme but is not an
ordinary suit trigger subject to immunity. The UI should preview both the spell effect
and the fact that immunity does not cancel it.

### Four-axis content model

Each spell belongs to one axis:

| Suit | Axis | Spell purpose |
|---|---|---|
| Clubs | Attack | Create or complete an offensive line when ordinary Club access is inadequate. |
| Diamonds | Draw | Restore immediate hand access when draw is unavailable or suppressed. |
| Spades | Block | Survive or permanently reduce pressure when ordinary Spade access is inadequate. |
| Hearts | Recover | Restore useful cards and circulation when attrition has damaged the engine. |

The spell should compensate for a missing axis rather than simply amplify an already
dominant engine. Cross-axis or dual-purpose effects can exist at higher rarity, but the
primary suit and emergency purpose must remain obvious.

### Candidate tier structure

The cleanest initial content package is **four standard spells and four rare spells**:
one spell per suit at each tier. Mythic spells should remain a future possibility rather
than ship merely to complete a three-tier table. A mythic tier is justified only if it
creates a qualitatively different trump-card moment instead of a larger number.

#### Standard candidates

| Suit | Spell | Working effect | Design role |
|---|---|---|---|
| Clubs | Keen Edge | Strengthen the current or next attack. Exact arithmetic remains open. | Direct attack compensation. |
| Diamonds | Quick Muster | Draw 2 cards immediately. | Direct hand repair. |
| Spades | Guard Up | Reduce the current enemy's attack by a fixed amount. | Direct persistent defense. |
| Hearts | Refit | Return a small number of discarded cards to the Tavern; whether it also draws 1 remains open. | Basic circulation repair. |

Bulwark Chant remains a liked standard-scale Spade alternative. It may replace Guard Up
or become the second member of a larger pool, but the initial eight-card package should
avoid two Spade spells while another suit has only one.

#### Rare candidates

| Suit | Spell | Working effect | Design role |
|---|---|---|---|
| Clubs | Commit | Add one extra hand card to a play outside normal combination rules; choose whether it contributes rank or suit, not both. | Break the attack/combine boundary for one decisive play. |
| Diamonds | Rally | When a counterattack is declared, draw before resolving it. A candidate value is half the current attack, with a cap still to be tested. | Turn incoming pressure into emergency hand access. |
| Spades | Brace | Convert a card into emergency Spade value during the current defensive sequence. Exact destination and whether the reduction persists remain open. | Create a block line from a hand without Spades. |
| Hearts | Full Recycle / Recover | Rebuild the Tavern from discard and provide immediate access, likely by drawing as part of the same effect. | Repair both present hand failure and future circulation. |

Commit is the clearest rare-spell candidate. Its rank-or-suit choice preserves exact-kill
control: rank supplies more attack, while suit can restore a denied axis without changing
the attack total. Rally is promising because it addresses the actual Diamond failure
state before the player dies, but uncapped draw based on enemy attack may invert late
pressure into an advantage. Brace and the rare Heart effect need equivalent precision.

### Four fixed spell cards and vertical upgrades

There are exactly four spell-card identities in the expedition: one Clubs spell, one
Diamonds spell, one Spades spell, and one Hearts spell. The player can never hold a
second spell of the same suit and cannot replace one suit's spell with a different card
from a larger catalog.

Each of the four spell cards has a vertical tier:

1. **Dormant / not yet acquired.** The suit position exists, but its spell cannot be
   played.
2. **Standard.** The suit's direct emergency effect.
3. **Rare.** The same spell identity upgraded into a stronger rule bend.
4. **Mythic rare, if retained.** The final expression of that suit's trump card.

Acquiring a spell awakens its dormant suit card at standard tier. A later spell reward
upgrades that same physical card from standard to rare and potentially from rare to
mythic. It never adds a fifth card. The player's spell state can therefore be read at a
glance as four suit positions with visible tiers.

This removes inventory construction and duplicate rules from the player's mental load.
The strategic question is instead which axis to awaken first and which one to deepen.
A player might own all four standard spells late in the expedition, or push one crucial
axis toward rare or mythic while other suits remain dormant or standard.

The interface can present the four golden card backs together. Hovering, focusing, or
flipping a card reveals its current text and its next-tier text before the player commits
an upgrade. The frame, illustration, and tier treatment should change while the suit and
core identity remain stable.

### One-use trump cards

There is no spell restoration, recharge, or exhaustion system. Casting a spell consumes
that spell card. Its suit position becomes empty and may receive a future standard spell
card, but the consumed card and its tier do not remain as a reusable ability.

This creates the intended trump-card tension. Holding a standard spell keeps it
available for a later upgrade to rare, and holding a rare spell keeps open the possible
mythic-rare upgrade. Casting now solves the present emergency but abandons that vertical
investment. The four-card limit therefore constrains what can be held at once without
turning spells into renewable encounter powers.

## Relic direction

### Strong candidates

#### Split Seal

After an exact kill against an already-owned card, the rank-or-suit replacement may
target any owned card, whether it is in hand, Tavern, or discard.

Split Seal turns a situational graft into purposeful deck construction. It supports
rank concentration, suit concentration, class expression, and preparation for later
acts without adding another reward currency. This is currently the clearest V3 relic.

#### Crown of First Claim

A newly exact-killed recruit enters the hand immediately rather than following normal
recruit circulation. The exchange rule for a full hand and any frequency limit remain
open.

The effect is intentionally exciting and may be extremely strong across many
encounters. The next test should initially push that limit rather than prematurely
soften the relic. Its abuse cases—repeated exact-kill tempo, full-hand exchange, and
class interactions—should be observed directly.

#### Doorstop

Once per enemy, when a Spade card reduces that enemy's attack to exactly 0, return that
Spade card to the player's hand.

This is an exact-block reward: the card that completes the wall bounces back. It is
immediate, visible, easy to narrate, and naturally associated with the Spade axis. The
once-per-enemy boundary prevents repeatedly recycling the same card after attack has
already reached 0.

### Lower-power relative

#### Black Standard

A newly recruited card is placed face-up on top of the Tavern instead of entering
normal circulation.

Black Standard is the fairer relative of Crown of First Claim. Its value comes from
accelerated access, not from revealing information: the player still needs to produce a
draw. The two relics likely belong to the same family and may need mutually exclusive
appearance rules.

### Proven V2 reference points

The following V2 relics were consistently understandable, selected, or enjoyed and
should serve as power and excitement references rather than being copied automatically:

- **Sainted Scalpel:** recovery plus immediate draw was valuable because it repaired
  both future circulation and the present hand.
- **Combat Cache:** raising the combination ceiling was immediately usable and changed
  possible plays.
- **Warhorn:** reliable additional attack was visible and useful; exact-kill arithmetic
  may make its flat bonus more consequential than it first appears.
- **Hoard:** a larger hand directly addressed the central access and survival problem.

Combat Cache and Hoard may overlap with Quartermaster identity. Sainted Scalpel may
overlap with Surgeon identity. The open question is not simply whether overlap exists,
but whether rare relics create exciting class amplification and cross-class access or
erase what makes the class unique.

### Rejected or parked directions

- **Unsealed Eye:** knowing the next Tavern card does not create useful access in a
  high-churn deck.
- **Gravekeeper's Ring as information:** merely knowing that a recruit is coming is too
  weak; Black Standard survives only as an access-timing effect.
- **Original Iron Reprieve:** reducing a lethal discard requirement to 1 does nothing
  when the hand is empty.
- **Emergency draw/recovery Iron Reprieve redesign:** parked. Moving cards into the hand
  at death may erase attrition, duplicate Hearts or Surgeon, and create a class-dependent
  balance problem before the baseline relic value is understood.
- **Crownless Key:** parked until route topology and route opportunity have enough value
  for free movement or extra choice to matter.

## Relic power baseline — unresolved

The pool does not yet have a reliable base unit of relic value. Quartermaster in
particular may already receive hand capacity, draw, and combination access through its
class rules, making generic access relics disproportionately strong or redundant.

Relics should therefore be compared by the practical advantage they create over a run:

- How many additional usable cards do they create or preserve?
- How many otherwise impossible exact kills, combinations, or blocks do they enable?
- How frequently do they trigger across many short fights?
- Does their value increase with encounter count rather than difficulty?
- Do they rescue a weak axis, amplify a chosen identity, or provide both?
- Does a class become unrecognizable when another class obtains the relic?

The initial relic tests should compare a narrow identity relic such as Split Seal or
Doorstop against broad efficiency benchmarks such as Warhorn, Hoard, and Sainted
Scalpel. That comparison can establish whether an exciting V3 relic needs to equal a
card, a draw, an exact-kill opportunity, or some other repeatable advantage.

## Landmarks and acquisition rhythm

The emerging expedition rhythm is combat-heavy: several fights create sustained
pressure, followed by a short landmark stop that offers one consequential intervention,
then combat resumes. Ordinary encounters remain fights rather than reward menus.

The landmark should not become a generic shop. It should offer one sharp decision that
interrupts the fight rhythm briefly and sends the player back into combat with a changed
plan. Reviewing the historical and current landmark definitions suggests the following
division of labor.

### Abbey / Sanctum — acquire or upgrade one spell

The Abbey historically owned disciplined recovery and spell access; the developed
Sanctum owned immediate rites. It is the most natural home for permanent spell-card
progression.

At an Abbey, display all four golden suit cards. The player chooses one legal step:

- awaken one dormant spell at standard tier;
- upgrade one standard spell to rare; or
- at a sufficiently late or exceptional Abbey, upgrade one rare spell to mythic rare.

The Abbey does not sell a random spell from a catalog. Its verb is **attune**: choose
which of the four known trump cards becomes available or deeper. This creates a short,
purposeful stop rather than a shop screen.

### Shrine — zero-sum card transformation, or removal

Shrine has no spell-restoration role. Its V3 identity is not settled and the location
should be removed if it cannot own a distinct verb.

One direction is a zero-sum consecration: curse or weaken one owned card in order to
upgrade another while keeping the same number of cards in the deck. This would
redistribute strength rather than mint a free upgrade or thin the deck. Exact rank,
suit, duration, targeting, and conservation rules remain unclear, and the idea may
overlap too heavily with the Forge or Split Seal.

### Lair — win a relic through a dangerous fight

The Lair's stable identity is risk spike for rare payoff. It is the strongest primary
source for relics because the player earns the exception through combat rather than
currency or an automatic menu.

A Lair should advertise the relic or at least its mechanical family before commitment.
Victory grants the relic; retreat or defeat does not. The reward should not become a
three-way buffet of relic, spell, and unrelated upgrade, because that weakens the Lair's
single verb. Its V3 verb is **raid**: accept exceptional pressure to take a run-defining
artifact.

### Market / Caravan — pay from the current hand

The Market historically owned flexibility and correction, while the developed Caravan
offered a mythic relic for a permanent deck cost. V3 has no gold or ordinary shop, but a
rare authored exchange still fits the trade identity.

The Market or Caravan can offer a costly relic without requiring a relic-for-relic
exchange. It can also express a spell economy through the game's existing card resource:
discard cards from the current hand whose ranks meet a visible total, then receive or
upgrade a spell. A working example is total value 5 for an early standard spell and
total value 10 for a later rare or mythic-rare step; all numbers remain tuning targets.

This payment is consequential because hand state persists into the next fight. The
player buys emergency tolerance by deliberately entering the road with fewer cards.
There is no gold, fragment wallet, or abstract shop currency. The unresolved question
is whether this becomes the primary spell source or a costly alternative to Abbey /
Sanctum attunement.

### Camp — four-axis rest and preparation

Camp owns the full reshuffle and redraw of the persistent expedition deck. Those actions
already restore access to the Diamond and Heart axes: the hand is refilled and the
discard returns to circulation.

The active brainstorm extends Camp into a four-axis preparation for the next encounter:

- **Diamonds:** redraw the hand.
- **Hearts:** reshuffle discard into the Tavern.
- **Spades:** begin the next encounter with a substantial shield, with +10 as an initial
  test value.
- **Clubs:** the first card or play in the next encounter deals double damage.

This makes Camp visibly attractive when a simple rest is currently passed over. It also
risks making Camp mandatory, so the shield amount, damage duration, and whether players
choose one preparation or receive both must be tested. Camp does not restore consumed
spells and does not grant relics.

### Forge — graft rearrangement only

The Forge's accepted V3 direction is to reorganize replacement grafts already earned
through exact kills without creating new power. It should not grant spells or relics.
This preserves its single verb and prevents it from returning to the V2 generic upgrade
menu.

### Hunt — recruitment opportunity only

If Hunt survives the deck-lifecycle decision, it presents a selection of eligible missed
or unowned cards. The player chooses which card to pursue, then must still fight and
exact-kill that enemy. It should not grant spells or relics. Its entire purpose is to
turn route opportunity into authored recruitment through more conquest.

### Tower — removed from the active V3 landmark model

Tower is not useful in the current route scale. Roads are too short for its inherited
Darkest Dungeon-style initiative, scouting, or route-information identity to create a
meaningful decision. It should not receive a replacement item reward merely to preserve
the location. Historical material can remain searchable, but Tower is no longer an
active V3 landmark candidate.

### Events — lore-driven, later

Events will be authored from lore later. They may occasionally affect a spell or relic
when the fiction and tradeoff justify it, but they are not part of the mechanical item
baseline and should not become the normal acquisition channel.

### Gate and act milestones — possible mythic threshold

Mythic spell upgrades may be too important for an ordinary recurring Abbey. A late gate,
act milestone, or uniquely authored Sanctum could unlock the final tier after the player
has demonstrated mastery. This remains open until standard and rare spells prove that a
third tier creates a new decision rather than a larger number.

### Working acquisition map

| Landmark | Single verb | Spell relationship | Relic relationship |
|---|---|---|---|
| Abbey / Sanctum | Attune | Acquire or upgrade one of four suit spells | None |
| Shrine | Consecrate / redistribute, or remove | None | None |
| Lair | Raid | None by default | Win a relic through a dangerous fight |
| Market / Caravan | Pay from hand | Acquire or upgrade for a visible discard-total cost | Costly relic offer; no relic exchange required |
| Camp | Rest / prepare | No restoration | None |
| Forge | Rearrange | None | None |
| Hunt | Pursue | None | None |
| Tower | Removed | None | None |
| Event | Lore-driven | Exceptional only | Exceptional only |

## Next discussion targets

The next design passes should resolve enough detail to support one proposal entry per
spell and relic in the derived wiki after separate approval:

1. Confirm whether a consumed upgraded spell returns at standard when reacquired or
   whether another progression rule applies.
2. Confirm whether all spell cards ignore matching enemy immunity.
3. Define the same four spells at standard and rare tier.
4. Decide whether mythic rare is needed or merely future design space.
5. Decide whether spell acquisition belongs primarily to Abbey / Sanctum, the
   hand-value Market / Caravan, or distinct roles at both.
6. Define the proposed Shrine transfer precisely or remove Shrine.
7. Test whether Camp grants both offensive and defensive preparation or a choice.
8. Establish an initial relic power baseline using Split Seal, Doorstop, Crown of First
   Claim, Sainted Scalpel, Combat Cache, Warhorn, and Hoard.
9. Sketch the minimum landmark cadence needed to award spells and rare relics without
   turning the expedition into a shop circuit.
