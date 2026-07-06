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
            Run("class/staff validation + map shape & visibility", TestMapShape);
            Run("road navigation: one-way, band-correct lineups", TestRoadNavigation);
            Run("camp: 4-part bundle armed and consumed", TestCamp);
            Run("hunt: chase a missing recruit", TestHunt);
            Run("boss → seam rest → next chapter", TestChapterFlow);
            Run("full C1 clear → Continent 2, rung lit, gate fields four jacks", TestFullC1ToC2);
            Run("road walk determinism across sessions", TestRoadDeterminism);
            Run("jack gate: keep 3 — name the one to leave", TestJackGate);
            Run("queen gate: two sequential keeps", TestQueenGate);
            Run("king gate: the crown finalizes victory", TestKingGateCrown);
            Run("gate overkills banished; auto-keep when eligible ≤ target", TestGateOverkillBanish);
            Run("gate graft resolves before the queued keep", TestGateGraftQueue);
            Run("depot rung: +2 max hand on entering C2", TestDepotRung);
            Run("conscript rung: recruits enter the hand", TestConscriptRung);
            Run("bastion rung: excess shield carries forward", TestBastionRung);
            Run("renewal rung: 3+ card pay recovers the best discard", TestRenewalRung);
            Run("full campaign: crowned at the King Gate, six royals kept", TestFullCampaign);
            Run("staff: hold the line (once/enemy ♠ shield from discard)", TestHoldTheLine);
            Run("staff: reinforce (same-rank set + one ♠ of any rank)", TestReinforce);
            Run("staff: footwork (bury a ♠, draw 1)", TestFootwork);
            Run("staff: parry (pay-step ♠ spend)", TestParry);
            Run("staff: steady hand (skip the ♣ double)", TestSteadyHand);
            Run("staff: whetstone (once/enemy overshoot shave)", TestWhetstone);
            Run("staff: bloodletting (bank ⌊v/2⌋ onto the next attack)", TestBloodletting);
            Run("staff: field promotion (recruits enter the hand)", TestFieldPromotion);
            Run("staff: dovetail (same-rank set + one adjacent card)", TestDovetail);
            Run("staff: ace in the hole (Ace at partner value)", TestAceInHole);
            Run("staff: stockpile (hand cap +1 this enemy)", TestStockpile);
            Run("staff: provisioner (discard 1, draw 1)", TestProvisioner);
            Run("staff: triage (player-chosen recovery)", TestTriage);
            Run("staff: last rites (one recovered card to hand, once/enemy)", TestLastRites);
            Run("staff: transfuse (♥ play shields instead of recovering)", TestTransfuse);
            Run("staff: field dressing (first recovery +1)", TestFieldDressing);
            Run("fallen heroes: one staff per class, free repeatable swap", TestFallenHeroes);
            Run("spells: forge 2→1 and bracelet arming rules", TestForgeAndBracelet);
            Run("spells: cast-to-empty, one per suit per combat", TestCastRules);
            Run("spells: keen edge doubles the next attack", TestKeenEdge);
            Run("spells: commit allows one extra card under the cap", TestCommit);
            Run("spells: quick muster and the life-saving rally", TestQuickMusterAndRally);
            Run("spells: guard up ignores suit immunity", TestGuardUpImmunity);
            Run("spells: brace during the pay step", TestBrace);
            Run("spells: refit and full recycle", TestRefitRecycle);
            Run("relics: lair raid pick-1-of-2, bag, slots, free swaps", TestLairAndEquip);
            Run("relics: caravan pay-from-hand + caravan coin", TestCaravan);
            Run("relics: hoard and interest (ring passives)", TestHoardInterest);
            Run("relics: debt instalments and last coin", TestDebtLastCoin);
            Run("relics: requisition writ, liquidate, double or nothing", TestRingActives);
            Run("relics: forked road and forced march", TestForkedRoadForcedMarch);
            Run("relics: bedroll, slip away, vanguard", TestCloakActives);
            Run("relics: press-gang, promotion, black standard, apprentice, rallying cry", TestHatRecruits);
            Run("relics: conscription, plunder, muster", TestHatEdgeCases);
            Run("relics: scalpel, unbinding, second wind, aegis", TestAmuletsOne);
            Run("relics: bloodlust, echo, lodestone", TestAmuletsTwo);
            Run("sanctum: move a graft once per visit; shrine blessing", TestSanctumShrine);
            Run("meta/lineage: outcomes banked, JSON round-trip, corrupt-safe", TestMeta);
            Run("ValidatePlay: pure legality preview matches dispatch", TestValidatePlay);
            Run("killing blow still fires suit powers (draw/recover/shield)", TestKillingBlowEffects);
            Run("roads: sparse committed lanes, everything reachable, no dead ends", TestSparseLanes);

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

        private static GameSession NewRun(string seed) => NewRunAs("sentinel", "hold_the_line", seed);

        private static GameSession NewRunAs(string classId, string staffId, string seed)
        {
            var s = new GameSession(seed);
            Must(s.Dispatch(new SelectClass(classId, staffId)));
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

        /// <summary>Stage a royal-gate fight directly (StartEncounter can't flag gates).</summary>
        private static void GateFight(GameSession s, Rank rank, params Suit[] suits)
        {
            Fight(s, suits.Select(suit => EnemyState.Royal(suit, rank, EnemyTier.Gate)).ToArray());
            s.State.Encounter.IsGate = true;
            s.State.Encounter.GateRank = rank;
        }

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

        // ── step-4 tests: roads, camps, hunts, chapters ─────────────────────────

        /// <summary>Win the current fight by staging exact kills (fight math is tested elsewhere).</summary>
        private static void WinFight(GameSession s)
        {
            int guard = 0;
            while (s.State.Phase == CampaignPhase.Encounter && guard++ < 20)
            {
                if (s.State.PendingChoice != null) throw new Exception($"unexpected pending {s.State.PendingChoice.Kind}");
                var enemy = s.State.Encounter.Current;
                bool clubOk = enemy.Suit != Suit.Clubs;
                int dmg = 9 * (clubOk ? 2 : 1) * (s.State.Encounter.FirstAttackDouble ? 2 : 1);
                enemy.Hp = dmg; // stage an exact kill
                ClearHand(s);
                var c = Give(s, Suit.Clubs, Rank.Nine);
                Must(s.Dispatch(new PlayCards(c.PhysicalId)));
            }
            if (s.State.Phase == CampaignPhase.Encounter) throw new Exception("fight did not resolve");
        }

        /// <summary>Walk the current chapter road to its boss, winning every fight.</summary>
        private static void WalkChapter(GameSession s)
        {
            var priority = new[]
            {
                RoadNodeKind.Boss, RoadNodeKind.Skirmish, RoadNodeKind.Veteran, RoadNodeKind.Elite,
                RoadNodeKind.Recruit, RoadNodeKind.Camp, RoadNodeKind.Lair, RoadNodeKind.Event,
                RoadNodeKind.Heroes, RoadNodeKind.Forge, RoadNodeKind.Sanctum, RoadNodeKind.Caravan,
                RoadNodeKind.Shrine, RoadNodeKind.Hunt, // a lane can force the Hunt
            };
            int guard = 0;
            while (s.State.Phase == CampaignPhase.Road && guard++ < 30)
            {
                var next = s.State.Map.Current.Next.Select(id => s.State.Map.Get(id)).ToList();
                if (next.Count == 0) throw new Exception("road dead-ended");
                var target = priority.Select(k => next.FirstOrDefault(n => n.Kind == k)).FirstOrDefault(n => n != null);
                if (target == null) return; // only the Gate ahead — caller's business
                Must(s.Dispatch(new MoveToNode(target.Id)));
                ResolveStop(s);
            }
        }

        private static void TestMapShape()
        {
            MustFail(new GameSession("x").Dispatch(new SelectClass("warlock", "hold_the_line")), "unknown class");
            MustFail(new GameSession("x").Dispatch(new SelectClass("sentinel", "dovetail")), "staff from wrong class");

            var s = NewRun("mapshape");
            var map = s.State.Map;
            Check(map != null && map.Chapter == 1, "chapter-1 map generated at run start");
            Check(map.Nodes.Count == 12, $"C1 template should have 12 nodes, got {map.Nodes.Count}");
            Check(map.Nodes.Any(n => n.Kind == RoadNodeKind.Forge) &&
                  map.Nodes.Any(n => n.Kind == RoadNodeKind.Caravan), "economy fork present");
            Check(map.Current.Kind == RoadNodeKind.Start && map.Current.Visited, "run starts at the start node");
            Check(map.Nodes.Count(n => n.Kind == RoadNodeKind.Boss) == 1, "exactly one boss");
            Check(map.Nodes.Any(n => n.Kind == RoadNodeKind.Hunt), "C1 province guarantees a Hunt");
            Check(map.Nodes.Count(n => n.Kind == RoadNodeKind.Camp) == 2, "two camps (bonus fork + safe fork)");
            Check(map.Nodes.Any(n => n.Kind == RoadNodeKind.Lair), "lair-vs-safe fork present");

            foreach (int id in map.Current.Next)
                Check(map.Get(id).Known, "neighbors of the start are known");
            var boss = map.Nodes.First(n => n.Kind == RoadNodeKind.Boss);
            Check(!boss.Known, "the boss is a '?' until approached");
            int lastLayer = map.Nodes.Max(n => n.Layer);
            Check(map.Nodes.Where(n => n.Layer < lastLayer).All(n => n.Next.Count > 0),
                "no dead ends before the boss");
        }

        private static void TestRoadNavigation()
        {
            var s = NewRun("roadnav");
            var map = s.State.Map;
            var boss = map.Nodes.First(n => n.Kind == RoadNodeKind.Boss);
            MustFail(s.Dispatch(new MoveToNode(boss.Id)), "cannot jump to a non-adjacent node");
            MustFail(s.Dispatch(new MoveToNode(map.CurrentNodeId)), "cannot re-enter the current node");

            int skirmishId = map.Current.Next[0];
            Check(map.Get(skirmishId).Kind == RoadNodeKind.Skirmish, "layer 1 is the guaranteed fight");
            var r = Must(s.Dispatch(new MoveToNode(skirmishId)));
            Check(Has<EncounterStarted>(r), "fight node starts an encounter");
            Check(s.State.Encounter.Current.Rank == Rank.Six, "ch1 skirmish fields a 6");

            MustFail(s.Dispatch(new MoveToNode(boss.Id)), "cannot travel mid-fight");
            WinFight(s);
            Check(s.State.Phase == CampaignPhase.Road, "back on the road after the win");
            Check(s.State.Map.CurrentNodeId == skirmishId, "standing on the cleared node");
            Check(s.State.OwnsFace(new CardFace(Suit.Clubs, Rank.Six)) ||
                  s.State.OwnedCards.Count > 21, "the exact kill recruited (or grafted)");
        }

        private static void TestCamp()
        {
            var s = NewRun("camptest");
            Must(s.Dispatch(new MoveToNode(s.State.Map.Current.Next[0])));
            WinFight(s); // leaves staged cards in the discard
            Check(s.State.Deck.Discard.Count > 0, "discard non-empty before camping");

            var camp = s.State.Map.Current.Next.Select(id => s.State.Map.Get(id))
                        .First(n => n.Kind == RoadNodeKind.Camp);
            var r = Must(s.Dispatch(new MoveToNode(camp.Id)));
            Check(Has<CampRested>(r), "camp fires");
            Check(s.State.Deck.Discard.Count == 0, "camp reshuffles discard into the Tavern");
            Check(s.State.Deck.Hand.Count == 5, "camp draws the hand to full");
            Check(s.State.NextFightFirstAttackDouble && s.State.NextFightStartShield == 10,
                "double-first-attack and 10 block armed");

            var fight = s.State.Map.Current.Next.Select(id => s.State.Map.Get(id))
                         .First(n => n.Kind == RoadNodeKind.Veteran);
            Must(s.Dispatch(new MoveToNode(fight.Id)));
            Check(s.State.Encounter.Current.Shield == 10, "first enemy starts with 10 shield");
            Check(!s.State.NextFightFirstAttackDouble && s.State.NextFightStartShield == 0,
                "camp bonuses consumed at fight start");

            s.State.Encounter.Current.Hp = 8; // 4♥ doubled by the camp bonus = 8 → exact
            ClearHand(s);
            var h4 = Give(s, Suit.Hearts, Rank.Four);
            var r2 = Must(s.Dispatch(new PlayCards(h4.PhysicalId)));
            Check(Get<DamageDealt>(r2).Amount == 8, "camp doubles the fight's first attack (4 → 8)");
            Check(!Get<DamageDealt>(r2).Doubled, "not the ♣ double — the camp one");
        }

        private static void TestHunt()
        {
            var s = NewRun("hunttest");
            Must(s.Dispatch(new MoveToNode(s.State.Map.Current.Next[0])));
            WinFight(s);
            var safe = s.State.Map.Current.Next.Select(id => s.State.Map.Get(id))
                        .First(n => n.Kind == RoadNodeKind.Camp);
            Must(s.Dispatch(new MoveToNode(safe.Id)));

            var hunt = s.State.Map.Current.Next.Select(id => s.State.Map.Get(id))
                        .First(n => n.Kind == RoadNodeKind.Hunt);
            var r = Must(s.Dispatch(new MoveToNode(hunt.Id)));
            Check(Has<HuntOffered>(r), "hunt offers quarry");
            Check(s.State.PendingChoice?.Kind == PendingChoiceKind.HuntSelect, "hunt choice pending");
            var options = s.State.PendingChoice.HuntOptions;
            Check(options.All(f => (int)f.Rank >= 6 && (int)f.Rank <= 7), "ch1 quarry stays in the 6–7 band");
            Check(options.All(f => !s.State.OwnsFace(f)), "quarry must be faces the player is missing");

            MustFail(s.Dispatch(new MoveToNode(s.State.Map.Current.Next[0])), "cannot walk away from a pending hunt");
            MustFail(s.Dispatch(new ChooseHunt(Suit.Clubs, Rank.Five)), "owned/low rank is not quarry");
            MustFail(s.Dispatch(new ChooseHunt(Suit.Clubs, Rank.Eight)), "rank 8 is beyond the ch1 band");

            var quarry = options[0];
            var r2 = Must(s.Dispatch(new ChooseHunt(quarry.Suit, quarry.Rank)));
            Check(Has<EncounterStarted>(r2), "the chase is a fight");
            Check(s.State.Encounter.Current.Suit == quarry.Suit && s.State.Encounter.Current.Rank == quarry.Rank,
                "fighting exactly the chosen quarry");
            WinFight(s);
            Check(s.State.OwnsFace(quarry), "exact kill recruited the hunted card");
        }

        private static void TestChapterFlow()
        {
            var s = NewRun("chapterflow");
            WalkChapter(s);
            Check(s.State.Phase == CampaignPhase.ChapterComplete, "boss kill completes the chapter");
            Check(s.State.Deck.Discard.Count == 0, "seam rest reshuffled the discard");
            Check(s.State.Deck.Hand.Count == 5, "seam rest drew the hand to full");

            MustFail(s.Dispatch(new MoveToNode(0)), "cannot walk during the recap");
            var r = Must(s.Dispatch(new ContinueRun()));
            Check(Has<MapGenerated>(r), "next chapter road generated");
            Check(s.State.Chapter == 2 && s.State.Continent == 1 && s.State.Province == 2,
                "advanced to chapter 2 / province 2");
            Check(s.State.Phase == CampaignPhase.Road, "back on the road");

            Must(s.Dispatch(new MoveToNode(s.State.Map.Current.Next[0])));
            Check(s.State.Encounter.Current.Rank == Rank.Eight, "ch2 skirmish fields an 8");
        }

        private static void TestFullC1ToC2()
        {
            var s = NewRun("fullc1");
            for (int ch = 1; ch <= 3; ch++)
            {
                Check(s.State.Chapter == ch, $"on chapter {ch}");
                WalkChapter(s);
                Check(s.State.Phase == CampaignPhase.ChapterComplete, $"chapter {ch} completed");
                Must(s.Dispatch(new ContinueRun()));
            }

            Check(s.State.Chapter == 4 && s.State.Continent == 2 && s.State.Province == 1,
                "Continent 2 begins at chapter 4");
            Check(s.State.Hero.PathC2 == "bastion", "Sentinel's home rung lights on entering C2");
            Check(s.State.Map.Nodes.Any(n => n.Kind == RoadNodeKind.Gate), "C2 road ends in a royal gate");

            // Walk ch4 to the royal duel and confirm it fields a Jack.
            Must(s.Dispatch(new MoveToNode(s.State.Map.Current.Next[0])));
            WinFight(s);
            var l2 = s.State.Map.Current.Next.Select(id => s.State.Map.Get(id)).ToList();
            Must(s.Dispatch(new MoveToNode(l2.First(n => n.Kind == RoadNodeKind.Camp).Id)));
            var duel = s.State.Map.Current.Next.Select(id => s.State.Map.Get(id))
                        .First(n => n.Kind == RoadNodeKind.Elite);
            Must(s.Dispatch(new MoveToNode(duel.Id)));
            Check(s.State.Encounter.Current.Rank == Rank.Jack, "ch4 road duel is a Jack");
            Check(s.State.Encounter.Current.MaxHp == 20 && s.State.Encounter.Current.Attack == 10,
                "royal stats 20/10");
            WinFight(s);

            // The gate is live: entering fields all four Jacks as sequential duels.
            WalkChapter(s);
            var gate = s.State.Map.Current.Next.Select(id => s.State.Map.Get(id))
                        .FirstOrDefault(n => n.Kind == RoadNodeKind.Gate);
            Check(gate != null, "gate reachable at the end of the ch4 road");
            Must(s.Dispatch(new MoveToNode(gate.Id)));
            Check(s.State.Encounter.IsGate && s.State.Encounter.GateRank == Rank.Jack, "gate fight flagged");
            Check(s.State.Encounter.Enemies.Count == 4 && s.State.Encounter.Enemies.All(e => e.Rank == Rank.Jack),
                "the Jack Gate fields all four Jacks");
            Check(s.State.Encounter.Enemies.Select(e => e.Suit).Distinct().Count() == 4, "one Jack per suit");
        }

        private static void TestRoadDeterminism()
        {
            var a = NewRun("roadseed");
            var b = NewRun("roadseed");
            Check(a.State.Map.Nodes.Select(n => n.Kind).SequenceEqual(b.State.Map.Nodes.Select(n => n.Kind)),
                "same seed → same map layout");

            foreach (var s in new[] { a, b }) { WalkChapter(s); Must(s.Dispatch(new ContinueRun())); }
            Check(a.State.Map.Nodes.Select(n => n.Kind).SequenceEqual(b.State.Map.Nodes.Select(n => n.Kind)),
                "chapter-2 maps identical");
            Check(a.State.RngState == b.State.RngState, "rng cursors in lockstep after a chapter walk");
            Check(a.State.OwnedCards.Count == b.State.OwnedCards.Count, "identical conquest");
            Check(a.State.Deck.Tavern.SequenceEqual(b.State.Deck.Tavern), "identical tavern order");
        }

        // ── step-5 tests: royal gates, the keep pyramid, victory, home rungs ────

        private static void TestJackGate()
        {
            var s = NewRun("jackgate");
            GateFight(s, Rank.Jack, Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades);
            WinFight(s); // exact-kills every jack (hand emptied per turn → no grafts)

            var pending = s.State.PendingChoice;
            Check(pending?.Kind == PendingChoiceKind.RoyalKeep, "keep pyramid pending after the gate clears");
            Check(pending.PickIsLeave, "the jack pick names the royal to LEAVE");
            Check(pending.PicksRemaining == 1 && pending.Eligible.Count == 4, "one leave pick over four jacks");
            Check(s.State.Encounter == null, "the fight itself is over");

            MustFail(s.Dispatch(new MoveToNode(s.State.Map.Current.Next[0])), "cannot walk during the keep");
            MustFail(s.Dispatch(new ChooseGraft(1, GraftBranch.AddSuit)), "wrong answer kind for the pending keep");

            var r = Must(s.Dispatch(new ChooseRoyal(Suit.Hearts)));
            Check(Get<RoyalLeft>(r).Face.Suit == Suit.Hearts, "the named jack is left behind");
            Check(r.Events.OfType<RoyalKept>().Count() == 3, "the other three jacks follow you");
            Check(Has<ChapterCompleted>(r) && Has<SeamRestApplied>(r), "gate ends the chapter with a seam rest");
            Check(s.State.Phase == CampaignPhase.ChapterComplete, "on the recap screen");

            Check(!s.State.OwnsFace(new CardFace(Suit.Hearts, Rank.Jack)), "left jack never joins the deck");
            foreach (var suit in new[] { Suit.Clubs, Suit.Diamonds, Suit.Spades })
                Check(s.State.OwnsFace(new CardFace(suit, Rank.Jack)), $"kept J{PhysicalCard.SuitGlyph(suit)} owned");

            MustFail(s.Dispatch(new ChooseRoyal(Suit.Clubs)), "keep already resolved");
        }

        private static void TestQueenGate()
        {
            var s = NewRun("queengate");
            GateFight(s, Rank.Queen, Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades);
            WinFight(s);

            var pending = s.State.PendingChoice;
            Check(pending?.Kind == PendingChoiceKind.RoyalKeep && !pending.PickIsLeave,
                "queen picks are keeps, not leaves");
            Check(pending.PicksRemaining == 2, "keep 2 of 4 = two sequential picks");

            var r1 = Must(s.Dispatch(new ChooseRoyal(Suit.Spades)));
            Check(Get<RoyalKept>(r1).Face.Suit == Suit.Spades, "first pick follows you immediately");
            Check(!Has<ChapterCompleted>(r1), "chapter waits for the second pick");
            Check(s.State.PendingChoice?.PicksRemaining == 1, "one pick left");

            MustFail(s.Dispatch(new ChooseRoyal(Suit.Spades)), "a queen cannot be kept twice");

            var r2 = Must(s.Dispatch(new ChooseRoyal(Suit.Hearts)));
            Check(Get<RoyalKept>(r2).Face.Suit == Suit.Hearts, "second keep");
            Check(r2.Events.OfType<RoyalLeft>().Count() == 2, "the two unpicked queens are left");
            Check(Has<ChapterCompleted>(r2), "gate chapter completes");
            Check(s.State.OwnsFace(new CardFace(Suit.Spades, Rank.Queen)) &&
                  s.State.OwnsFace(new CardFace(Suit.Hearts, Rank.Queen)), "both kept queens owned");
            Check(!s.State.OwnsFace(new CardFace(Suit.Clubs, Rank.Queen)) &&
                  !s.State.OwnsFace(new CardFace(Suit.Diamonds, Rank.Queen)), "left queens not owned");
        }

        private static void TestKingGateCrown()
        {
            var s = NewRun("kinggate");
            GateFight(s, Rank.King, Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades);
            WinFight(s);

            Check(s.State.PendingChoice?.PicksRemaining == 1 && !s.State.PendingChoice.PickIsLeave,
                "one keep pick — the crown");

            var r = Must(s.Dispatch(new ChooseRoyal(Suit.Diamonds)));
            var won = Get<CampaignWonEvent>(r);
            Check(won.Crown?.Suit == Suit.Diamonds && won.Crown?.Rank == Rank.King, "K♦ is the crown");
            Check(r.Events.OfType<RoyalLeft>().Count() == 3, "the other kings are left");
            Check(s.State.Phase == CampaignPhase.CampaignWon, "victory finalized");
            Check(s.State.Hero.Alive, "crowned, not dead");
            Check(s.State.OwnsFace(new CardFace(Suit.Diamonds, Rank.King)), "the crown is a real card");

            MustFail(s.Dispatch(new ContinueRun()), "no continuing past the crown");
            MustFail(s.Dispatch(new MoveToNode(0)), "the run is over");
        }

        private static void TestGateOverkillBanish()
        {
            var s = NewRun("banish");
            GateFight(s, Rank.Queen, Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades);

            // Overkill the first two queens, exact-kill the last two.
            Result last = null;
            int killed = 0;
            while (s.State.Phase == CampaignPhase.Encounter && killed < 8)
            {
                var enemy = s.State.Encounter.Current;
                int dmg = 9 * (enemy.Suit != Suit.Clubs ? 2 : 1);
                enemy.Hp = killed < 2 ? dmg - 1 : dmg; // stage overkill / exact
                ClearHand(s);
                var c = Give(s, Suit.Clubs, Rank.Nine);
                last = Must(s.Dispatch(new PlayCards(c.PhysicalId)));
                killed++;
            }

            Check(s.State.PendingChoice == null, "eligible 2 ≤ keep 2 → no pick needed");
            Check(last.Events.OfType<RoyalKept>().Count() == 2, "both exact-killed queens auto-kept");
            Check(s.State.Phase == CampaignPhase.ChapterComplete, "gate chapter completes without a dialog");
            Check(!s.State.OwnsFace(new CardFace(Suit.Clubs, Rank.Queen)) &&
                  !s.State.OwnsFace(new CardFace(Suit.Diamonds, Rank.Queen)),
                "overkilled queens are banished — never kept");
            Check(s.State.OwnsFace(new CardFace(Suit.Hearts, Rank.Queen)) &&
                  s.State.OwnsFace(new CardFace(Suit.Spades, Rank.Queen)), "exact-killed queens kept");
        }

        private static void TestGateGraftQueue()
        {
            var s = NewRun("gatequeue");
            GateFight(s, Rank.Jack, Suit.Hearts, Suit.Spades); // 2 royals: eligible ≤ 3 → auto-keep after

            // Kill the first jack exactly while holding a spare card → the royal grafts.
            s.State.Encounter.Current.Hp = 18;
            ClearHand(s);
            var c9a = Give(s, Suit.Clubs, Rank.Nine);
            var spare1 = Give(s, Suit.Diamonds, Rank.Five);
            var r1 = Must(s.Dispatch(new PlayCards(c9a.PhysicalId)));
            Check(Has<GraftOffered>(r1), "gate royal exact kill offers a graft (§6)");
            Check(!Has<NextEnemy>(r1), "fight paused for the graft");

            var r2 = Must(s.Dispatch(new ChooseGraft(spare1.PhysicalId, GraftBranch.ReplaceRank)));
            Check(s.State.Cards.Get(spare1.PhysicalId).EffectiveFace().Rank == Rank.Ten,
                "jack graft rank-capped at 10");
            Check(Has<NextEnemy>(r2), "second jack steps up after the graft");

            // Kill the last jack exactly, again holding a spare: the graft resolves
            // FIRST, and only then does the keep pyramid fire — the queue in action.
            s.State.Encounter.Current.Hp = 18;
            ClearHand(s);
            var c9b = Give(s, Suit.Clubs, Rank.Nine);
            var spare2 = Give(s, Suit.Hearts, Rank.Four);
            var r3 = Must(s.Dispatch(new PlayCards(c9b.PhysicalId)));
            Check(Has<GraftOffered>(r3) && !Has<EncounterWon>(r3), "gate clear waits on the graft");

            var r4 = Must(s.Dispatch(new ChooseGraft(spare2.PhysicalId, GraftBranch.AddSuit)));
            Check(Has<GraftApplied>(r4), "graft resolved");
            Check(Has<EncounterWon>(r4), "then the gate clears");
            Check(r4.Events.OfType<RoyalKept>().Count() == 2, "then both jacks auto-keep");
            Check(s.State.PendingChoice == null, "queue drained");
            Check(s.State.OwnsFace(new CardFace(Suit.Hearts, Rank.Jack)) &&
                  s.State.OwnsFace(new CardFace(Suit.Spades, Rank.Jack)), "both gate jacks owned");
        }

        /// <summary>Skip a staged run to the C1→C2 seam and cross it (rung-lighting path).</summary>
        private static Result EnterC2(GameSession s)
        {
            s.State.Chapter = 3;
            s.State.Phase = CampaignPhase.ChapterComplete;
            return Must(s.Dispatch(new ContinueRun()));
        }

        private static void TestDepotRung()
        {
            var s = new GameSession("depot");
            Must(s.Dispatch(new SelectClass("quartermaster", "provisioner")));
            Check(s.State.MaxHandSize == Tuning.BaseMaxHandSize, "base hand size in C1");

            var r = EnterC2(s);
            Check(Has<ContinentEntered>(r), "continent 2 entered");
            Check(s.State.Hero.PathC2 == ClassTables.RungDepot, "quartermaster lights Depot");
            Check(s.State.MaxHandSize == Tuning.BaseMaxHandSize + Tuning.DepotHandBonus,
                "depot raises max hand size by 2");
        }

        private static void TestConscriptRung()
        {
            var s = new GameSession("conscript");
            Must(s.Dispatch(new SelectClass("executioner", "steady_hand")));
            EnterC2(s);
            Check(s.State.Hero.PathC2 == ClassTables.RungConscript, "executioner lights Conscript");

            Fight(s, EnemyState.Number(Suit.Spades, Rank.Six, EnemyTier.Skirmish)); // unowned → recruit
            ClearHand(s);
            var c9 = Give(s, Suit.Clubs, Rank.Nine);
            var r = Must(s.Dispatch(new PlayCards(c9.PhysicalId)));
            var rec = Get<Recruited>(r);
            Check(rec.ToHand, "conscript recruit enters the hand");
            Check(s.State.Deck.Hand.Contains(rec.PhysicalId), "recruit in hand");
            Check(!s.State.Deck.Tavern.Contains(rec.PhysicalId), "recruit not in the Tavern");
        }

        private static void TestBastionRung()
        {
            var s = NewRun("bastion"); // sentinel; stage the rung as already lit
            s.State.Hero.PathC2 = ClassTables.RungBastion;
            Fight(s,
                EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish),
                EnemyState.Number(Suit.Hearts, Rank.Seven, EnemyTier.Veteran));
            ClearHand(s);
            var s5a = Give(s, Suit.Spades, Rank.Five);
            var s5b = Give(s, Suit.Spades, Rank.Five);

            var r = Must(s.Dispatch(new PlayCards(s5a.PhysicalId, s5b.PhysicalId)));
            Check(Has<CounterattackBlocked>(r), "shield 10 blanks the atk-3 counter");

            s.State.Encounter.Current.Hp = 18; // stage the exact kill
            ClearHand(s);
            var c9 = Give(s, Suit.Clubs, Rank.Nine);
            Must(s.Dispatch(new PlayCards(c9.PhysicalId)));
            // Carry = min(♠ cards played = 2, shield 10 − attack 3 = 7) = 2.
            Check(s.State.Encounter.Current.Shield == 2, "bastion carries min(♠ played, excess shield)");
        }

        private static void TestRenewalRung()
        {
            var s = NewRun("renewal"); // rung effect keys on PathC2, not class — stage it lit
            s.State.Hero.PathC2 = ClassTables.RungRenewal;
            Fight(s, EnemyState.Number(Suit.Spades, Rank.Ten, EnemyTier.Veteran)); // atk 6
            ClearHand(s);
            var c2 = Give(s, Suit.Clubs, Rank.Two);
            var h3 = Give(s, Suit.Hearts, Rank.Three);
            var d4 = Give(s, Suit.Diamonds, Rank.Four);

            Must(s.Dispatch(new Yield()));
            var r = Must(s.Dispatch(new DefendDiscard(c2.PhysicalId, h3.PhysicalId, d4.PhysicalId)));
            Check(Has<CardsRecovered>(r), "3-card pay triggers the recovery");
            Check(s.State.Deck.Discard.Count == 2, "one of the three paid cards came back");
            Check(s.State.Deck.Tavern.Last() == d4.PhysicalId, "the highest-value card, to the Tavern bottom");
        }

        private static void TestFullCampaign()
        {
            var s = NewRun("coronation");
            for (int ch = 1; ch <= Tuning.FinalChapter; ch++)
            {
                Check(s.State.Chapter == ch, $"on chapter {ch}");
                WalkChapter(s);

                if (ch <= Tuning.ChaptersPerContinent)
                {
                    Check(s.State.Phase == CampaignPhase.ChapterComplete, $"chapter {ch} boss cleared");
                    Must(s.Dispatch(new ContinueRun()));
                    continue;
                }

                // C2: the walk stops with only the gate ahead.
                var gate = s.State.Map.Current.Next.Select(id => s.State.Map.Get(id))
                            .First(n => n.Kind == RoadNodeKind.Gate);
                Must(s.Dispatch(new MoveToNode(gate.Id)));
                Check(s.State.Encounter.IsGate &&
                      s.State.Encounter.Enemies.All(e => e.Rank == Lineups.RoyalRank(ch)),
                    $"chapter {ch} gate fields its royal rank");
                WinFight(s);
                while (s.State.PendingChoice?.Kind == PendingChoiceKind.RoyalKeep)
                    Must(s.Dispatch(new ChooseRoyal(s.State.PendingChoice.Eligible[0])));

                if (ch < Tuning.FinalChapter)
                {
                    Check(s.State.Phase == CampaignPhase.ChapterComplete, $"chapter {ch} gate cleared");
                    Must(s.Dispatch(new ContinueRun()));
                }
            }

            Check(s.State.Phase == CampaignPhase.CampaignWon, "the run ends crowned");
            Check(s.State.Hero.Alive, "alive at the coronation");

            int Royals(Rank r) => s.State.OwnedCards.Count(id => s.State.Cards.Get(id).Printed.Rank == r);
            Check(Royals(Rank.Jack) == 3, $"kept 3 jacks, got {Royals(Rank.Jack)}");
            Check(Royals(Rank.Queen) == 2, $"kept 2 queens, got {Royals(Rank.Queen)}");
            Check(Royals(Rank.King) == 1, $"kept 1 king (the crown), got {Royals(Rank.King)}");
        }

        // ── step-6 tests: the 16 Staffs + Fallen Heroes ─────────────────────────

        /// <summary>Mint a card straight into the discard pile (staged, owned).</summary>
        private static PhysicalCard GiveDiscard(GameSession s, Suit suit, Rank rank)
        {
            var c = s.State.Cards.Mint(suit, rank);
            s.State.OwnedCards.Add(c.PhysicalId);
            s.State.Deck.Discard.Add(c.PhysicalId);
            return c;
        }

        private static void TestHoldTheLine()
        {
            var s = NewRunAs("sentinel", "hold_the_line", "htl");
            MustFail(s.Dispatch(new ActivateStaff()), "staffs activate in combat only");
            Fight(s, EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish));
            MustFail(s.Dispatch(new ActivateStaff()), "no ♠ in discard yet");

            GiveDiscard(s, Suit.Spades, Rank.Three);
            var s5 = GiveDiscard(s, Suit.Spades, Rank.Five);
            var r = Must(s.Dispatch(new ActivateStaff()));
            Check(Get<ShieldGained>(r).Amount == 5, "highest ♠ (the 5) adds to shield");
            Check(s.State.Deck.Discard.Contains(s5.PhysicalId), "the ♠ stays in the discard");
            MustFail(s.Dispatch(new ActivateStaff()), "once per enemy");
        }

        private static void TestReinforce()
        {
            var s = NewRunAs("sentinel", "reinforce", "reinforce");
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            ClearHand(s);
            var d3 = Give(s, Suit.Diamonds, Rank.Three);
            var h3 = Give(s, Suit.Hearts, Rank.Three);
            var ks = Give(s, Suit.Spades, Rank.King);
            var kh = Give(s, Suit.Hearts, Rank.King);

            MustFail(s.Dispatch(new PlayCards(d3.PhysicalId, h3.PhysicalId, kh.PhysicalId)),
                "the free rider must be a ♠");
            var r = Must(s.Dispatch(new PlayCards(d3.PhysicalId, h3.PhysicalId, ks.PhysicalId)));
            Check(Get<CardsPlayed>(r).BaseAttack == 26, "3+3+K♠ = 26 — the ♠ rides outside the cap");
            Check(Get<ShieldGained>(r).Amount == 26, "the ♠ power fires");
            Check(Has<CounterattackBlocked>(r), "shield 26 blanks the King's counter");
        }

        private static void TestFootwork()
        {
            var s = NewRunAs("sentinel", "footwork", "footwork");
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            ClearHand(s);
            var s3 = Give(s, Suit.Spades, Rank.Three);
            var h4 = Give(s, Suit.Hearts, Rank.Four);

            MustFail(s.Dispatch(new ActivateStaff(h4.PhysicalId)), "footwork buries a ♠ only");
            var r = Must(s.Dispatch(new ActivateStaff(s3.PhysicalId)));
            Check(s.State.Deck.Tavern.Last() == s3.PhysicalId, "the ♠ went to the Tavern bottom");
            Check(Has<CardsDrawn>(r) && s.State.Deck.Hand.Count == 2, "drew a replacement");
        }

        private static void TestParry()
        {
            var s = NewRunAs("sentinel", "parry", "parry");
            Fight(s, EnemyState.Number(Suit.Hearts, Rank.Ten, EnemyTier.Veteran)); // atk 6
            ClearHand(s);
            var s4 = Give(s, Suit.Spades, Rank.Four);
            var c2 = Give(s, Suit.Clubs, Rank.Two);
            var h3 = Give(s, Suit.Hearts, Rank.Three);

            MustFail(s.Dispatch(new ActivateStaff(s4.PhysicalId)), "parry only during the pay step");
            Must(s.Dispatch(new Yield()));
            MustFail(s.Dispatch(new ActivateStaff(c2.PhysicalId)), "parry spends a ♠ only");

            var r = Must(s.Dispatch(new ActivateStaff(s4.PhysicalId)));
            Check(Get<ShieldGained>(r).Amount == 4, "the ♠ value shields");
            Check(s.State.PendingChoice?.RequiredValue == 2, "payment owed cut 6 → 2");
            MustFail(s.Dispatch(new DefendDiscard(c2.PhysicalId, c2.PhysicalId)), "duplicates rejected");
            Must(s.Dispatch(new DefendDiscard(h3.PhysicalId)));

            // A big enough parry resolves the whole counterattack for free.
            ClearHand(s);
            var s9 = Give(s, Suit.Spades, Rank.Nine);
            Must(s.Dispatch(new Yield())); // net = max(0, 6 − 4 shield) = 2
            var r2 = Must(s.Dispatch(new ActivateStaff(s9.PhysicalId)));
            Check(Has<Defended>(r2) && s.State.PendingChoice == null, "counter fully parried, no pay left");
        }

        private static void TestSteadyHand()
        {
            var s = NewRunAs("executioner", "steady_hand", "steady");
            Fight(s, EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish)); // 18 hp
            ClearHand(s);
            var c9 = Give(s, Suit.Clubs, Rank.Nine);
            Give(s, Suit.Diamonds, Rank.Four);

            Must(s.Dispatch(new ActivateStaff()));
            Check(s.State.Encounter.SteadyHandArmed, "toggle armed");
            Must(s.Dispatch(new ActivateStaff()));
            Check(!s.State.Encounter.SteadyHandArmed, "toggle disarms");
            Must(s.Dispatch(new ActivateStaff()));

            var r = Must(s.Dispatch(new PlayCards(c9.PhysicalId)));
            Check(Get<DamageDealt>(r).Amount == 9 && !Get<DamageDealt>(r).Doubled,
                "9♣ deals 9 on purpose — double skipped");
            Check(!s.State.Encounter.SteadyHandArmed, "consumed by the ♣ play");
            Must(s.Dispatch(new DefendDiscard(s.State.Deck.Hand.ToList())));
        }

        private static void TestWhetstone()
        {
            var s = NewRunAs("executioner", "whetstone", "whet");
            Fight(s,
                EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish),   // 18 hp
                EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish));  // 18 hp
            ClearHand(s);
            var c10a = Give(s, Suit.Clubs, Rank.Ten);
            var r = Must(s.Dispatch(new PlayCards(c10a.PhysicalId))); // 20 vs 18 → shave 2
            Check(Get<DamageDealt>(r).Amount == 18, "overshoot of 2 shaved to exact");
            Check(Get<EnemyKilled>(r).Kind == KillKind.Exact && Has<Recruited>(r), "exact kill → recruit");

            ClearHand(s);
            var c10b = Give(s, Suit.Clubs, Rank.Ten);
            var r2 = Must(s.Dispatch(new PlayCards(c10b.PhysicalId)));
            Check(Get<EnemyKilled>(r2).Kind == KillKind.Exact,
                "fresh enemy → whetstone refreshed (once/ENEMY)");
        }

        private static void TestBloodletting()
        {
            var s = NewRunAs("executioner", "bloodletting", "bleed");
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss)); // 40 hp
            ClearHand(s);
            var h5 = Give(s, Suit.Hearts, Rank.Five);
            var c9 = Give(s, Suit.Clubs, Rank.Nine);
            Give(s, Suit.Diamonds, Rank.Ten); // survive the counter (net 20)
            Give(s, Suit.Diamonds, Rank.Ten);

            Must(s.Dispatch(new ActivateStaff(h5.PhysicalId)));
            Check(s.State.Encounter.AttackBank == 2, "⌊5/2⌋ = 2 banked");
            var r = Must(s.Dispatch(new PlayCards(c9.PhysicalId)));
            Check(Get<DamageDealt>(r).Amount == 20, "9♣ doubled (18) + 2 banked = 20");
            Check(s.State.Encounter.AttackBank == 0, "bank consumed");
            Must(s.Dispatch(new DefendDiscard(s.State.Deck.Hand.ToList())));
        }

        private static void TestFieldPromotion()
        {
            var s = NewRunAs("executioner", "field_promotion", "fieldpromo");
            Fight(s, EnemyState.Number(Suit.Spades, Rank.Six, EnemyTier.Skirmish));
            ClearHand(s);
            var c9 = Give(s, Suit.Clubs, Rank.Nine);
            var r = Must(s.Dispatch(new PlayCards(c9.PhysicalId)));
            var rec = Get<Recruited>(r);
            Check(rec.ToHand && s.State.Deck.Hand.Contains(rec.PhysicalId),
                "field promotion routes the recruit to hand");
        }

        private static void TestDovetail()
        {
            var s = NewRunAs("quartermaster", "dovetail", "dovetail");
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            ClearHand(s);
            var c3 = Give(s, Suit.Clubs, Rank.Three);
            var h3 = Give(s, Suit.Hearts, Rank.Three);
            var d4 = Give(s, Suit.Diamonds, Rank.Four);
            var s6 = Give(s, Suit.Spades, Rank.Six);
            var d5a = Give(s, Suit.Diamonds, Rank.Five);
            Give(s, Suit.Diamonds, Rank.Ten); // pay fodder

            MustFail(s.Dispatch(new PlayCards(c3.PhysicalId, h3.PhysicalId, s6.PhysicalId)),
                "6 is not adjacent to 3");
            MustFail(s.Dispatch(new PlayCards(d4.PhysicalId, d5a.PhysicalId, s6.PhysicalId)),
                "two odd cards out");
            var r = Must(s.Dispatch(new PlayCards(c3.PhysicalId, h3.PhysicalId, d4.PhysicalId)));
            Check(Get<CardsPlayed>(r).BaseAttack == 10, "3+3+4 dovetails at exactly the cap");
            Must(s.Dispatch(new DefendDiscard(s.State.Deck.Hand.ToList())));
        }

        private static void TestAceInHole()
        {
            var s = NewRunAs("quartermaster", "ace_in_the_hole", "aceinhole");
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            ClearHand(s);
            var ace = Give(s, Suit.Diamonds, Rank.Ace);
            var s7 = Give(s, Suit.Spades, Rank.Seven);

            Must(s.Dispatch(new ActivateStaff()));
            var r = Must(s.Dispatch(new PlayCards(ace.PhysicalId, s7.PhysicalId)));
            Check(Get<CardsPlayed>(r).BaseAttack == 14, "the Ace plays at the partner's 7 → base 14");
            Check(Get<ShieldGained>(r).Amount == 14, "♠ power fires on the boosted base");
            Check(!s.State.Encounter.AceInHoleArmed, "consumed by the pair");
        }

        private static void TestStockpile()
        {
            var s = NewRunAs("quartermaster", "stockpile", "stockpile");
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            Check(s.State.Deck.Hand.Count == 5, "hand full at the base cap");
            Must(s.Dispatch(new ActivateStaff()));
            Check(s.State.MaxHandSize == Tuning.BaseMaxHandSize + 1, "cap raised by 1 vs this enemy");
            MustFail(s.Dispatch(new ActivateStaff()), "once per enemy");

            ClearHand(s);
            var d5 = Give(s, Suit.Diamonds, Rank.Five);
            for (int i = 0; i < 5; i++) Give(s, Suit.Clubs, Rank.Two); // hand of 6 incl. the ♦
            var r = Must(s.Dispatch(new PlayCards(d5.PhysicalId)));    // hand 5 → draw up to 6
            Check(s.State.Deck.Hand.Count == 6, "hand filled to the raised cap");
        }

        private static void TestProvisioner()
        {
            var s = NewRunAs("quartermaster", "provisioner", "provisioner");
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            int handBefore = s.State.Deck.Hand.Count;
            int target = s.State.Deck.Hand[0];
            var r = Must(s.Dispatch(new ActivateStaff(target)));
            Check(s.State.Deck.Discard.Contains(target), "target discarded");
            Check(Has<CardsDrawn>(r) && s.State.Deck.Hand.Count == handBefore, "drew a replacement");
        }

        private static void TestTriage()
        {
            var s = NewRunAs("surgeon", "triage", "triage");
            Fight(s, EnemyState.Number(Suit.Spades, Rank.Six, EnemyTier.Skirmish)); // atk 3
            var staged = new List<PhysicalCard>();
            for (int i = 0; i < 5; i++) staged.Add(GiveDiscard(s, Suit.Clubs, (Rank)(2 + i)));
            ClearHand(s);
            var h4 = Give(s, Suit.Hearts, Rank.Four);
            var s3 = Give(s, Suit.Spades, Rank.Three);

            var r = Must(s.Dispatch(new PlayCards(h4.PhysicalId)));
            Check(!Has<CardsRecovered>(r), "recovery paused for the pick");
            Check(s.State.PendingChoice?.Kind == PendingChoiceKind.RecoverSelect, "recover pick pending first");
            Check(s.State.PendingChoice.RecoverMax == 4, "may pick up to min(4, discard)");
            Check(!s.State.PendingChoice.RecoverIds.Contains(h4.PhysicalId),
                "the just-played ♥ is not recoverable by its own play");

            MustFail(s.Dispatch(new ChooseRecover(h4.PhysicalId)), "not on offer");
            MustFail(s.Dispatch(new ChooseRecover(staged.Take(5).Select(c => c.PhysicalId).ToList())),
                "over the pick cap");
            var picks = staged.Take(2).Select(c => c.PhysicalId).ToList();
            var r2 = Must(s.Dispatch(new ChooseRecover(picks)));
            Check(Get<CardsRecovered>(r2).Count == 2, "picked 2 of a possible 4");
            Check(picks.All(id => s.State.Deck.Tavern.Contains(id)), "picked cards in the Tavern");

            Check(s.State.PendingChoice?.Kind == PendingChoiceKind.Defend, "the queued counterattack resolves next");
            Must(s.Dispatch(new DefendDiscard(s3.PhysicalId)));
        }

        private static void TestLastRites()
        {
            var s = NewRunAs("surgeon", "last_rites", "lastrites");
            Fight(s, EnemyState.Number(Suit.Spades, Rank.Six, EnemyTier.Skirmish));
            for (int i = 0; i < 3; i++) GiveDiscard(s, Suit.Clubs, Rank.Two);
            ClearHand(s);
            var h4 = Give(s, Suit.Hearts, Rank.Four);
            var s3 = Give(s, Suit.Spades, Rank.Three);

            var r = Must(s.Dispatch(new PlayCards(h4.PhysicalId)));
            Check(Get<CardsRecovered>(r).Count == 3, "normal random recovery happened");
            Check(s.State.PendingChoice?.Kind == PendingChoiceKind.RecoverToHand, "last rites pick pending");

            int pick = s.State.PendingChoice.RecoverIds[0];
            var r2 = Must(s.Dispatch(new ChooseRecover(pick)));
            Check(Has<RecoveredToHand>(r2) && s.State.Deck.Hand.Contains(pick), "one recovered card to hand");
            Must(s.Dispatch(new DefendDiscard(s3.PhysicalId)));

            // Second recovery vs the same enemy: once/enemy — no second offer.
            GiveDiscard(s, Suit.Clubs, Rank.Two);
            var h2 = Give(s, Suit.Hearts, Rank.Two);
            Give(s, Suit.Spades, Rank.Five);
            var r3 = Must(s.Dispatch(new PlayCards(h2.PhysicalId)));
            Check(Has<CardsRecovered>(r3), "recovery still fires");
            Check(s.State.PendingChoice?.Kind == PendingChoiceKind.Defend, "but no second pick this enemy");
            Must(s.Dispatch(new DefendDiscard(s.State.Deck.Hand.ToList())));
        }

        private static void TestTransfuse()
        {
            var s = NewRunAs("surgeon", "transfuse", "transfuse");
            Fight(s, EnemyState.Number(Suit.Spades, Rank.Six, EnemyTier.Skirmish)); // atk 3
            for (int i = 0; i < 3; i++) GiveDiscard(s, Suit.Clubs, Rank.Two);
            ClearHand(s);
            var h4 = Give(s, Suit.Hearts, Rank.Four);

            Must(s.Dispatch(new ActivateStaff()));
            MustFail(s.Dispatch(new ActivateStaff()), "once per enemy");
            int discardBefore = s.State.Deck.Discard.Count;
            var r = Must(s.Dispatch(new PlayCards(h4.PhysicalId)));
            Check(!Has<CardsRecovered>(r), "recovery skipped");
            Check(Get<ShieldGained>(r).Amount == 4, "base value became shield");
            Check(s.State.Deck.Discard.Count == discardBefore + 1, "discard only grew by the played card");
            Check(Has<CounterattackBlocked>(r), "shield 4 blanks the atk-3 counter");
        }

        private static void TestFieldDressing()
        {
            var s = NewRunAs("surgeon", "field_dressing", "dressing");
            Fight(s, EnemyState.Number(Suit.Spades, Rank.Six, EnemyTier.Skirmish));
            for (int i = 0; i < 5; i++) GiveDiscard(s, Suit.Clubs, Rank.Two);
            ClearHand(s);
            var h2a = Give(s, Suit.Hearts, Rank.Two);
            var s3 = Give(s, Suit.Spades, Rank.Three);

            var r = Must(s.Dispatch(new PlayCards(h2a.PhysicalId)));
            Check(Get<CardsRecovered>(r).Count == 3, "first recovery: 2 + 1 bonus");
            Must(s.Dispatch(new DefendDiscard(s3.PhysicalId)));

            var h2b = Give(s, Suit.Hearts, Rank.Two);
            Give(s, Suit.Spades, Rank.Five);
            var r2 = Must(s.Dispatch(new PlayCards(h2b.PhysicalId)));
            Check(Get<CardsRecovered>(r2).Count == 2, "second recovery vs the same enemy: no bonus");
            Must(s.Dispatch(new DefendDiscard(s.State.Deck.Hand.ToList())));
        }

        private static void TestFallenHeroes()
        {
            var s = NewRun("heroes");
            s.State.Chapter = 4; // stage the seam into ch5 — the Heroes chapter (§10)
            s.State.Phase = CampaignPhase.ChapterComplete;
            Must(s.Dispatch(new ContinueRun()));
            Check(s.State.Chapter == 5, "on chapter 5");
            Check(s.State.Map.Nodes.Any(n => n.Kind == RoadNodeKind.Heroes), "ch5 road holds Fallen Heroes");

            MustFail(s.Dispatch(new SwapStaff("footwork")), "no offer away from the shrine");

            int heroesId = WalkUpTo(s, RoadNodeKind.Heroes);
            var r = Must(s.Dispatch(new MoveToNode(heroesId)));
            Check(Has<StaffSwapOffered>(r), "arriving offers the swap");

            var offer = s.State.StaffOffer;
            Check(offer != null && offer.Count == 4, "four staffs offered");
            for (int i = 0; i < 4; i++)
                Check(System.Array.IndexOf(
                          ClassTables.Classes[ClassTables.ClassOrder[i]].StaffIds, offer[i]) >= 0,
                    $"offer {i} comes from {ClassTables.ClassOrder[i]}");

            MustFail(s.Dispatch(new SwapStaff("no_such_staff")), "unknown staff rejected");
            Must(s.Dispatch(new SwapStaff(offer[1])));
            Check(s.State.Hero.StaffId == offer[1], "staff swapped");
            Must(s.Dispatch(new SwapStaff(offer[2])));
            Check(s.State.Hero.StaffId == offer[2], "swap is free and repeatable at the stop");

            Must(s.Dispatch(new MoveToNode(s.State.Map.Current.Next[0])));
            Check(s.State.StaffOffer == null, "walking on closes the offer");
        }

        // ── step-7 tests: spells ────────────────────────────────────────────────

        /// <summary>Resolve whatever standing on a node produced (fight, relic pick, hunt).</summary>
        private static void ResolveStop(GameSession s)
        {
            if (s.State.Phase == CampaignPhase.Encounter) WinFight(s);
            if (s.State.PendingChoice?.Kind == PendingChoiceKind.RelicSelect)
                Must(s.Dispatch(new ChooseRelic(s.State.PendingChoice.RelicOptions[0])));
            if (s.State.PendingChoice?.Kind == PendingChoiceKind.HuntSelect)
            {
                var q = s.State.PendingChoice.HuntOptions[0];
                Must(s.Dispatch(new ChooseHunt(q.Suit, q.Rank)));
                WinFight(s);
            }
        }

        /// <summary>BFS route (one-way road) from the current node to the nearest node of a kind.</summary>
        private static List<int> PathTo(GameSession s, RoadNodeKind want)
        {
            var map = s.State.Map;
            var prev = new Dictionary<int, int>();
            var seen = new HashSet<int> { map.CurrentNodeId };
            var queue = new Queue<int>();
            queue.Enqueue(map.CurrentNodeId);
            int goal = -1;
            while (queue.Count > 0 && goal < 0)
            {
                int cur = queue.Dequeue();
                foreach (int nx in map.Get(cur).Next)
                {
                    if (!seen.Add(nx)) continue;
                    prev[nx] = cur;
                    if (map.Get(nx).Kind == want) { goal = nx; break; }
                    queue.Enqueue(nx);
                }
            }
            if (goal < 0)
                throw new Exception($"{want} is lane-locked away from here on this seed");

            var path = new List<int>();
            for (int at = goal; at != map.CurrentNodeId; at = prev[at]) path.Add(at);
            path.Reverse();
            return path;
        }

        /// <summary>
        /// Walk to the nearest node of each wanted kind. Roads are sparse lanes now,
        /// so this BFS-pathfinds and fights through whatever the route holds.
        /// </summary>
        private static void WalkTo(GameSession s, params RoadNodeKind[] preferences)
        {
            foreach (var want in preferences)
                foreach (int step in PathTo(s, want))
                {
                    Must(s.Dispatch(new MoveToNode(step)));
                    ResolveStop(s);
                }
        }

        /// <summary>Walk to the node JUST BEFORE the nearest wanted node; returns the wanted node's id.</summary>
        private static int WalkUpTo(GameSession s, RoadNodeKind want)
        {
            var path = PathTo(s, want);
            for (int i = 0; i < path.Count - 1; i++)
            {
                Must(s.Dispatch(new MoveToNode(path[i])));
                ResolveStop(s);
            }
            return path[path.Count - 1];
        }

        private static void TestForgeAndBracelet()
        {
            var s = NewRun("forge");
            MustFail(s.Dispatch(new ForgeConvert()), "no forge here");

            WalkTo(s, RoadNodeKind.Forge);
            s.State.TokenFragments = 3; // staged pool (fight drops along the walk vary by seed)
            s.State.TokenHalves = 0;
            var r = Must(s.Dispatch(new ForgeConvert()));
            Check(s.State.TokenFragments == 1 && s.State.TokenHalves == 1, "2 fragments became 1 Half");
            MustFail(s.Dispatch(new ForgeConvert()), "one fragment is not enough");

            Must(s.Dispatch(new ArmCrystal(Suit.Diamonds, SpellTables.TierFragment)));
            Check(s.State.GauntletTiers[(int)Suit.Diamonds] == 1 && s.State.TokenFragments == 0,
                "fragment armed into the ♦ slot");
            MustFail(s.Dispatch(new ArmCrystal(Suit.Diamonds, SpellTables.TierHalf)), "occupied slot refused");
            MustFail(s.Dispatch(new ArmCrystal(Suit.Hearts, SpellTables.TierFragment)), "pool empty");
            Must(s.Dispatch(new ArmCrystal(Suit.Spades, SpellTables.TierHalf)));
            Check(s.State.GauntletTiers[(int)Suit.Spades] == 2 && s.State.TokenHalves == 0,
                "half armed into the ♠ slot");

            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            s.State.TokenFragments = 1;
            MustFail(s.Dispatch(new ArmCrystal(Suit.Hearts, SpellTables.TierFragment)),
                "no arming mid-combat — the bracelet is a between-fights screen");
        }

        private static void TestCastRules()
        {
            var s = NewRun("castrules");
            MustFail(s.Dispatch(new CastSpell(Suit.Diamonds)), "spells cast in combat");
            s.State.GauntletTiers[(int)Suit.Diamonds] = SpellTables.TierFragment;

            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            ClearHand(s);
            var r = Must(s.Dispatch(new CastSpell(Suit.Diamonds)));
            Check(Has<CardsDrawn>(r) && s.State.Deck.Hand.Count == 2, "quick muster drew 2");
            Check(s.State.GauntletTiers[(int)Suit.Diamonds] == 0, "casting empties the slot");
            MustFail(s.Dispatch(new CastSpell(Suit.Diamonds)), "slot now empty");

            s.State.GauntletTiers[(int)Suit.Diamonds] = SpellTables.TierFragment; // staged re-arm
            MustFail(s.Dispatch(new CastSpell(Suit.Diamonds)), "one ♦ cast per combat");

            // A fresh fight resets the per-combat suit locks.
            WinFight(s);
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            Must(s.Dispatch(new CastSpell(Suit.Diamonds)));
        }

        private static void TestKeenEdge()
        {
            var s = NewRun("keenedge");
            s.State.GauntletTiers[(int)Suit.Clubs] = SpellTables.TierFragment;
            Fight(s, EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish)); // 18 hp
            ClearHand(s);
            var h9 = Give(s, Suit.Hearts, Rank.Nine);

            Must(s.Dispatch(new CastSpell(Suit.Clubs)));
            var r = Must(s.Dispatch(new PlayCards(h9.PhysicalId)));
            Check(Get<DamageDealt>(r).Amount == 18, "9 doubled by keen edge = 18");
            Check(Get<EnemyKilled>(r).Kind == KillKind.Exact, "an exact kill via the spell");
        }

        private static void TestCommit()
        {
            var s = NewRun("commit");
            s.State.GauntletTiers[(int)Suit.Clubs] = SpellTables.TierHalf;
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            ClearHand(s);
            var c3 = Give(s, Suit.Clubs, Rank.Three);
            var h3 = Give(s, Suit.Hearts, Rank.Three);
            var d4 = Give(s, Suit.Diamonds, Rank.Four);
            var d5 = Give(s, Suit.Diamonds, Rank.Five);
            Give(s, Suit.Diamonds, Rank.Ten); // pay fodder

            MustFail(s.Dispatch(new PlayCards(c3.PhysicalId, h3.PhysicalId, d4.PhysicalId)),
                "no commit armed yet");
            Must(s.Dispatch(new CastSpell(Suit.Clubs)));
            MustFail(s.Dispatch(new PlayCards(d5.PhysicalId, d4.PhysicalId, c3.PhysicalId)),
                "commit still respects the value cap and the same-rank base");
            var r = Must(s.Dispatch(new PlayCards(c3.PhysicalId, h3.PhysicalId, d4.PhysicalId)));
            Check(Get<CardsPlayed>(r).BaseAttack == 10, "3+3 plus the committed 4");
            Check(!s.State.Encounter.CommitArmed, "commit consumed by the extra card");
            Must(s.Dispatch(new DefendDiscard(s.State.Deck.Hand.ToList())));
        }

        private static void TestQuickMusterAndRally()
        {
            var s = NewRun("rally");
            s.State.GauntletTiers[(int)Suit.Diamonds] = SpellTables.TierHalf;
            Fight(s, EnemyState.Number(Suit.Spades, Rank.Ten, EnemyTier.Veteran)); // atk 6
            ClearHand(s); // empty-handed — a yield would be death without the Rally

            Must(s.Dispatch(new CastSpell(Suit.Diamonds)));
            Check(s.State.Encounter.RallyArmed, "rally armed");
            var r = Must(s.Dispatch(new Yield()));
            Check(Has<CardsDrawn>(r), "rally drew before the pay step");
            Check(!Has<PlayerDied>(r), "the rally draw saved the run");
            Check(s.State.PendingChoice?.Kind == PendingChoiceKind.Defend, "then the counter must be paid");
            Must(s.Dispatch(new DefendDiscard(s.State.Deck.Hand.ToList())));
        }

        private static void TestGuardUpImmunity()
        {
            var s = NewRun("guardup");
            s.State.GauntletTiers[(int)Suit.Spades] = SpellTables.TierFragment;
            Fight(s, EnemyState.Number(Suit.Spades, Rank.Six, EnemyTier.Skirmish)); // ♠-immune enemy
            var r = Must(s.Dispatch(new CastSpell(Suit.Spades)));
            Check(Get<ShieldGained>(r).Total == 3,
                "guard up shields even vs a ♠ enemy — spells sit above immunity");
        }

        private static void TestBrace()
        {
            var s = NewRun("brace");
            s.State.GauntletTiers[(int)Suit.Spades] = SpellTables.TierHalf;
            Fight(s, EnemyState.Number(Suit.Hearts, Rank.Ten, EnemyTier.Veteran)); // atk 6
            ClearHand(s);
            var c2 = Give(s, Suit.Clubs, Rank.Two);
            var h3 = Give(s, Suit.Hearts, Rank.Three);
            var d9 = Give(s, Suit.Diamonds, Rank.Nine);

            MustFail(s.Dispatch(new CastSpell(Suit.Spades)), "brace casts during the pay step only");
            Must(s.Dispatch(new Yield()));
            var r = Must(s.Dispatch(new CastSpell(Suit.Spades)));
            Check(s.State.Deck.Discard.Contains(d9.PhysicalId), "the highest card (9♦) was spent");
            Check(Get<ShieldGained>(r).Amount == 9, "its value shields");
            Check(Has<Defended>(r) && s.State.PendingChoice == null, "9 covers the 6 — pay resolved free");
        }

        private static void TestRefitRecycle()
        {
            var s = NewRun("refit");
            s.State.GauntletTiers[(int)Suit.Hearts] = SpellTables.TierFragment;
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            for (int i = 0; i < 5; i++) GiveDiscard(s, Suit.Clubs, Rank.Two);
            ClearHand(s);
            var r = Must(s.Dispatch(new CastSpell(Suit.Hearts)));
            Check(Get<CardsRecovered>(r).Count == 3, "refit returned 3 discards");
            Check(Get<CardsDrawn>(r).PhysicalIds.Count == 1, "and drew 1");
            Check(s.State.Deck.Discard.Count == 2, "two discards remain");

            var s2 = NewRun("recycle");
            s2.State.GauntletTiers[(int)Suit.Hearts] = SpellTables.TierHalf;
            Fight(s2, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            for (int i = 0; i < 4; i++) GiveDiscard(s2, Suit.Clubs, Rank.Two);
            ClearHand(s2);
            var r2 = Must(s2.Dispatch(new CastSpell(Suit.Hearts)));
            Check(Get<CardsRecovered>(r2).Count == 4, "the whole discard recycled");
            Check(s2.State.Deck.Discard.Count == 0, "discard empty");
            Check(Get<CardsDrawn>(r2).PhysicalIds.Count == 2, "and drew 2");
        }

        // ── step-8 tests: relics ────────────────────────────────────────────────

        /// <summary>Stage a relic straight into the bag and equip it (harness license).</summary>
        private static void Wear(GameSession s, string relicId)
        {
            s.State.RelicBag.Add(relicId);
            Must(s.Dispatch(new EquipRelic(relicId)));
        }

        private static void TestLairAndEquip()
        {
            var s = NewRun("lair");
            int lairId = WalkUpTo(s, RoadNodeKind.Lair); // stop at the door — the test inspects the raid
            Must(s.Dispatch(new MoveToNode(lairId)));
            Check(s.State.Phase == CampaignPhase.Encounter, "the lair is a raid — a real fight");
            WinFight(s);

            var pending = s.State.PendingChoice;
            Check(pending?.Kind == PendingChoiceKind.RelicSelect, "relic pick pending after the raid");
            Check(pending.RelicOptions.Count == 2, "pick 1 of 2");
            Check(pending.RelicOptions.All(RelicTables.Exists), "offers are real relics");

            MustFail(s.Dispatch(new MoveToNode(s.State.Map.Current.Next[0])), "no walking past the pick");
            MustFail(s.Dispatch(new ChooseRelic("crown_of_ages")), "not on offer");
            string picked = pending.RelicOptions[0];
            var r = Must(s.Dispatch(new ChooseRelic(picked)));
            Check(s.State.RelicBag.Contains(picked), "claimed relic lands in the bag");

            MustFail(s.Dispatch(new EquipRelic("no_such")), "unknown relic");
            string notOffered = RelicTables.All.Select(x => x.Id).First(id => !pending.RelicOptions.Contains(id));
            MustFail(s.Dispatch(new EquipRelic(notOffered)), "an unowned relic is not in the bag");
            Must(s.Dispatch(new EquipRelic(picked)));
            int slot = (int)RelicTables.Get(picked).Slot;
            Check(s.State.EquippedRelics[slot] == picked && !s.State.RelicBag.Contains(picked),
                "equipped into its own slot, out of the bag");

            // A second relic of the same slot swaps freely.
            string other = RelicTables.All.First(x => x.Slot == RelicTables.Get(picked).Slot && x.Id != picked).Id;
            s.State.RelicBag.Add(other);
            var r2 = Must(s.Dispatch(new EquipRelic(other)));
            Check(s.State.EquippedRelics[slot] == other && s.State.RelicBag.Contains(picked),
                "swap is free — the old relic returns to the bag");

            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            MustFail(s.Dispatch(new EquipRelic(picked)), "swaps locked during combat");
        }

        private static void TestCaravan()
        {
            var s = NewRun("caravan");
            int caravanId = WalkUpTo(s, RoadNodeKind.Caravan);
            var r = Must(s.Dispatch(new MoveToNode(caravanId)));
            string offer = s.State.CaravanOffer;
            Check(offer != null && Get<CaravanOffered>(r).Cost == Tuning.CaravanCost, "a relic for 8 card-value");

            ClearHand(s);
            var c2 = Give(s, Suit.Clubs, Rank.Two);
            var h9 = Give(s, Suit.Hearts, Rank.Nine);
            MustFail(s.Dispatch(new BuyRelic(c2.PhysicalId)), "2 is short of 8");
            Must(s.Dispatch(new BuyRelic(h9.PhysicalId)));
            Check(s.State.RelicBag.Contains(offer), "bought relic in the bag");
            Check(s.State.CaravanOffer == null, "the stall closes after the sale");
            Check(s.State.Deck.Discard.Contains(h9.PhysicalId), "payment went to the discard");
            MustFail(s.Dispatch(new BuyRelic(c2.PhysicalId)), "nothing left to buy");

            // Caravan Coin: cost 8 → 6.
            var s2 = NewRun("caravancoin");
            Wear(s2, "caravan_coin");
            WalkTo(s2, RoadNodeKind.Caravan);
            ClearHand(s2);
            var d6 = Give(s2, Suit.Diamonds, Rank.Six);
            Must(s2.Dispatch(new BuyRelic(d6.PhysicalId)));
            Check(s2.State.RelicBag.Count == 1, "6 pays the discounted price");
        }

        private static void TestHoardInterest()
        {
            var s = NewRun("hoard");
            Check(s.State.MaxHandSize == 5, "base cap");
            Wear(s, "hoard");
            Check(s.State.MaxHandSize == 7, "hoard raises the cap by 2");

            var s2 = NewRun("interest");
            Wear(s2, "interest");
            Fight(s2, EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish));
            ClearHand(s2);
            var c9 = Give(s2, Suit.Clubs, Rank.Nine);
            Must(s2.Dispatch(new PlayCards(c9.PhysicalId))); // exact, fight won, nothing paid
            Check(s2.State.LastFightPaidNothing, "no discards paid last fight");

            ClearHand(s2);
            var r = Must(s2.Dispatch(new StartEncounter(EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss))));
            Check(r.Events.OfType<RelicUsed>().Any(e => e.RelicId == "interest"), "interest pays out");
            Check(s2.State.Deck.Hand.Count == 1, "+1 card at fight start");
        }

        private static void TestDebtLastCoin()
        {
            var s = NewRun("debt");
            Wear(s, "debt");
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.Jack, EnemyTier.Boss)); // 20 hp, atk 10
            ClearHand(s);
            var s9 = Give(s, Suit.Spades, Rank.Nine);
            Give(s, Suit.Hearts, Rank.Five);
            Give(s, Suit.Diamonds, Rank.Six);

            var r = Must(s.Dispatch(new UseRelic("debt")));
            Check(Has<CardsDrawn>(r) && s.State.Deck.Hand.Count == 5, "drew 2 on credit");
            MustFail(s.Dispatch(new UseRelic("debt")), "once per fight");

            Must(s.Dispatch(new PlayCards(s9.PhysicalId))); // shield 9 → net 1 → defend
            Must(s.Dispatch(new DefendDiscard(s.State.Deck.Hand[0])));
            Check(s.State.PendingChoice?.Kind == PendingChoiceKind.DebtDiscard, "first instalment due");
            MustFail(s.Dispatch(new PlayCards(s.State.Deck.Hand[0])), "no playing while owing");
            MustFail(s.Dispatch(new DefendDiscard(s.State.Deck.Hand[0], s.State.Deck.Hand[1])),
                "the instalment is exactly one card");
            Must(s.Dispatch(new DefendDiscard(s.State.Deck.Hand[0])));
            Check(s.State.Encounter.DebtTurnsRemaining == 1, "one instalment left");

            var s2 = NewRun("lastcoin");
            Wear(s2, "last_coin");
            Fight(s2,
                EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish),
                EnemyState.Number(Suit.Hearts, Rank.Seven, EnemyTier.Veteran));
            ClearHand(s2);
            var c9b = Give(s2, Suit.Clubs, Rank.Nine);
            var r2 = Must(s2.Dispatch(new PlayCards(c9b.PhysicalId))); // exact kill, hand empties
            Check(r2.Events.OfType<RelicUsed>().Any(e => e.RelicId == "last_coin"),
                "the empty-handed turn starts with the last coin");
            Check(s2.State.Deck.Hand.Count == 3, "drew 3");
        }

        private static void TestRingActives()
        {
            var s = NewRun("writ");
            Wear(s, "requisition_writ");
            int owned = s.State.OwnedCards.Count, frags = s.State.TokenFragments;
            Must(s.Dispatch(new UseRelic("requisition_writ")));
            Check(s.State.Deck.Hand.Count == 3 && s.State.OwnedCards.Count == owned - 2,
                "two lowest hand cards left the run");
            Check(s.State.TokenFragments == frags + 1, "one fragment banked");
            MustFail(s.Dispatch(new UseRelic("requisition_writ")), "once per province");

            var s2 = NewRun("liquidate");
            Wear(s2, "liquidate");
            MustFail(s2.Dispatch(new UseRelic("liquidate", s2.State.Deck.Hand[0])), "combat only");
            Fight(s2, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            int target = s2.State.Deck.Hand[0];
            var r = Must(s2.Dispatch(new UseRelic("liquidate", target)));
            Check(s2.State.Deck.Discard.Contains(target) && s2.State.Deck.Hand.Count == 5,
                "discarded 1, drew 2 (4 → 5 with a hand of 5-cap)");
            MustFail(s2.Dispatch(new UseRelic("liquidate", s2.State.Deck.Hand[0])), "once per fight");

            var s3 = NewRun("doubleornothing");
            Wear(s3, "double_or_nothing");
            Fight(s3, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            ClearHand(s3);
            Give(s3, Suit.Clubs, Rank.Two);
            Give(s3, Suit.Hearts, Rank.Three);
            Give(s3, Suit.Diamonds, Rank.Four);
            var r3 = Must(s3.Dispatch(new UseRelic("double_or_nothing")));
            Check(s3.State.Deck.Hand.Count == 4, "threw 3, drew 4");
        }

        private static void TestForkedRoadForcedMarch()
        {
            var s = NewRun("forkedroad");
            Wear(s, "forked_road");
            Must(s.Dispatch(new MoveToNode(s.State.Map.Current.Next[0]))); // onto the skirmish
            var twoAhead = s.State.Map.Current.Next
                .SelectMany(id => s.State.Map.Get(id).Next)
                .Select(id => s.State.Map.Get(id)).ToList();
            Check(twoAhead.All(n => n.Known), "forked road reveals a layer further");
            WinFight(s);

            var s2 = NewRun("march");
            Wear(s2, "forced_march");
            Must(s2.Dispatch(new MoveToNode(s2.State.Map.Current.Next[0]))); // skirmish fight
            int owned = s2.State.OwnedCards.Count;
            var r = Must(s2.Dispatch(new UseRelic("forced_march")));
            Check(s2.State.Phase == CampaignPhase.Road && s2.State.Encounter == null,
                "marched straight past the fight");
            Check(s2.State.OwnedCards.Count == owned, "no recruit from a skipped fight");
            // Only ordinary fights: the lair raid refuses the march.
            WalkTo(s2, RoadNodeKind.Camp, RoadNodeKind.Veteran, RoadNodeKind.Forge);
            var lair = s2.State.Map.Current.Next.Select(id => s2.State.Map.Get(id))
                         .First(n => n.Kind == RoadNodeKind.Lair);
            Must(s2.Dispatch(new MoveToNode(lair.Id)));
            MustFail(s2.Dispatch(new UseRelic("forced_march")), "elites cannot be marched past");
        }

        private static void TestCloakActives()
        {
            var s = NewRun("bedroll");
            Wear(s, "bedroll");
            for (int i = 0; i < 4; i++) GiveDiscard(s, Suit.Clubs, Rank.Two);
            Must(s.Dispatch(new UseRelic("bedroll")));
            Check(s.State.Deck.Discard.Count == 0, "discard reshuffled without a camp");
            MustFail(s.Dispatch(new UseRelic("bedroll")), "once per province");

            var s2 = NewRun("slipaway");
            Wear(s2, "slip_away");
            Fight(s2, EnemyState.Royal(Suit.Spades, Rank.King, EnemyTier.Gate)); // unwinnable-ish
            ClearHand(s2);
            var c2 = Give(s2, Suit.Clubs, Rank.Two);
            var h6 = Give(s2, Suit.Hearts, Rank.Six);
            var d4 = Give(s2, Suit.Diamonds, Rank.Four);
            MustFail(s2.Dispatch(new UseRelic("slip_away", c2.PhysicalId)), "2 is short of the 5 toll");
            Must(s2.Dispatch(new UseRelic("slip_away", h6.PhysicalId)));
            Check(s2.State.Phase == CampaignPhase.Road && s2.State.Encounter == null, "away clean");
            Check(s2.State.Deck.Hand.Contains(c2.PhysicalId) && s2.State.Deck.Hand.Contains(d4.PhysicalId),
                "the rest of the hand is kept");

            var s3 = NewRun("vanguard");
            Wear(s3, "vanguard");
            Must(s3.Dispatch(new MoveToNode(s3.State.Map.Current.Next[0]))); // road fight #1
            var r = Must(s3.Dispatch(new Yield()));
            Check(r.Events.OfType<RelicUsed>().Any(e => e.RelicId == "vanguard"),
                "the road's first enemy holds its first counter");
            Check(s3.State.PendingChoice == null, "nothing to pay");
            var r2 = Must(s3.Dispatch(new Yield()));
            Check(Has<CounterattackIncoming>(r2), "the second counter lands normally");
            Must(s3.Dispatch(new DefendDiscard(s3.State.Deck.Hand.ToList())));
        }

        private static void TestHatRecruits()
        {
            var s = NewRun("hatrecruits"); // sentinel — home suit ♠
            Wear(s, "press_gang");
            Wear(s, "interest"); // ring slot, irrelevant — proves multi-slot coexistence
            Fight(s, EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish));
            ClearHand(s);
            var c9 = Give(s, Suit.Clubs, Rank.Nine);
            var r = Must(s.Dispatch(new PlayCards(c9.PhysicalId)));
            var rec = s.State.Cards.Get(Get<Recruited>(r).PhysicalId);
            Check(rec.Printed.Suit == Suit.Hearts && rec.EffectiveFace().Suit == Suit.Spades,
                "press-gang rewrites the recruit to the home suit (printed face untouched)");

            var s2 = NewRun("promotion");
            Wear(s2, "battlefield_promotion");
            Wear(s2, "black_standard"); // same Hat slot? no — both are Hats! swap...
            Check(s2.State.EquippedRelics[(int)RelicSlot.Hat] == "black_standard",
                "second hat swapped the first out");
            Wear(s2, "battlefield_promotion"); // swap back: promotion live, standard in bag
            Fight(s2,
                EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish),
                EnemyState.Number(Suit.Diamonds, Rank.Seven, EnemyTier.Veteran));
            ClearHand(s2);
            var c9b = Give(s2, Suit.Clubs, Rank.Nine);
            var r2 = Must(s2.Dispatch(new PlayCards(c9b.PhysicalId)));
            var first = s2.State.Cards.Get(Get<Recruited>(r2).PhysicalId);
            Check(first.EffectiveFace().Rank == Rank.Seven, "first recruit promoted 6 → 7");
            ClearHand(s2);
            var extra = Give(s2, Suit.Hearts, Rank.Two); // keep a card so no last-coin style edge
            var c10 = Give(s2, Suit.Clubs, Rank.Ten);
            s2.State.Encounter.Current.Hp = 20;
            var r3 = Must(s2.Dispatch(new PlayCards(c10.PhysicalId)));
            var second = s2.State.Cards.Get(Get<Recruited>(r3).PhysicalId);
            Check(second.EffectiveFace().Rank == Rank.Seven, "second recruit is NOT promoted (once/fight)");

            var s3 = NewRun("standard");
            Wear(s3, "black_standard");
            Wear(s3, "apprentice"); // hat slot again — swaps standard out; test apprentice
            Fight(s3, EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish));
            ClearHand(s3);
            var c9c = Give(s3, Suit.Clubs, Rank.Nine);
            var r4 = Must(s3.Dispatch(new PlayCards(c9c.PhysicalId)));
            Check(r4.Events.OfType<RelicUsed>().Any(e => e.RelicId == "apprentice") &&
                  s3.State.Deck.Hand.Count == 1, "apprentice draws 1 on recruit");

            var s4 = NewRun("rallyingcry");
            Wear(s4, "rallying_cry");
            Fight(s4, EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish));
            var staged = GiveDiscard(s4, Suit.Clubs, Rank.Two);
            ClearHand(s4);
            var c9d = Give(s4, Suit.Clubs, Rank.Nine);
            var r5 = Must(s4.Dispatch(new PlayCards(c9d.PhysicalId)));
            // Discard held the staged 2♣ + the played 9♣; the rally returns one of them.
            Check(r5.Events.OfType<RelicUsed>().Any(e => e.RelicId == "rallying_cry") &&
                  s4.State.Deck.Discard.Count == 1,
                "one discard rallies back to the Tavern on recruit");
        }

        private static void TestHatEdgeCases()
        {
            var s = NewRun("conscription");
            Wear(s, "conscription");
            Fight(s, EnemyState.Number(Suit.Spades, Rank.Six, EnemyTier.Skirmish)); // 18 hp
            ClearHand(s);
            var c10 = Give(s, Suit.Clubs, Rank.Ten); // 20 vs 18 → overkill
            var r = Must(s.Dispatch(new PlayCards(c10.PhysicalId)));
            Check(Get<EnemyKilled>(r).Kind == KillKind.Overkill, "an overkill");
            var rec = s.State.Cards.Get(Get<Recruited>(r).PhysicalId);
            Check(rec.EffectiveValue() == 5, "conscripted 6 carries the −1 token (value 5)");

            // Gate overkills stay banished even under Conscription.
            GateFight(s, Rank.Jack, Suit.Hearts, Suit.Spades);
            var enemy = s.State.Encounter.Current;
            enemy.Hp = 17; // 9♣ doubled = 18 → overkill
            ClearHand(s);
            var c9 = Give(s, Suit.Clubs, Rank.Nine);
            var r2 = Must(s.Dispatch(new PlayCards(c9.PhysicalId)));
            Check(!Has<Recruited>(r2), "a gate overkill is banished outright");
            WinFight(s); // clean up: exact-kill the second jack (auto-keep resolves)

            var s2 = NewRun("plunder");
            Wear(s2, "plunder");
            Fight(s2, EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish));
            GiveDiscard(s2, Suit.Hearts, Rank.Nine); // a stronger same-suit discard
            ClearHand(s2);
            var c9b = Give(s2, Suit.Clubs, Rank.Nine);
            var r3 = Must(s2.Dispatch(new PlayCards(c9b.PhysicalId)));
            var rec2 = s2.State.Cards.Get(Get<Recruited>(r3).PhysicalId);
            Check(rec2.EffectiveFace().Rank == Rank.Nine, "the recruit is swapped up to the discard's 9");

            // Muster's Tavern-top placement is observable at the King Gate — the only
            // gate with no seam rest after it (victory reshuffles nothing).
            var s3 = NewRun("muster");
            Wear(s3, "muster");
            GateFight(s3, Rank.King, Suit.Hearts);
            WinFight(s3); // one exact king → auto-keep = the crown, straight to victory
            Check(s3.State.Phase == CampaignPhase.CampaignWon, "crowned");
            Check(s3.State.Cards.Get(s3.State.Deck.Tavern[0]).Printed.Rank == Rank.King,
                "the mustered royal sits on the Tavern top");
        }

        private static void TestAmuletsOne()
        {
            var s = NewRun("scalpel");
            Wear(s, "sainted_scalpel");
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            for (int i = 0; i < 8; i++) GiveDiscard(s, Suit.Clubs, Rank.Two);
            ClearHand(s);
            Must(s.Dispatch(new UseRelic("sainted_scalpel")));
            Check(s.State.Deck.Discard.Count == 2, "6 of 8 discards stitched back");
            Check(s.State.Deck.Hand.Count == 1, "and drew 1");
            MustFail(s.Dispatch(new UseRelic("sainted_scalpel")), "once per fight");

            var s2 = NewRun("unbinding");
            Wear(s2, "unbinding");
            Fight(s2, EnemyState.Number(Suit.Clubs, Rank.Six, EnemyTier.Skirmish)); // ♣-immune
            ClearHand(s2);
            var c9 = Give(s2, Suit.Clubs, Rank.Nine);
            Must(s2.Dispatch(new UseRelic("unbinding")));
            MustFail(s2.Dispatch(new UseRelic("unbinding")), "once per enemy");
            var r = Must(s2.Dispatch(new PlayCards(c9.PhysicalId)));
            Check(Get<DamageDealt>(r).Amount == 18, "♣ doubles through the unbound immunity");

            var s3 = NewRun("secondwind");
            Wear(s3, "second_wind");
            Fight(s3, EnemyState.Number(Suit.Hearts, Rank.Ten, EnemyTier.Veteran)); // atk 6
            Must(s3.Dispatch(new UseRelic("second_wind")));
            var r2 = Must(s3.Dispatch(new Yield()));
            Check(r2.Events.OfType<RelicUsed>().Any(e => e.RelicId == "second_wind") &&
                  s3.State.PendingChoice == null, "the counterattack never comes");

            var s4 = NewRun("aegis");
            Wear(s4, "aegis");
            Fight(s4, EnemyState.Number(Suit.Hearts, Rank.Ten, EnemyTier.Veteran)); // atk 6
            Must(s4.Dispatch(new UseRelic("aegis")));
            var r3 = Must(s4.Dispatch(new Yield()));
            Check(Get<CounterattackIncoming>(r3).NetAttack == 1, "6 blunted by 5 → 1");
            Must(s4.Dispatch(new DefendDiscard(s4.State.Deck.Hand[0])));
        }

        private static void TestAmuletsTwo()
        {
            var s = NewRun("bloodlust");
            Wear(s, "bloodlust");
            Fight(s, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            ClearHand(s);
            var h5 = Give(s, Suit.Hearts, Rank.Five);
            Give(s, Suit.Diamonds, Rank.Ten);
            Give(s, Suit.Diamonds, Rank.Ten);
            Must(s.Dispatch(new UseRelic("bloodlust")));
            var r = Must(s.Dispatch(new PlayCards(h5.PhysicalId)));
            Check(Get<DamageDealt>(r).Amount == 8, "5 + 3 bloodlust = 8");
            Must(s.Dispatch(new DefendDiscard(s.State.Deck.Hand.ToList())));

            var s2 = NewRun("echo");
            Wear(s2, "echo");
            Fight(s2, EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish)); // 18 hp
            var loud = GiveDiscard(s2, Suit.Clubs, Rank.Nine); // a ♣ in the discard
            ClearHand(s2);
            Give(s2, Suit.Spades, Rank.Three);
            s2.State.Encounter.Current.Hp = 9;
            var r2 = Must(s2.Dispatch(new UseRelic("echo", loud.PhysicalId)));
            Check(Get<DamageDealt>(r2).Amount == 9, "value only — the ♣ does not double");
            Check(Get<EnemyKilled>(r2).Kind == KillKind.Exact && Has<Recruited>(r2),
                "an exact echo still recruits");
            Check(s2.State.Deck.Discard.Contains(loud.PhysicalId), "the echoed card stays in the discard");

            var s3 = NewRun("lodestone");
            Wear(s3, "lodestone");
            Fight(s3, EnemyState.Royal(Suit.Hearts, Rank.King, EnemyTier.Boss));
            ClearHand(s3);
            int wanted = s3.State.Deck.Tavern[7]; // any specific buried card
            Must(s3.Dispatch(new UseRelic("lodestone", wanted)));
            Check(s3.State.Deck.Hand.Contains(wanted), "the named card is pulled into hand");
            MustFail(s3.Dispatch(new UseRelic("lodestone", s3.State.Deck.Tavern[0])), "once per fight");
        }

        // ── step-9 tests: sanctum & shrine ──────────────────────────────────────

        private static void TestSanctumShrine()
        {
            var s = NewRun("sanctum");
            EnterC2(s); // ch4 road holds the Shrine and the Forge|Sanctum fork

            // Stage a grafted card to rearrange later.
            var grafted = OwnInTavern(s, Suit.Hearts, Rank.Five);
            grafted.Grafts.Add(new GraftRecord(s.State.Cards.NextGraftSeq(), GraftKind.SuitAdd, default,
                Suit.Spades, "staged"));
            var receiver = OwnInTavern(s, Suit.Diamonds, Rank.Three);
            var spadey = OwnInTavern(s, Suit.Spades, Rank.Two);
            int seq = grafted.Grafts[0].Seq;

            MustFail(s.Dispatch(new RearrangeGraft(grafted.PhysicalId, seq, receiver.PhysicalId)),
                "no rearranging away from a sanctum");

            int shrineId = WalkUpTo(s, RoadNodeKind.Shrine);
            int fragsBefore = s.State.TokenFragments; // after the route's own 50/50 drops
            Must(s.Dispatch(new MoveToNode(shrineId)));
            Check(s.State.TokenFragments == fragsBefore + 1, "the shrine's blessing: +1 fragment");

            WalkTo(s, RoadNodeKind.Sanctum);
            Check(s.State.SanctumCharge, "the sanctum holds one rearrange");
            MustFail(s.Dispatch(new RearrangeGraft(grafted.PhysicalId, 999, receiver.PhysicalId)),
                "unknown graft seq");
            MustFail(s.Dispatch(new RearrangeGraft(grafted.PhysicalId, seq, spadey.PhysicalId)),
                "a suit-add onto a card already firing it is a no-op");

            var r = Must(s.Dispatch(new RearrangeGraft(grafted.PhysicalId, seq, receiver.PhysicalId)));
            Check(Has<GraftMoved>(r), "graft moved");
            Check(!grafted.FiresSuit(Suit.Spades), "the donor is plain 5♥ again");
            Check(receiver.FiresSuit(Suit.Spades) && receiver.FiresSuit(Suit.Diamonds),
                "the receiver now fires ♦ and ♠");
            MustFail(s.Dispatch(new RearrangeGraft(receiver.PhysicalId, receiver.Grafts[0].Seq, grafted.PhysicalId)),
                "once per visit");
        }

        // ── step-10 tests: meta/lineage ─────────────────────────────────────────

        private static void TestMeta()
        {
            var meta = new MetaState();
            meta.RecordRunStart();
            var lost = NewRun("meta-lost");
            lost.State.Phase = CampaignPhase.CampaignLost; // staged outcome
            meta.RecordOutcome(lost.State);
            Check(meta.Runs == 1 && meta.Wins == 0 && !meta.C2Cleared, "a loss banks nothing but the run");

            meta.RecordRunStart();
            var won = NewRun("meta-won");
            won.State.Phase = CampaignPhase.CampaignWon;
            meta.RecordOutcome(won.State);
            Check(meta.Runs == 2 && meta.Wins == 1 && meta.C2Cleared, "the crown banks the milestone");

            // Run history: identities stamped, outcomes recorded, round-tripped.
            meta.RecordRunClass(won.State);
            Check(meta.LatestRun.ClassId == "sentinel" && meta.LatestRun.StaffId == "hold_the_line",
                "class select stamps the run record");
            Check(meta.History.Count == 2 && meta.History[0].Outcome == "lost" &&
                  meta.History[1].Outcome == "won", "outcomes land on the right records");

            var back = MetaState.FromJson(meta.ToJson());
            Check(back.Runs == 2 && back.Wins == 1 && back.C2Cleared && back.Version == MetaState.CurrentVersion,
                "JSON round-trip preserves the lineage");
            Check(back.History.Count == 2 &&
                  back.History[1].ClassId == "sentinel" && back.History[1].Outcome == "won" &&
                  back.History[0].Outcome == "lost" && back.History[0].N == 1,
                "history survives the round-trip");

            // A hostile seed can't break the tiny parser (sanitized on write).
            var hostile = new MetaState();
            hostile.RecordRunStart("we\"ird{se[ed]},\\end");
            var hostileBack = MetaState.FromJson(hostile.ToJson());
            Check(hostileBack.History.Count == 1 && !hostileBack.History[0].Seed.Contains("\""),
                "seeds are sanitized before storage");

            // The cap holds.
            var many = new MetaState();
            for (int i = 0; i < MetaState.HistoryCap + 10; i++) many.RecordRunStart($"s{i}");
            Check(many.History.Count == MetaState.HistoryCap &&
                  MetaState.FromJson(many.ToJson()).History.Count == MetaState.HistoryCap,
                "history stays capped");

            string path = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "kingfall-meta-test.json");
            try
            {
                meta.SaveTo(path);
                var loaded = MetaState.LoadFrom(path);
                Check(loaded.Wins == 1 && loaded.C2Cleared, "disk round-trip");

                System.IO.File.WriteAllText(path, "{corrupt###");
                var fresh = MetaState.LoadFrom(path);
                Check(fresh.Runs == 0 && !fresh.C2Cleared, "a corrupt save yields a fresh lineage, never a crash");
            }
            finally
            {
                if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
            }
            Check(MetaState.LoadFrom("Z:\\no\\such\\dir\\meta.json").Runs == 0, "a missing file yields a fresh lineage");
        }

        // ── ValidatePlay (UI legality preview) ──────────────────────────────────

        private static void TestValidatePlay()
        {
            var s2 = NewRun("preview");
            Fight(s2, EnemyState.Number(Suit.Hearts, Rank.Ten, EnemyTier.Veteran)); // atk 6 — payable
            ClearHand(s2);
            var c6a = Give(s2, Suit.Clubs, Rank.Six);
            var c6b = Give(s2, Suit.Spades, Rank.Six);
            var c3 = Give(s2, Suit.Hearts, Rank.Three);

            Check(s2.ValidatePlay(new List<int> { c3.PhysicalId }) == null, "single card previews legal");
            Check(s2.ValidatePlay(new List<int> { c6a.PhysicalId, c6b.PhysicalId }) != null,
                "6+6=12 previews illegal");
            Check(s2.ValidatePlay(new List<int> { c6a.PhysicalId, c3.PhysicalId }) != null,
                "mixed ranks preview illegal");
            Check(s2.ValidatePlay(new List<int>()) != null, "empty selection previews illegal");
            Check(s2.ValidatePlay(new List<int> { 9999 }) != null, "unknown card previews illegal");

            // The preview mutates nothing and matches the dispatch verdict exactly.
            uint rng = s2.State.RngState;
            var handBefore = s2.State.Deck.Hand.ToList();
            string preview = s2.ValidatePlay(new List<int> { c6a.PhysicalId, c6b.PhysicalId });
            Check(s2.State.RngState == rng && s2.State.Deck.Hand.SequenceEqual(handBefore),
                "preview is a pure query");
            var r = s2.Dispatch(new PlayCards(c6a.PhysicalId, c6b.PhysicalId));
            Check(!r.Ok && r.Error == preview, "dispatch rejects with the same message");
            Check(s2.ValidatePlay(new List<int> { c3.PhysicalId }) == null &&
                  Must(s2.Dispatch(new PlayCards(c3.PhysicalId))).Ok, "legal preview → legal play");
            Must(s2.Dispatch(new DefendDiscard(s2.State.Deck.Hand.ToList())));
        }

        // ── killing-blow suit powers (user bug report) ──────────────────────────

        private static void TestKillingBlowEffects()
        {
            // ♦ killing blow must still draw.
            var s = NewRun("lastblow-draw");
            Fight(s, EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish));
            s.State.Encounter.Current.Hp = 5; // stage: the 5♦ kills exactly
            ClearHand(s);
            var d5 = Give(s, Suit.Diamonds, Rank.Five);
            var r = Must(s.Dispatch(new PlayCards(d5.PhysicalId)));
            Check(Get<EnemyKilled>(r).Kind == KillKind.Exact && Has<EncounterWon>(r), "the blow ends the fight");
            Check(Has<CardsDrawn>(r) && Get<CardsDrawn>(r).PhysicalIds.Count == 5,
                "♦ still draws 5 on the killing blow");
            Check(s.State.Deck.Hand.Count == 5, "the drawn cards are really in hand after the fight");

            // ♥ killing blow must still recover.
            var s2 = NewRun("lastblow-recover");
            Fight(s2, EnemyState.Number(Suit.Spades, Rank.Six, EnemyTier.Skirmish));
            for (int i = 0; i < 3; i++) GiveDiscard(s2, Suit.Clubs, Rank.Two);
            s2.State.Encounter.Current.Hp = 4;
            ClearHand(s2);
            var h4 = Give(s2, Suit.Hearts, Rank.Four);
            var r2 = Must(s2.Dispatch(new PlayCards(h4.PhysicalId)));
            Check(Has<EncounterWon>(r2) && Get<CardsRecovered>(r2).Count == 3,
                "♥ still recovers 3 on the killing blow");

            // And a boss killing blow: the seam rest redeals AFTER the draw —
            // the draw happens, then the seam reshuffles (that is by design, §9).
            var s3 = NewRun("lastblow-boss");
            WalkTo(s3, RoadNodeKind.Elite); // the elite is a merge point; the boss follows it
            var bossNode = s3.State.Map.Current.Next.Select(id => s3.State.Map.Get(id))
                            .First(n => n.Kind == RoadNodeKind.Boss);
            Must(s3.Dispatch(new MoveToNode(bossNode.Id)));
            while (s3.State.Encounter.Enemies.Count(e => e.Alive) > 1) // leave one boss enemy
            {
                var cur = s3.State.Encounter.Current;
                cur.Hp = 18; ClearHand(s3);
                var c9 = Give(s3, Suit.Clubs, Rank.Nine);
                Must(s3.Dispatch(new PlayCards(c9.PhysicalId)));
            }
            s3.State.Encounter.Current.Hp = 5;
            ClearHand(s3);
            var d5b = Give(s3, Suit.Diamonds, Rank.Five);
            var r3 = Must(s3.Dispatch(new PlayCards(d5b.PhysicalId)));
            Check(Has<CardsDrawn>(r3), "♦ draws on the boss killing blow too");
            // The draw refilled the hand, so a redundant kill may offer a graft
            // BEFORE the chapter wraps — resolve it, then the seam applies.
            if (s3.State.PendingChoice?.Kind == PendingChoiceKind.GraftSelect)
                r3 = Must(s3.Dispatch(new ChooseGraft(s3.State.Deck.Hand[0], GraftBranch.ReplaceRank)));
            Check(Has<SeamRestApplied>(r3), "then the seam redeals — that wash is intended (§9)");
        }

        // ── sparse road lanes ───────────────────────────────────────────────────

        private static void TestSparseLanes()
        {
            int crossroads = 0, forkPairs = 0, laneCommits = 0;
            for (int seedI = 0; seedI < 20; seedI++)
            {
                var rng = new Rng($"lanes-{seedI}");
                for (int ch = 1; ch <= 6; ch++)
                {
                    var map = RoadGen.Generate(ch, rng);
                    int last = map.Nodes.Max(n => n.Layer);
                    if (!map.Nodes.Where(n => n.Layer < last).All(n => n.Next.Count > 0))
                        throw new Exception($"dead end (seed {seedI} ch{ch})");

                    // Everything must stay reachable from the start (pillar 6).
                    var seen = new HashSet<int> { map.CurrentNodeId };
                    var q = new Queue<int>();
                    q.Enqueue(map.CurrentNodeId);
                    while (q.Count > 0)
                        foreach (int nx in map.Get(q.Dequeue()).Next)
                            if (seen.Add(nx)) q.Enqueue(nx);
                    if (seen.Count != map.Nodes.Count)
                        throw new Exception($"unreachable stop (seed {seedI} ch{ch})");

                    // Census of 2-wide → 2-wide layer pairs.
                    var layers = map.Nodes.GroupBy(n => n.Layer).OrderBy(g => g.Key)
                                          .Select(g => g.ToList()).ToList();
                    for (int i = 0; i + 1 < layers.Count; i++)
                    {
                        if (layers[i].Count != 2 || layers[i + 1].Count != 2) continue;
                        forkPairs++;
                        int edges = layers[i].Sum(n => n.Next.Count);
                        if (edges == 4) crossroads++;
                        if (edges == 2) laneCommits++;
                    }
                }
            }
            _passed += 2; // the throw-checks above
            Check(forkPairs > 100, $"census populated ({forkPairs} fork pairs)");
            Check(crossroads < forkPairs / 4, $"full crossroads are rare ({crossroads}/{forkPairs})");
            Check(laneCommits > forkPairs / 4, $"committed lanes are common ({laneCommits}/{forkPairs})");
        }

        // ── demo: a full scripted fight, played back like the UI would ─────────

        private static void DemoFight()
        {
            Console.WriteLine("── DEMO: scripted fight (seed \"kingfall\") ──────────────────");
            var s = new GameSession("kingfall");
            Play(s, new SelectClass("sentinel", "hold_the_line"));

            Console.WriteLine($"  Hand: {string.Join("  ", s.State.Deck.Hand.Select(id => s.State.Cards.Get(id)))}");
            Console.WriteLine("  Road (? = not yet scouted):");
            foreach (var layer in s.State.Map.Nodes.GroupBy(n => n.Layer).OrderBy(g => g.Key))
                Console.WriteLine($"    L{layer.Key}: {string.Join(" | ", layer.Select(n => n.Known ? n.Kind.ToString() : "?"))}");
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
