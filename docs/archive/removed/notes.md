To fix


- Reward interface should never be able to close without taking a reward
  [DONE — the choice overlay now renders whenever a choice is pending, in any
  phase; server already had no skip path]
- Last turn that kills should do the turn before closing the fight so the palyers can see the end result fo the turn (AKA cards in hand and new tavern, just slow it down a notch)
  [DONE — server snapshots the killing turn's end state (lastFight: hands,
  Tavern, discard); the victory splash shows it and lingers ~0.7s longer]
- Classes shouldn't be encoutner wide, they should only affect the palyer playing that class. (Right now I'm on a sentinel and jerome is executioner, I get his bonuses on a king fight in the castle)
  [DONE — owner-only is canon now: quartermaster/surgeon/executioner procs
  fire only on the owner's own play (sentinel already was); the QM hand-cap
  bonus is also personal now. B2/B3 settled. Bot eval updated to match.]
- The encounter counter should be clearer, the x/y counter isn't clear
  [DONE — now reads "☠ N slain · M remain"]
- Each gate/stable/castle was too easy, lacking quantity of royals.
  [DONE — gates now field 3 royals solo / 4 royals at 2+ players (was 2/3/4).
  Bot-floor wins moved 6-11% → 2-7% solo; human read needed on the new sizes]


futur ideas:

- we should gain kind of experience counters when going up ascentions
