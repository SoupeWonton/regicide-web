# Deckbuilding roguelike design principles

> **Status:** Research reference, not canon.
>
> **Project context:** Regicide Web is a Vue 3, TypeScript, and Socket.IO game containing
> base Regicide and a persistent, seeded campaign. Active design work is on
> `Design_V3`. Intended behavior lives in `docs/canon/`; code and tests are the final
> authority for shipped behavior. Any accepted design change must update canon, a
> decision record, and delivery status together.
>
> **Source:** Structured notes derived from a user-provided video transcript about what
> makes a strong roguelike deckbuilding game. The transcript did not include a title,
> author, URL, or publication date.

## Purpose

Use this document as an evaluation lens when discussing or designing Regicide Web's
campaign. It records design arguments and examples from the source; it does not declare
that every recommendation is appropriate for Regicide.

## Central thesis

Turn-based deckbuilding roguelikes have less room than action roguelikes to distinguish
themselves through movement, physics, or real-time game feel. Their mechanics are often
communicated mostly through text and arithmetic, so superficial differences in story,
art, or card quantity do not create a distinct play experience by themselves.

A strong game therefore needs:

1. A mechanically meaningful identity or gimmick.
2. Interesting decisions both in and out of combat.
3. Cards or equivalent components that support broad, satisfying synergies.
4. Randomness players can understand, influence, and strategically exploit.
5. Clear progression and reward structure without sacrificing consistency.
6. An approachable ruleset and sufficiently immersive presentation.

## 1. A distinct mechanical identity is essential

Many games inherit familiar patterns from *Slay the Spire*, itself influenced by
*Dream Quest*: low-cost attacks, low-cost blocks, energy systems, card rewards, and
branching encounter maps. Familiar ingredients are not inherently a problem. They
become a problem when they produce no meaningfully different decisions.

The source's test for a new deckbuilder is: **What is the gimmick?** A useful gimmick
changes how familiar effects are evaluated and lets the rest of the content be designed
around it.

Examples from the transcript:

- *Roguebook* controls two characters and makes positioning matter.
- *Monster Train* uses three boards and autobattler-style resolution.
- *Across the Obelisk* controls four characters with separate turns.
- *Arcanium* makes an otherwise familiar cleave effect different through a
  three-character positional board.
- *Balatro* builds around poker hands and score multiplication.
- *Peglin* combines deckbuilding progression with Peggle-like execution.
- *Astrea* replaces cards with dice.
- *Backpack Hero* turns inventory placement into the build system.

A gimmick must be consequential. The transcript criticizes *Deck of Ashes* because its
health-for-discard-recovery mechanic did not change play enough to prevent the rest of
the experience from feeling derivative.

### Evaluation questions for Regicide

- What recurring decision could only exist because this is campaign Regicide?
- Does the persistent shared deck change tactics, routing, and rewards, or merely track
  progress between otherwise isolated fights?
- Do suits, ranks, table cooperation, and campaign persistence interact often enough to
  form a recognizable identity?
- Can a player explain the campaign's distinctive hook without describing its fiction
  or amount of content?

## 2. Combat is the core, but connective play still matters

Combat commonly contains most of a deckbuilder's content, but the spaces between fights
perform several important jobs:

- Link encounters into a coherent journey.
- Let players tune or upgrade their build.
- Offer a breather after cognitively demanding combat.
- Create route-planning and opportunity-cost decisions.
- Supply memorable risk-versus-reward moments.

Shops are a low-risk way to add cards, items, or upgrades using earned resources.
Branching nodes create opportunity cost, such as choosing between deck consistency and
a new companion. Special events are especially effective because a small interaction
can substantially redirect a run.

The *Monster Train* Malicka mutator example captures the desired structure: players may
take zero to three harmful artifacts, carry them through two battles, and then exchange
them for powerful rewards. The player chooses the degree of exposure, understands the
basic bargain, and must adapt subsequent play to survive the liability.

Good events should usually provide:

- A real choice, including refusal when appropriate.
- A visible or inferable tradeoff.
- Consequences that affect later decisions, not only immediate numbers.
- Outcomes that can vary by the current build or game state.
- Enough uncertainty to create tension without making the choice arbitrary.

Unknown events can increase discovery and risk, but uncertainty should not erase player
agency. Repeated events should remain interesting because the current build changes the
best choice.

### Evaluation questions for Regicide

- Does each road choice meaningfully compete with another use of time or resources?
- Do events ask players to evaluate their current deck and party state?
- Can players voluntarily accept short-term burdens for delayed rewards?
- Are rests, Taverns, rewards, and encounters paced as distinct beats?

## 3. Card categories and rarity create legibility and progression

Categories help players understand a large pool and communicate a card's role. Examples
include attacks, skills, and powers in *Slay the Spire*, or units and spells in
*Monster Train*.

Rarity serves more than scarcity. It can:

- Pace complexity and power across a run.
- Make early and late rewards feel different.
- Improve the consistency of finding basic build components.
- Reserve narrow or rules-bending effects for moments when players can evaluate them.

A useful distribution is:

- **Common components:** simple, flexible, frequently available, and broadly
  synergistic.
- **Rare components:** stronger, narrower, more situational, or build-defining.

Rare should not simply mean strictly superior. *Slay the Spire's* Grand Finale deals
large area damage but requires an empty draw pile; the condition makes it powerful and
build-specific. Conversely, a simple common multi-hit card such as Sword Boomerang can
outperform a flashy rare because strength bonuses apply to every hit.

Strict upgrades can still have a role when rarity, timing, and price create progression.
The transcript's *Balatro* example contrasts a cheap, common suit multiplier with a
rarer effect that grants twice as much: the common version matters because it is more
likely to stabilize the early game.

The transcript argues that a flat pool with no rarity, as experienced in *Wildfrost*,
can make synergy access and run power too inconsistent because every effect competes at
the same frequency throughout the run.

### Evaluation questions for Regicide

- Are foundational synergy pieces reliably available before specialized payoffs?
- Do reward tiers control complexity and consistency rather than merely inflate power?
- Can common additions remain relevant late in a campaign?
- Does each content category communicate a distinct gameplay role?

## 4. Synergy and satisfaction matter more than isolated balance

Balance is necessary, but the ultimate test is whether using the system is fun. The
strongest moments come when choices made across a run combine into an outcome that feels
earned, powerful, and sometimes spectacular.

Good components tend to have **synergy surface area**: multiple other mechanics can
modify, enable, repeat, redirect, or otherwise reinterpret them. Simple effects often
provide more surface area than self-contained effects.

The transcript contrasts:

- Sword Boomerang, whose repeated hits scale strongly with attack bonuses.
- Bludgeon, a large but relatively isolated damage number.
- Foreign Influence, which creates unusual cross-class combinations and variable
  stories even when it is not optimal.
- Judgment, which is powerful but usually behaves the same regardless of build.

This suggests several principles:

- Prefer effects that participate in systems over effects that merely output a number.
- Let players assemble combinations rather than hand them complete packages.
- Include some effects with surprising or cross-boundary potential.
- Permit strong payoff moments when they result from accumulated decisions.
- Do not remove all excess in pursuit of perfectly even outcomes; spectacle can be part
  of the reward.

*Balatro* is cited as especially satisfying because its cards and Jokers repeatedly
chain into large scoring events. Its accessibility also lets players reach that
satisfaction without first mastering a large vocabulary of rules and keywords.

### Evaluation questions for Regicide

- How many systems can interact with a new card, reward, class ability, or encounter?
- Does a payoff validate earlier choices in a way players can see and understand?
- Are powerful turns produced by player construction rather than a single automatic
  reward?
- Does an effect behave differently across multiple viable builds?

## 5. Controlled randomness creates agency

Randomness is most enjoyable when it creates varied situations that players can still
shape. The transcript calls this **controlled randomness**.

The classic example is choosing one of three random options. Random generation keeps
runs varied; selection preserves strategy. Digital games can use this more freely than
physical card games.

Controlled randomness can also occur inside combat:

- Random targets become more predictable after eliminating enemies.
- Players can adjust health totals so any likely random hit produces value.
- Multi-hit randomness interacts with bonuses and kill triggers.
- Dice with different faces remain tactical when every face has at least one useful
  application.

The satisfying moment is realizing that an effect labeled “random” can be manipulated
through setup. *Monster Train's* Excavation Eruption is cited because players can weaken
enemies first, increasing the chance that its random damage kills a target and refunds
energy.

Useful randomness should therefore:

- Present bounded, readable possibilities.
- Give players tools to improve odds or reduce the outcome space.
- Avoid states where a random result leaves no meaningful response.
- Reward planning without becoming fully deterministic.
- Preserve serialized determinism where reproducibility is a project requirement.

For Regicide Web specifically, campaign randomness must continue to flow through
`rng.ts` and serialized `campaign.rngState`; controlled randomness is a player-experience
principle, not permission to bypass deterministic seeded execution.

## 6. “Deckbuilding” describes a progression loop, not necessarily cards

The genre's functional core is collecting and combining reusable actions, units,
abilities, or items over a run. Physical-looking cards are only one interface for that
structure. Dice, orbs, inventory objects, companions, and other components can implement
the same loop.

This matters because choosing a representation that fits the game's theme can create a
stronger mechanical identity. The representation should clarify what is collected, how
it combines, when it becomes available, and how it cycles through play.

Regicide already has an authentic playing-card foundation. The relevant challenge is
not replacing cards, but ensuring ranks, suits, shared hands, the persistent deck, and
campaign additions do real mechanical work rather than acting as theme alone.

## 7. Approachability accelerates fun

Deckbuilders can intimidate new players through accumulated rules, keywords, card text,
and exceptions. The source highlights *Balatro* as unusually easy to begin, even without
strong poker knowledge.

Approachability does not require shallow strategy. It requires:

- Familiar concepts where possible.
- A small initial decision vocabulary.
- Effects whose immediate result is easy to predict.
- Complexity introduced through combinations and progression.
- Clear feedback showing why a combo worked.
- Exceptions and keywords only when they repay their learning cost.

The goal is to shorten the delay between starting a run and experiencing a satisfying,
player-authored combination.

## 8. Presentation supports slow, thoughtful play

Turn-based encounters can leave players on one screen for several minutes. Visuals,
animation, sound, and environmental variation therefore need to prevent the experience
from feeling like staring at numbers.

Presentation should:

- Reinforce the game's mechanical identity and mood.
- Clearly distinguish biomes, chapters, or stages of progression.
- Make state and consequences readable during long turns.
- Provide satisfying feedback for combinations and payoffs.
- Maintain immersion without obscuring tactical information.

The transcript praises *Peglin* for clear visual distinctions between combat floors and
travel, and *Roguebook* for a world, music, and animation strong enough to sustain
lengthy tactical consideration. It criticizes biome palettes that are too similar to
convey a sense of travel. *Slay the Spire* is treated as proof that revolutionary visual
technology is unnecessary when ambience and mood are coherent.

For Regicide, presentation must not expose internal CT design/debug values; those remain
`[CT]` logs rather than player-facing feedback.

## Practical design checklist

Before accepting a new campaign mechanic or content family, ask:

- **Identity:** Does this reinforce Regicide's unique mechanical hook?
- **Decision:** What meaningful choice does the player make?
- **State dependence:** Does the best choice vary with deck, party, route, or encounter?
- **Synergy:** Which existing systems can alter or exploit it?
- **Readability:** Can players predict the immediate consequence?
- **Randomness:** What is random, and how can players influence it?
- **Progression:** Why does this appear at this stage or frequency?
- **Satisfaction:** What payoff or story can this enable?
- **Persistence:** Does it respect the persistent campaign deck across road encounters?
- **Deck curation:** Does it preserve conquest-first acquisition, and has any permanent
  removal rule been explored and accepted rather than assumed?
- **Determinism:** Does all campaign randomness use serialized seeded RNG?
- **Validation:** Can invalid actions be rejected before any state mutation?
- **Isolation:** Does it avoid leaking campaign mechanics into quick-game Regicide?
- **Presentation:** Is the outcome legible and immersive without exposing debug data?

## Condensed takeaway

A good deckbuilding roguelike is not defined by having many cards. It creates a distinct
decision system, gives simple components broad combinatorial potential, structures
randomness so skill can shape it, and connects fights with consequential choices. Rarity
and pacing make builds coherent; accessibility lets players discover the depth; and
presentation makes slow tactical play feel like a journey. For Regicide Web, these ideas
must be filtered through the campaign's existing invariants, especially conquest-first
acquisition, the persistent expedition deck, deterministic RNG, action dispatch, and
quick-game isolation. Permanent removal remains an open design axis.
