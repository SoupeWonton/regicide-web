using System;
using System.Collections.Generic;
using System.Linq;
using Regicide.Core;

namespace Regicide.Headless
{
    /// <summary>
    /// Headless verification of Regicide.Core (BUILD-SPEC.md §15: "verify each layer
    /// headlessly before wiring Unity UI"). Runs an assertion suite over the
    /// action→Dispatch→events loop, then plays back a scripted demo fight.
    /// Exit code 0 = all green.
    /// </summary>
    internal static class Program
    {
        private static int _passed;
        private static readonly List<string> _failures = new List<string>();
        private static string _current = "";

        private static int Main(string[] args)
        {
            Console.OutputEncoding = System.Text.Encoding.UTF8;

            Run("rng determinism & cursor restore", TestRngDeterminism);
            Run("starting deck build (A–5 × 4)", TestDeckBuild);
            Run("opening-hand ♦ forgiveness (50 seeds)", TestOpeningHandDiamond);
            Run("combo legality", TestComboLegality);
            Run("♣ double + exact kill → recruit", TestClubsDoubleAndRecruit);
            Run("suit immunity blocks power, not value", TestImmunity);
            Run("♠ shield fully absorbs counterattack", TestSpadesShield);
            Run("♥ recover to Tavern bottom", TestHeartsRecover);
            Run("♦ draw capped at hand size", TestDiamondsDrawCap);
            Run("ace pair fires both suits", TestAcePair);
            Run("counterattack defend & discard", TestDefend);
            Run("unpayable counterattack = death", TestDeath);
            Run("overkill gives no reward", TestOverkillNoReward);
            Run("redundant exact kill → graft (suit-add + no-op reject)", TestGraftSuitAdd);
            Run("rank graft royal cap at 10", TestGraftRankCap);
            Run("multi-enemy fight: play again after kill, no counterattack", TestMultiEnemy);
            Run("invalid action mutates nothing", TestValidateThenMutate);
            Run("same seed → identical run state", TestSessionDeterminism);
            Run("fragment drop ≈ 50% over 60 wins", TestFragmentDropRate);

            Console.WriteLine();
            if (_failures.Count == 0)
            {
                Console.WriteLine($"ALL {_passed} CHECKS PASSED");
                Console.WriteLine();
                DemoFight();
                return 0;
            }

            Console.WriteLine($"{_passed} passed, {_failures.Count} FAILED:");
            foreach (var f in _failures) Console.WriteLine($"  ✗ {f}");
            return 1;
        }

        // ── tiny framework ──────────────────────────────────────────────────────

        private static void Run(string name, Action test)
        {
            _current = name;
            try
            {
                test();
                Console.WriteLine($"  ✓ {name}");
            }
            catch (Exception ex)
            {
                _failures.Add($"{name}: {ex.Message}");
                Console.WriteLine($"  ✗ {name}: {ex.Message}");
            }
        }

        private static void Check(bool cond, string what)
        {
            if (!cond) throw new Exception(what);
            _passed++;
        }

        private static Result Must(Result r)
        {
            if (!r.Ok) throw new Exception($"dispatch failed: {r.Error}");
            _passed++;
            return r;
        }

        private static Result MustFail(Result r, string why)
        {
            if (r.Ok) throw new Exception($"expected rejection ({why}) but action succeeded");
            _passed++;
            return r;
        }

        private static bool Has<T>(Result r) where T : GameEvent => r.Events.OfType<T>().Any();
        private static T Get<T>(Result r) where T : GameEvent => r.Events.OfType<T>().First();

        // ── setup helpers (the harness may reach into public state to stage scenarios) ──

        private static GameSession NewRun(string seed)
        {
            var s = new GameSession(seed);
            Must(s.Dispatch(new SelectClass("sentinel", "hold_the_line")));
            return s;
        }

        /// <summary>Move the whole hand to the Tavern bottom (stage a known hand next).</summary>
        private static void ClearHand(GameSession s)
        {
            s.State.Deck.Tavern.AddRange(s.State.Deck.Hand);
            s.State.Deck.Hand.Clear();
        }

        /// <summary>Mint a specific card straight into hand (and ownership).</summary>
        private static PhysicalCard Give(GameSession s, Suit suit, Rank rank)
        {
            var c = s.State.Cards.Mint(suit, rank);
            s.State.OwnedCards.Add(c.PhysicalId);
            s.State.Deck.Hand.Add(c.PhysicalId);
            return c;
        }

        /// <summary>Mint a card the player owns but holds in the Tavern (graft-trigger setup).</summary>
        private static PhysicalCard OwnInTavern(GameSession s, Suit suit, Rank rank)
        {
            var c = s.State.Cards.Mint(suit, rank);
            s.State.OwnedCards.Add(c.PhysicalId);
            s.State.Deck.Tavern.Add(c.PhysicalId);
            return c;
        }

        private static void Fight(GameSession s, params EnemyState[] enemies) =>
            Must(s.Dispatch(new StartEncounter(enemies)));

        // ── tests ───────────────────────────────────────────────────────────────

        private static void TestRngDeterminism()
        {
            var a = new Rng("alpha");
            var b = new Rng("alpha");
            for (int i = 0; i < 10; i++)
                Check(a.NextDouble() == b.NextDouble(), $"same-seed divergence at draw {i}");

            uint cursor = a.State;
            var resumed = new Rng(cursor);
            for (int i = 0; i < 10; i++)
                Check(a.NextDouble() == resumed.NextDouble(), $"cursor-restore divergence at draw {i}");

            var c = new Rng("beta");
            Check(new Rng("alpha").NextDouble() != c.NextDouble(), "different seeds should diverge");
        }

        private static void TestDeckBuild()
        {
            var s = NewRun("deckbuild");
            Check(s.State.Phase == CampaignPhase.Road, "phase should be Road after class select");
            Check(s.State.OwnedCards.Count == 20, $"expected 20 owned, got {s.State.OwnedCards.Count}");
            Check(s.State.Deck.Hand.Count == 5, $"expected hand 5, got {s.State.Deck.Hand.Count}");
            Check(s.State.Deck.Tavern.Count == 15, $"expected tavern 15, got {s.State.Deck.Tavern.Count}");

            foreach (Suit suit in Enum.GetValues(typeof(Suit)))
            {
                int n = s.State.OwnedCards.Count(id =>
                    s.State.Cards.Get(id).Printed.Suit == suit);
                Check(n == 5, $"expected 5 cards of {suit}, got {n}");
            }
            Check(s.State.OwnedCards.All(id => (int)s.State.Cards.Get(id).Printed.Rank <= 5),
                "starting deck must be A–5 only");

            MustFail(s.Dispatch(new SelectClass("x", "y")), "double class select");
        }

        private static void TestOpeningHandDiamond()
        {
            for (int i = 0; i < 50; i++)
            {
                var s = NewRun($"seed-{i}");
                Check(s.State.Deck.Hand.Any(id => s.State.Cards.Get(id).FiresSuit(Suit.Diamonds)),
                    $"seed-{i}: opening hand has no ♦");
            }
        }

        private static void TestComboLegality()
        {
            var s = NewRun("combos");
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss)); // big HP so nothing dies
            ClearHand(s);
            var c3a = Give(s, Suit.Clubs, Rank.Three);
            var c3b = Give(s, Suit.Spades, Rank.Three);
            var c3c = Give(s, Suit.Diamonds, Rank.Three);
            var c4 = Give(s, Suit.Hearts, Rank.Four);
            var c6a = Give(s, Suit.Clubs, Rank.Six);
            var c6b = Give(s, Suit.Spades, Rank.Six);
            var a1 = Give(s, Suit.Diamonds, Rank.Ace);
            var a2 = Give(s, Suit.Clubs, Rank.Ace);

            MustFail(s.Dispatch(new PlayCards(c3a.PhysicalId, c4.PhysicalId)), "two different ranks");
            MustFail(s.Dispatch(new PlayCards(c6a.PhysicalId, c6b.PhysicalId)), "same-rank total 12 > 10");
            MustFail(s.Dispatch(new PlayCards(a1.PhysicalId, c3a.PhysicalId, c3b.PhysicalId)), "ace + two cards");
            MustFail(s.Dispatch(new PlayCards(c3a.PhysicalId, c3a.PhysicalId)), "duplicate card");
            MustFail(s.Dispatch(new PlayCards(9999)), "card not in hand");
            MustFail(s.Dispatch(new PlayCards()), "empty play");

            // Three 3s = 9 ≤ 10: legal. King survives → counterattack → defend with the rest.
            var r = Must(s.Dispatch(new PlayCards(c3a.PhysicalId, c3b.PhysicalId, c3c.PhysicalId)));
            Check(Get<CardsPlayed>(r).BaseAttack == 9, "three 3s should total 9");
            Check(s.State.PendingChoice?.Kind == PendingChoiceKind.Defend, "King should counterattack");
            // The 3♠ in the play built shield 9 → net 20−9 = 11. Pay with the non-aces (4+6+6 = 16).
            Must(s.Dispatch(new DefendDiscard(c4.PhysicalId, c6a.PhysicalId, c6b.PhysicalId)));

            // Two aces are a legal same-rank set (total 2).
            var r2 = Must(s.Dispatch(new PlayCards(a1.PhysicalId, a2.PhysicalId)));
            Check(Get<CardsPlayed>(r2).BaseAttack == 2, "two aces should total 2");
        }

        private static void TestClubsDoubleAndRecruit()
        {
            var s = NewRun("recruit");
            int ownedBefore = s.State.OwnedCards.Count;
            Fight(s, EnemyState.Number(Suit.Spades, Rank.Six, EnemyTier.Skirmish)); // 18 hp, atk 3
            ClearHand(s);
            var c9 = Give(s, Suit.Clubs, Rank.Nine);

            var r = Must(s.Dispatch(new PlayCards(c9.PhysicalId)));
            Check(Get<DamageDealt>(r).Amount == 18, "9♣ should deal 18 (doubled)");
            Check(Get<DamageDealt>(r).Doubled, "♣ play should be flagged doubled");
            Check(Get<EnemyKilled>(r).Kind == KillKind.Exact, "18 vs 18 hp is an exact kill");
            Check(Has<Recruited>(r), "exact kill of unowned 6♠ should recruit");
            Check(Has<EncounterWon>(r), "last enemy dead → fight won");
            Check(!Has<CounterattackIncoming>(r), "no counterattack after a kill");

            Check(s.State.OwnedCards.Count == ownedBefore + 2, "owned should grow by 9♣ (given) + 6♠ (recruit)");
            int recruitId = Get<Recruited>(r).PhysicalId;
            Check(s.State.Deck.Tavern.Contains(recruitId), "recruit should be shuffled into the Tavern");
            var rec = s.State.Cards.Get(recruitId);
            Check(rec.Printed.Suit == Suit.Spades && rec.Printed.Rank == Rank.Six, "recruit face should be 6♠");
            Check(s.State.Phase == CampaignPhase.Road, "back to road after the win");
        }

        private static void TestImmunity()
        {
            var s = NewRun("immunity");
            Fight(s, EnemyState.Number(Suit.Clubs, Rank.Six, EnemyTier.Skirmish)); // ♣-immune, 18 hp, atk 3
            ClearHand(s);
            var c9 = Give(s, Suit.Clubs, Rank.Nine);
            Give(s, Suit.Hearts, Rank.Two);
            Give(s, Suit.Spades, Rank.Three);

            var r = Must(s.Dispatch(new PlayCards(c9.PhysicalId)));
            Check(Get<CardsPlayed>(r).BlockedSuit == Suit.Clubs, "♣ power should be blocked vs a ♣ enemy");
            Check(Get<DamageDealt>(r).Amount == 9, "value still counts: 9 damage, not 18");
            Check(s.State.Encounter.Current.Hp == 9, "enemy at 18-9=9 hp");
            Check(s.State.PendingChoice?.Kind == PendingChoiceKind.Defend, "survivor counterattacks");
        }

        private static void TestSpadesShield()
        {
            var s = NewRun("shield");
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.Jack, EnemyTier.Boss)); // 20 hp, atk 10
            ClearHand(s);
            var s5a = Give(s, Suit.Spades, Rank.Five);
            var s5b = Give(s, Suit.Spades, Rank.Five);

            var r = Must(s.Dispatch(new PlayCards(s5a.PhysicalId, s5b.PhysicalId)));
            Check(Get<ShieldGained>(r).Total == 10, "pair of 5♠ should build shield 10");
            Check(Has<CounterattackBlocked>(r), "atk 10 − shield 10 = 0 → fully blocked");
            Check(s.State.PendingChoice == null, "no defend needed when fully shielded");
            Check(s.State.Encounter.Current.Hp == 10, "10 damage dealt alongside the shield");
        }

        private static void TestHeartsRecover()
        {
            var s = NewRun("hearts");
            Fight(s, EnemyState.Number(Suit.Spades, Rank.Six, EnemyTier.Skirmish)); // ♥ power allowed
            ClearHand(s);
            // Stage a known discard of 5 cards.
            for (int i = 0; i < 5; i++)
            {
                var c = s.State.Cards.Mint(Suit.Clubs, Rank.Two);
                s.State.OwnedCards.Add(c.PhysicalId);
                s.State.Deck.Discard.Add(c.PhysicalId);
            }
            var h4 = Give(s, Suit.Hearts, Rank.Four);
            Give(s, Suit.Spades, Rank.Three); // to survive the counterattack

            int tavernBefore = s.State.Deck.Tavern.Count;
            var r = Must(s.Dispatch(new PlayCards(h4.PhysicalId)));
            Check(Get<CardsRecovered>(r).Count == 4, "recover min(4, 5) = 4 cards");
            Check(s.State.Deck.Tavern.Count == tavernBefore + 4, "recovered cards should join the Tavern");
            // 5 staged − 4 recovered + the played 4♥ = 2 in discard.
            Check(s.State.Deck.Discard.Count == 2, $"discard should be 2, got {s.State.Deck.Discard.Count}");
            Must(s.Dispatch(new DefendDiscard(s.State.Deck.Hand.ToList())));
        }

        private static void TestDiamondsDrawCap()
        {
            var s = NewRun("diamonds");
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            ClearHand(s);
            var d5 = Give(s, Suit.Diamonds, Rank.Five);

            var r = Must(s.Dispatch(new PlayCards(d5.PhysicalId)));
            Check(Get<CardsDrawn>(r).PhysicalIds.Count == 5, "empty hand + draw 5 → exactly 5 drawn");
            Check(s.State.Deck.Hand.Count == 5, "hand capped at max hand size");
        }

        private static void TestAcePair()
        {
            var s = NewRun("acepair");
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss)); // ♦/♠ both allowed
            ClearHand(s);
            var ace = Give(s, Suit.Diamonds, Rank.Ace);
            var s4 = Give(s, Suit.Spades, Rank.Four);

            var r = Must(s.Dispatch(new PlayCards(ace.PhysicalId, s4.PhysicalId)));
            Check(Get<CardsPlayed>(r).BaseAttack == 5, "A + 4 = 5");
            Check(Get<ShieldGained>(r).Amount == 5, "♠ from the partner fires");
            Check(Has<CardsDrawn>(r), "♦ from the ace fires");
        }

        private static void TestDefend()
        {
            var s = NewRun("defend");
            Fight(s, EnemyState.Number(Suit.Spades, Rank.Ten, EnemyTier.Veteran)); // 30 hp, atk 6
            ClearHand(s);
            var c2 = Give(s, Suit.Clubs, Rank.Two);
            var h3 = Give(s, Suit.Hearts, Rank.Three);
            var d4 = Give(s, Suit.Diamonds, Rank.Four);

            var r = Must(s.Dispatch(new Yield()));
            Check(Get<CounterattackIncoming>(r).NetAttack == 6, "yield → full counterattack of 6");

            MustFail(s.Dispatch(new PlayCards(c2.PhysicalId)), "cannot play while defend pending");
            MustFail(s.Dispatch(new DefendDiscard(c2.PhysicalId, h3.PhysicalId)), "2+3=5 < 6 under-pays");

            var r2 = Must(s.Dispatch(new DefendDiscard(h3.PhysicalId, d4.PhysicalId)));
            Check(Get<Defended>(r2).Paid == 7, "3+4 = 7 covers 6");
            Check(s.State.PendingChoice == null, "defend resolved");
            Check(s.State.Deck.Hand.Count == 1 && s.State.Deck.Hand[0] == c2.PhysicalId,
                "only the unspent card remains in hand");
        }

        private static void TestDeath()
        {
            var s = NewRun("death");
            Fight(s, EnemyState.Royal(Suit.Spades, Rank.King, EnemyTier.Gate)); // atk 20
            ClearHand(s);
            Give(s, Suit.Clubs, Rank.Two);

            var r = Must(s.Dispatch(new Yield()));
            Check(Has<PlayerDied>(r), "hand value 2 cannot cover 20 → death");
            Check(s.State.Phase == CampaignPhase.CampaignLost, "phase should be CampaignLost");
            Check(!s.State.Hero.Alive, "hero dead");
            MustFail(s.Dispatch(new Yield()), "no actions after death");
        }

        private static void TestOverkillNoReward()
        {
            var s = NewRun("overkill");
            Fight(s, EnemyState.Number(Suit.Spades, Rank.Six, EnemyTier.Skirmish)); // 18 hp
            ClearHand(s);
            var c10 = Give(s, Suit.Clubs, Rank.Ten);
            int ownedBefore = s.State.OwnedCards.Count;

            var r = Must(s.Dispatch(new PlayCards(c10.PhysicalId)));
            Check(Get<DamageDealt>(r).Amount == 20, "10♣ doubled = 20 vs 18 hp");
            Check(Get<EnemyKilled>(r).Kind == KillKind.Overkill, "hp < 0 is an overkill");
            Check(!Has<Recruited>(r) && !Has<GraftOffered>(r), "overkill must give no reward");
            Check(s.State.OwnedCards.Count == ownedBefore, "owned unchanged after overkill");
            Check(Has<EncounterWon>(r), "fight still won");
        }

        private static void TestGraftSuitAdd()
        {
            var s = NewRun("graft-add");
            OwnInTavern(s, Suit.Spades, Rank.Six); // already own a 6♠ → next 6♠ kill is redundant
            Fight(s, EnemyState.Number(Suit.Spades, Rank.Six, EnemyTier.Skirmish));
            ClearHand(s);
            var c9 = Give(s, Suit.Clubs, Rank.Nine);
            var h5 = Give(s, Suit.Hearts, Rank.Five);
            var s3 = Give(s, Suit.Spades, Rank.Three);

            var r = Must(s.Dispatch(new PlayCards(c9.PhysicalId)));
            Check(Has<GraftOffered>(r), "redundant exact kill should offer a graft");
            Check(!Has<Recruited>(r), "no recruit on a redundant kill");
            Check(s.State.PendingChoice?.Kind == PendingChoiceKind.GraftSelect, "graft choice pending");
            Check(!Has<EncounterWon>(r), "win deferred until the graft resolves");

            MustFail(s.Dispatch(new PlayCards(h5.PhysicalId)), "cannot play while graft pending");
            MustFail(s.Dispatch(new ChooseGraft(s3.PhysicalId, GraftBranch.AddSuit)),
                "suit-add ♠ onto a ♠ card is a no-op");
            Check(s.State.PendingChoice != null, "rejected no-op keeps the choice pending");

            var r2 = Must(s.Dispatch(new ChooseGraft(h5.PhysicalId, GraftBranch.AddSuit)));
            Check(Has<GraftApplied>(r2), "graft applied");
            Check(Has<EncounterWon>(r2), "fight completes after the graft");
            var suits = s.State.Cards.Get(h5.PhysicalId).EffectiveSuits();
            Check(suits.Contains(Suit.Hearts) && suits.Contains(Suit.Spades) && suits.Count == 2,
                "5♥ should now fire ♥ and ♠");
            Check(s.State.Cards.Get(h5.PhysicalId).Printed.Suit == Suit.Hearts,
                "printed face never changes");
        }

        private static void TestGraftRankCap()
        {
            var s = NewRun("graft-cap");
            OwnInTavern(s, Suit.Diamonds, Rank.Jack); // own a J♦ → killing the J♦ duel grafts
            Fight(s, EnemyState.Royal(Suit.Diamonds, Rank.Jack, EnemyTier.Elite)); // 20 hp
            ClearHand(s);
            var c10 = Give(s, Suit.Clubs, Rank.Ten);
            var h4 = Give(s, Suit.Hearts, Rank.Four);

            Must(s.Dispatch(new PlayCards(c10.PhysicalId))); // 10♣ doubled = 20 → exact
            var r = Must(s.Dispatch(new ChooseGraft(h4.PhysicalId, GraftBranch.ReplaceRank)));
            var eff = s.State.Cards.Get(h4.PhysicalId).EffectiveFace();
            Check(eff.Rank == Rank.Ten, $"Jack rank graft must cap at 10, got {eff.Rank}");
            Check(s.State.Cards.Get(h4.PhysicalId).EffectiveValue() == 10, "effective value 10");
        }

        private static void TestMultiEnemy()
        {
            var s = NewRun("lineup");
            Fight(s,
                EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish),  // 18 hp
                EnemyState.Number(Suit.Spades, Rank.Seven, EnemyTier.Veteran)); // 21 hp
            ClearHand(s);
            var c9 = Give(s, Suit.Clubs, Rank.Nine);
            Give(s, Suit.Diamonds, Rank.Five);

            var r = Must(s.Dispatch(new PlayCards(c9.PhysicalId)));
            Check(Has<EnemyKilled>(r), "first enemy dies to 18");
            Check(Has<NextEnemy>(r), "second enemy steps up");
            Check(!Has<EncounterWon>(r), "fight not over yet");
            Check(!Has<CounterattackIncoming>(r) && s.State.PendingChoice == null,
                "same player plays again immediately — no counterattack after a kill");
            Check(s.State.Encounter.Current.Rank == Rank.Seven, "current enemy is the 7♠");
        }

        private static void TestValidateThenMutate()
        {
            var s = NewRun("immutable");
            Fight(s, EnemyState.Number(Suit.Spades, Rank.Six, EnemyTier.Skirmish));

            var handBefore = s.State.Deck.Hand.ToList();
            var tavernBefore = s.State.Deck.Tavern.ToList();
            uint rngBefore = s.State.RngState;
            int hpBefore = s.State.Encounter.Current.Hp;

            MustFail(s.Dispatch(new PlayCards(9999)), "unknown card");
            MustFail(s.Dispatch(new DefendDiscard(handBefore[0])), "no defend pending");
            MustFail(s.Dispatch(new ChooseGraft(handBefore[0], GraftBranch.AddSuit)), "no graft pending");

            Check(s.State.Deck.Hand.SequenceEqual(handBefore), "hand untouched by failed actions");
            Check(s.State.Deck.Tavern.SequenceEqual(tavernBefore), "tavern untouched");
            Check(s.State.RngState == rngBefore, "rng cursor untouched");
            Check(s.State.Encounter.Current.Hp == hpBefore, "enemy untouched");
        }

        private static void TestSessionDeterminism()
        {
            var a = NewRun("det-seed");
            var b = NewRun("det-seed");
            Check(a.State.Deck.Tavern.SequenceEqual(b.State.Deck.Tavern), "same seed → same tavern order");
            Check(a.State.Deck.Hand.SequenceEqual(b.State.Deck.Hand), "same seed → same opening hand");
            Check(a.State.RngState == b.State.RngState, "same seed → same rng cursor");

            foreach (var s in new[] { a, b })
            {
                Fight(s, EnemyState.Number(Suit.Spades, Rank.Six, EnemyTier.Skirmish));
                ClearHand(s);
                var c = Give(s, Suit.Clubs, Rank.Nine);
                Must(s.Dispatch(new PlayCards(c.PhysicalId)));
            }
            Check(a.State.Deck.Tavern.SequenceEqual(b.State.Deck.Tavern),
                "recruit shuffle position must be deterministic");
            Check(a.State.TokenFragments == b.State.TokenFragments, "fragment roll must be deterministic");
            Check(a.State.RngState == b.State.RngState, "cursors still in lockstep");
        }

        private static void TestFragmentDropRate()
        {
            int drops = 0;
            for (int i = 0; i < 60; i++)
            {
                var s = NewRun($"frag-{i}");
                Fight(s, EnemyState.Number(Suit.Spades, Rank.Six, EnemyTier.Skirmish));
                ClearHand(s);
                var c = Give(s, Suit.Clubs, Rank.Nine);
                Must(s.Dispatch(new PlayCards(c.PhysicalId)));
                drops += s.State.TokenFragments;
            }
            Check(drops > 15 && drops < 45, $"expected ≈30/60 fragment drops, got {drops}");
        }

        // ── demo: a full scripted fight, played back like the UI would ─────────

        private static void DemoFight()
        {
            Console.WriteLine("── DEMO: scripted fight (seed \"kingfall\") ──────────────────");
            var s = new GameSession("kingfall");
            Play(s, new SelectClass("sentinel", "hold_the_line"));

            Console.WriteLine($"  Hand: {string.Join("  ", s.State.Deck.Hand.Select(id => s.State.Cards.Get(id)))}");
            Play(s, new StartEncounter(EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish)));

            // Simple bot: play the highest card; cover counterattacks cheapest-first.
            int guard = 0;
            while (s.State.Phase == CampaignPhase.Encounter && guard++ < 60)
            {
                if (s.State.PendingChoice?.Kind == PendingChoiceKind.Defend)
                {
                    var pay = new List<int>();
                    int need = s.State.PendingChoice.RequiredValue, sum = 0;
                    foreach (int id in s.State.Deck.Hand.OrderBy(id => s.State.Cards.Get(id).EffectiveValue()))
                    {
                        pay.Add(id); sum += s.State.Cards.Get(id).EffectiveValue();
                        if (sum >= need) break;
                    }
                    Play(s, new DefendDiscard(pay));
                }
                else if (s.State.PendingChoice?.Kind == PendingChoiceKind.GraftSelect)
                {
                    Play(s, new ChooseGraft(s.State.Deck.Hand[0], GraftBranch.ReplaceRank));
                }
                else if (s.State.Deck.Hand.Count > 0)
                {
                    var hand = s.State.Deck.Hand.Select(id => s.State.Cards.Get(id)).ToList();
                    var enemy = s.State.Encounter.Current;
                    int net = Math.Max(0, enemy.Attack - enemy.Shield);
                    int handValue = hand.Sum(c => c.EffectiveValue());

                    // 1. Take an exact kill if a single card lands it (the reward trigger).
                    var choice = hand.FirstOrDefault(c => DamageOf(c, enemy) == enemy.Hp);
                    // 2. Build shield until the counterattack is fully absorbed.
                    if (choice == null && net > 0)
                        choice = hand.Where(c => c.FiresSuit(Suit.Spades) && enemy.ImmuneSuit != Suit.Spades)
                                     .OrderByDescending(c => c.EffectiveValue()).FirstOrDefault();
                    // 3. Refill via ♦ when running thin.
                    if (choice == null && hand.Count <= 3)
                        choice = hand.Where(c => c.FiresSuit(Suit.Diamonds) && enemy.ImmuneSuit != Suit.Diamonds)
                                     .OrderByDescending(c => c.EffectiveValue()).FirstOrDefault();
                    // 4. Biggest hit that either finishes the enemy or leaves enough to defend.
                    if (choice == null)
                        choice = hand.Where(c => DamageOf(c, enemy) >= enemy.Hp ||
                                                 handValue - c.EffectiveValue() >= net)
                                     .OrderByDescending(c => DamageOf(c, enemy)).FirstOrDefault()
                                 ?? hand.OrderByDescending(c => DamageOf(c, enemy)).First();

                    Play(s, new PlayCards(choice.PhysicalId));
                }
                else
                {
                    Play(s, new Yield());
                }
            }

            Console.WriteLine($"  Final phase: {s.State.Phase} · owned {s.State.OwnedCards.Count} cards · " +
                              $"fragments {s.State.TokenFragments} · rng cursor {s.State.RngState}");
        }

        private static int DamageOf(PhysicalCard c, EnemyState enemy)
        {
            int v = c.EffectiveValue();
            bool doubled = c.FiresSuit(Suit.Clubs) && enemy.ImmuneSuit != Suit.Clubs;
            return doubled ? v * 2 : v;
        }

        private static void Play(GameSession s, IAction a)
        {
            var enemy = s.State.Encounter?.Current;
            string ctx = enemy != null ? $"  [vs {enemy}] " : "  ";
            var r = s.Dispatch(a);
            if (!r.Ok)
            {
                Console.WriteLine($"{ctx}{a.GetType().Name} → REJECTED: {r.Error}");
                return;
            }
            foreach (var e in r.Events) Console.WriteLine($"{ctx}{e}");
        }
    }
}
