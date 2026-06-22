---
kind: proposal
edition: v3
status: exploring
last_reviewed: 2026-06-20
questions: [Q1, Q2, Q3, Q4, Q27]
---

# V3 deck lifecycle — foundations, axes, and alternatives

This packet develops Q1–Q4 and Q27 as one design problem. It does not change canon.
Its purpose is to give Landry and Gab coherent alternatives to compare before any
implementation brief is written.

## Decision question

> From the first hand to the final gate, how does a conquered card enter, change,
> recur, leave, and gain meaning inside one persistent expedition deck?

Four lifecycle questions remain open and one is now accepted. Starting ownership
changes whether a kill is recruitment or reinforcement. Recruitment frequency changes
whether recovery is necessary. Reinforcement changes whether deck growth creates
synergy or dilution. Removal changes the weight of every acquisition.

## Accepted foundations

These are not alternatives in this packet unless deliberately reopened through a new
decision:

1. **Conquest-first acquisition.** A card added permanently comes from the starting
   court or an enemy the player defeated, not a generic draft or shop.
2. **Exact kills connect combat to progression.** An unowned defeated card is recruited;
   a defeated card already owned reinforces a card in hand.
3. **Number enemies are the ordinary acquisition targets.** Royals are gate bosses and
   are not ordinary recruits in the current direction.
4. **The expedition deck persists.** Hand, Tavern, and discard carry between road
   encounters; explicit rests reshuffle and redraw.
5. **One progression engine.** Deck growth and card reinforcement carry the primary
   progression load. There is no fragment wallet or generic post-fight drafting economy.
6. **The court remains recognizable.** Rank, suit, and familiar playing-card identity
   remain the main vocabulary.
7. **Grafts replace rank or suit.** After exact-killing an already-owned enemy, choose
   one card in hand and replace either its rank with the defeated rank or its suit with
   the defeated suit. A `7♠` supplies rank `7` or suit `♠`; it never supplies flat `+1`
   or an additional suit.
8. **Permanent removal is open.** It is neither required nor forbidden. No removal
   mechanic is accepted yet.

## Suggested deck-lifecycle pillars

These pillars are proposed evaluation rules for consensus. They are narrower than the
project-wide golden rules and apply specifically to the lifecycle of the deck.

### Pillar 1 — The battlefield is the source

Cards enter the deck because the player confronted and defeated them. Route selection
may influence which enemy is pursued, but a menu must not replace conquest with ordinary
shopping or drafting.

**Test:** Can the player point to the battle in which every acquired card was won?

### Pillar 2 — Exact kills write history

An exact kill must create a visible and memorable consequence: recruitment,
reinforcement, or another accepted lifecycle change. It should alter both the tactical
turn and the story of the deck.

**Test:** After the run, can the player identify cards whose current meaning came from
specific exact kills?

### Pillar 3 — The expedition deck carries consequences

The deck is not reconstructed between fights. Strong and weak acquisition choices,
damage to deck quality, missed opportunities, and recovery decisions persist far enough
to shape later encounters.

**Test:** Does the next encounter meaningfully inherit the previous encounter's deck
state and decisions?

### Pillar 4 — Consistency is player-authored

The game may provide recurrence, transformation, suppression, or removal, but the
player should knowingly pursue and pay for consistency. Silent grants and automatic
cleanup weaken ownership.

**Test:** When a deck becomes more reliable, can the player name the decision and
tradeoff that made it happen?

### Pillar 5 — One legible card engine

Lifecycle tools operate through cards, rank, suit, hand, Tavern, discard, exact kills,
and route opportunity. They should not create another wallet, inventory, or maintenance
layer that competes with the deck.

**Test:** Can the lifecycle rule be explained using the existing card vocabulary and
one recognizable verb?

## Four open axes and one accepted graft rule

### Axis A — Recruitment boundary and opportunity

This axis answers Q1 without reopening conquest-first acquisition.

| Pole | Description | Main pressure |
|---|---|---|
| Single opportunity | An overkilled or missed enemy is gone for the run. | Maximum consequence; high variance and death-spiral risk. |
| Natural recurrence | Unowned cards remain eligible in the regional enemy pool. | Organic second chances; uncertain access. |
| Pursued recurrence | Routes/events expose a bounded choice of missed enemies, but the player must still fight and exact-kill one. | Strong agency; risks becoming a disguised draft. |
| Guaranteed gate recovery | A gate ensures another acquisition opportunity before progression. | Stable power floor; can erase mastery differences. |

Royal exceptions should be treated separately from ordinary number-card recruitment.

### Axis B — Starting ownership and opening state

This axis answers Q4.

| Pole | Description | Main pressure |
|---|---|---|
| Shared small court | Every class owns the same minimal deck; class changes the initial hand and loophole. | Clean comparison and discovery; weaker immediate class fantasy. |
| Shared court plus class cards | A common base is supplemented by permanent class-specific cards. | Strong identity; complicates ownership and balance. |
| Distinct class decks | Each class begins with meaningfully different ownership. | Maximum asymmetry; makes one shared conquest curve difficult to tune. |

The accepted Ace remains a low-rank starting companion. The unresolved work is the
rest of the owned ranks/suits and whether a starting hand is only a draw arrangement or
permanent class-specific ownership.

### Accepted rule C — Duplicate-kill replacement graft

Q2's central semantic is accepted: choose a card in hand, then replace its rank with the
defeated rank or replace its suit with the defeated suit. Additive Hone and added-suit
Graft are implementation drift, not alternatives.

Detailed questions still requiring design include legal targets, repeated overwrites,
no-op handling, original-card history, Forge movement, and exactly which combat rules
read effective versus printed rank and suit.

### Axis D — Missed-acquisition recovery

This axis answers Q3. It is distinct from recruitment recurrence: recurrence controls
whether the enemy can return; recovery controls how deliberately the player can repair a
weak conquest trajectory.

| Pole | Description | Main pressure |
|---|---|---|
| No safety net | The run lives with every miss. | Strong mastery reward; compounding failure. |
| Earned hunt | The player sacrifices another route reward to pursue a missed card. | Visible tradeoff; risks feeling mandatory when weak. |
| Gate challenge | A difficult optional fight offers recovery before the next pressure band. | Dramatic comeback; can lengthen runs. |
| Automatic backfill | Missing cards are granted or normalized at an act boundary. | Stable tuning; weakest ownership and conquest story. |
| Adaptive pressure | Later encounters account for actual deck strength. | Protects viability; can erase the reward for playing well. |

Recovery should preserve a difference between strong and weak conquest without allowing
a doomed run to continue for a long time without meaningful decisions.

### Axis E — Curation and permanent removal

This axis answers Q27.

| Pole | Description | Main pressure |
|---|---|---|
| No permanent removal | Consistency comes from other lifecycle tools. | Strongest permanence; growth can dilute the deck. |
| Temporary suppression | Bench a card for an act or encounter, then restore it. | Tactical control without erasing history; adds state tracking. |
| Rare retirement | Permanently remove a card through a costly route/event choice. | Familiar agency and strong tradeoff; can become automatic thinning. |
| Transform instead of delete | Replace a weak card's identity or retire it into a persistent benefit. | Preserves consequence; can blur acquisition history. |
| Broad curation | Regularly remove unwanted cards. | Highest consistency; most likely to undermine conquest-first identity. |

Before selecting a pole, the project must name the problem being solved: draw dilution,
starting-card obsolescence, failed synergies, excessive run length, or player desire for
ownership. Removal should not be introduced as genre habit.

## Three coherent lifecycle models

Each model selects a compatible position on all five axes. These are packages for
comparison, not a menu from which every strongest-looking feature should be combined.

### Model A — Irreversible conquest

- **Start:** one small shared court; class changes starting hand and innate loophole.
- **Recruitment:** number cards receive a single natural encounter opportunity.
- **Reinforcement:** accepted rank/suit replacement graft.
- **Recovery:** no backfill and no directed recovery.
- **Curation:** no suppression or permanent removal.

**Player story:** “I live with every conquest and every miss.”

**Strengths:** pure identity, maximum consequence, simplest campaign-state model.

**Risks:** deck dilution, runaway success/failure, weak controlled randomness, and runs
that become doomed long before they formally end.

### Model B — Earned curation

- **Start:** one small shared court; class changes starting hand and innate loophole.
- **Recruitment:** unowned number cards recur naturally; a Hunt route can deliberately
  expose a bounded set of missed enemies, but acquisition still requires combat and an
  exact kill.
- **Reinforcement:** accepted rank/suit replacement graft.
- **Recovery:** Hunts cost another route opportunity and never grant a card directly.
- **Curation:** a rare Retirement event may permanently remove one acquired card in
  exchange for foregoing another valuable route outcome. Starting cards are not
  removable in the first test.

**Player story:** “I conquered this deck, then sacrificed opportunities to shape what
that conquest became.”

**Strengths:** preserves battlefield acquisition, adds controlled randomness and
player-authored consistency, and gives route events a consequential verb.

**Risks:** Hunt can become a draft screen wearing combat clothing; Retirement can become
an automatic optimal choice; removing an acquired enemy may weaken the conquest fantasy.

### Model C — Transformative resilience

- **Start:** a slightly larger shared court with class-specific opening arrangement.
- **Recruitment:** unowned number cards recur naturally within their acquisition act.
- **Reinforcement:** bounded rank/suit replacement rather than additive stacking.
- **Recovery:** each acquisition act offers one optional gate challenge against a missed
  enemy; success still requires an exact kill.
- **Curation:** no permanent deletion, but one card may be temporarily benched between
  explicit rests and the next gate.

**Player story:** “My kingdom survives by changing its cards, not erasing them.”

**Strengths:** protects permanence while giving players consistency tools; replacement
creates visible card evolution; optional gates support comeback stories.

**Risks:** replacement, benching, and gate recovery introduce more rules at once;
temporary suppression may feel like removal with extra bookkeeping; the larger starting
court may reduce early acquisition excitement.

## Suggested lead for exploration

**Model B — Earned curation** is the strongest first model to examine, not yet the
recommended final decision.

It directly tests the newly opened question: can rare, costly curation improve agency
without displacing conquest? It also expresses controlled randomness through a Hunt:
the player influences which missed enemy returns but must still earn the card through
combat and precision.

All tests use the accepted replacement graft. Compare Model B against Model A as the
control so the first comparison isolates recurrence, recovery, and rare retirement.
Model C should be examined if permanent removal fails the lifecycle pillars or if
temporary suppression better preserves the conquest story.

## Consensus tests

Landry and Gab should walk one hypothetical run through each model and answer:

1. **Identity:** Is conquest still the clearest explanation of how the deck is built?
2. **Agency:** Can the player deliberately improve consistency without an automatic
   best action?
3. **Consequence:** Do missed and acquired cards matter for long enough?
4. **Recovery:** Can a weak run create a comeback plan rather than merely receive help?
5. **Divergence:** Would two completed decks visibly tell different stories?
6. **Legibility:** Can card entry, reinforcement, recurrence, and exit each be explained
   with one recognizable verb?
7. **Width:** Does choosing one lifecycle action require pricing too many unrelated
   currencies or effects at once?

## Required consensus sequence

1. Accept, revise, or reject the five lifecycle pillars.
2. Select one model as the lead and one as its comparison/control.
3. Resolve Axis B first: starting ownership determines every later recruit/duplicate
   interaction.
4. Resolve Axes A and D together: opportunity and recovery form one acquisition curve.
5. Specify Rule C's remaining targeting, overwrite, card-history, and combat-resolution
   details using the expected deck sizes from the earlier decisions.
6. Resolve Axis E last: introduce curation only against a demonstrated consistency
   problem and with an explicit cost.
7. Record consensus in canon and a decision record; only then create delivery scope.
