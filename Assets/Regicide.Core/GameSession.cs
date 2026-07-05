using System.Collections.Generic;
using System.Linq;

namespace Regicide.Core
{
    /// <summary>Outcome of a dispatch: either an error (nothing mutated) or events.</summary>
    public sealed class Result
    {
        public bool Ok;
        public string Error;
        public List<GameEvent> Events = new List<GameEvent>();

        public static Result Fail(string error) => new Result { Ok = false, Error = error };
        public static Result Success(List<GameEvent> events) => new Result { Ok = true, Events = events };
    }

    /// <summary>
    /// The single Core entry point (§2). Holds CampaignState; the UI submits IActions
    /// and re-renders from State, playing back the returned events. Validate-then-mutate:
    /// an invalid action returns an error and mutates nothing. Synchronous, no time.
    /// </summary>
    public sealed class GameSession
    {
        public CampaignState State { get; }
        private readonly Rng _rng;

        public GameSession(string seed, string id = null)
        {
            _rng = new Rng(seed);
            State = new CampaignState
            {
                Id = id ?? seed,
                Seed = seed,
                RngState = _rng.State,
            };
        }

        public Result Dispatch(IAction action)
        {
            Result result = action switch
            {
                SelectClass a => HandleSelectClass(a),
                StartEncounter a => HandleStartEncounter(a),
                PlayCards a => HandlePlayCards(a),
                Yield _ => HandleYield(),
                DefendDiscard a => HandleDefendDiscard(a),
                ChooseGraft a => HandleChooseGraft(a),
                _ => Result.Fail($"Unknown action {action?.GetType().Name ?? "null"}"),
            };
            State.RngState = _rng.State;
            if (result.Ok)
                foreach (var e in result.Events) State.Log.Add(e.ToString());
            return result;
        }

        // ── class select ────────────────────────────────────────────────────────

        private Result HandleSelectClass(SelectClass a)
        {
            if (State.Phase != CampaignPhase.ClassSelect)
                return Result.Fail("Not in class select");
            if (string.IsNullOrEmpty(a.ClassId) || string.IsNullOrEmpty(a.StaffId))
                return Result.Fail("Class and Staff are required");

            var events = new List<GameEvent>();
            State.Hero.ClassId = a.ClassId;
            State.Hero.StaffId = a.StaffId;
            events.Add(new RunStarted { ClassId = a.ClassId, StaffId = a.StaffId });

            // The identical 20-card starting deck: A–5 in all four suits (§4, §10).
            foreach (Suit suit in new[] { Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades })
                for (int r = 1; r <= Tuning.StartingDeckTopRank; r++)
                {
                    var card = State.Cards.Mint(suit, (Rank)r);
                    State.OwnedCards.Add(card.PhysicalId);
                    State.Deck.Tavern.Add(card.PhysicalId);
                }
            _rng.Shuffle(State.Deck.Tavern);

            DealHand(events);
            State.Phase = CampaignPhase.Road;
            return Result.Success(events);
        }

        /// <summary>
        /// Draw up to MaxHandSize, then apply opening-hand forgiveness: if no card in
        /// hand fires ♦, swap the lowest hand card for the Tavern's first ♦ (§9).
        /// </summary>
        private void DealHand(List<GameEvent> events)
        {
            var dealt = new HandDealt();
            while (State.Deck.Hand.Count < State.MaxHandSize && State.Deck.Tavern.Count > 0)
            {
                int id = State.Deck.Tavern[0];
                State.Deck.Tavern.RemoveAt(0);
                State.Deck.Hand.Add(id);
                dealt.PhysicalIds.Add(id);
            }

            bool hasDiamond = State.Deck.Hand.Any(id => State.Cards.Get(id).FiresSuit(Suit.Diamonds));
            if (!hasDiamond && State.Deck.Hand.Count > 0)
            {
                int tavernIdx = State.Deck.Tavern.FindIndex(id => State.Cards.Get(id).FiresSuit(Suit.Diamonds));
                if (tavernIdx >= 0)
                {
                    int lowestHandIdx = 0;
                    for (int i = 1; i < State.Deck.Hand.Count; i++)
                        if (State.Cards.Get(State.Deck.Hand[i]).EffectiveValue() <
                            State.Cards.Get(State.Deck.Hand[lowestHandIdx]).EffectiveValue())
                            lowestHandIdx = i;

                    (State.Deck.Hand[lowestHandIdx], State.Deck.Tavern[tavernIdx]) =
                        (State.Deck.Tavern[tavernIdx], State.Deck.Hand[lowestHandIdx]);
                }
            }
            events.Add(dealt);
        }

        // ── encounter entry ─────────────────────────────────────────────────────

        private Result HandleStartEncounter(StartEncounter a)
        {
            if (State.Phase != CampaignPhase.Road)
                return Result.Fail("Can only start an encounter from the road");
            if (a.Enemies == null || a.Enemies.Count == 0)
                return Result.Fail("Encounter needs at least one enemy");

            State.Encounter = new EncounterState { Enemies = new List<EnemyState>(a.Enemies) };
            State.Phase = CampaignPhase.Encounter;
            return Result.Success(new List<GameEvent>
            {
                new EncounterStarted { EnemyCount = a.Enemies.Count },
                new NextEnemy { Face = State.Encounter.Current.Face },
            });
        }

        // ── combat: play / yield ────────────────────────────────────────────────

        private Result HandlePlayCards(PlayCards a)
        {
            string gate = ValidateCombatActionAllowed();
            if (gate != null) return Result.Fail(gate);

            var ids = a.PhysicalIds;
            if (ids == null || ids.Count == 0) return Result.Fail("No cards selected (use Yield to pass)");
            if (ids.Distinct().Count() != ids.Count) return Result.Fail("Duplicate card in play");
            foreach (int id in ids)
                if (!State.Deck.Hand.Contains(id)) return Result.Fail($"Card #{id} is not in hand");

            var cards = ids.Select(id => State.Cards.Get(id)).ToList();
            string comboError = ValidateCombo(cards);
            if (comboError != null) return Result.Fail(comboError);

            // ── validated; mutate from here ──
            var events = new List<GameEvent>();
            var enemy = State.Encounter.Current;

            int baseAttack = cards.Sum(c => c.EffectiveValue());
            var activeSuits = cards.SelectMany(c => c.EffectiveSuits()).Distinct().ToList();
            Suit? blocked = enemy.ImmuneSuit is Suit imm && activeSuits.Contains(imm) ? (Suit?)imm : null;
            bool SuitActive(Suit s) => activeSuits.Contains(s) && blocked != s;

            foreach (int id in ids) State.Deck.Hand.Remove(id);

            events.Add(new CardsPlayed
            {
                PhysicalIds = new List<int>(ids),
                BaseAttack = baseAttack,
                ActiveSuits = activeSuits,
                BlockedSuit = blocked,
            });

            // Suit powers (§3). Immune suit still contributes value, never its power.
            if (SuitActive(Suit.Spades))
            {
                enemy.Shield += baseAttack;
                events.Add(new ShieldGained { Amount = baseAttack, Total = enemy.Shield });
            }
            if (SuitActive(Suit.Hearts))
            {
                // Recover BEFORE the played cards land in discard (they are still in play).
                int n = System.Math.Min(baseAttack, State.Deck.Discard.Count);
                if (n > 0)
                {
                    _rng.Shuffle(State.Deck.Discard);
                    var recovered = State.Deck.Discard.Take(n).ToList();
                    State.Deck.Discard.RemoveRange(0, n);
                    State.Deck.Tavern.AddRange(recovered); // bottom of the Tavern
                    events.Add(new CardsRecovered { Count = n });
                }
            }
            if (SuitActive(Suit.Diamonds))
            {
                var drawn = new CardsDrawn();
                for (int i = 0; i < baseAttack &&
                     State.Deck.Hand.Count < State.MaxHandSize &&
                     State.Deck.Tavern.Count > 0; i++)
                {
                    int id = State.Deck.Tavern[0];
                    State.Deck.Tavern.RemoveAt(0);
                    State.Deck.Hand.Add(id);
                    drawn.PhysicalIds.Add(id);
                }
                if (drawn.PhysicalIds.Count > 0) events.Add(drawn);
            }

            bool doubled = SuitActive(Suit.Clubs);
            int damage = doubled ? baseAttack * 2 : baseAttack;
            enemy.Hp -= damage;
            events.Add(new DamageDealt { Amount = damage, Doubled = doubled });

            State.Deck.Discard.AddRange(ids);

            ResolveDamageOutcome(events);
            return Result.Success(events);
        }

        private Result HandleYield()
        {
            string gate = ValidateCombatActionAllowed();
            if (gate != null) return Result.Fail(gate);

            var events = new List<GameEvent>();
            ResolveCounterattack(events);
            return Result.Success(events);
        }

        private string ValidateCombatActionAllowed()
        {
            if (State.Phase != CampaignPhase.Encounter) return "Not in an encounter";
            if (State.PendingChoice != null) return $"Resolve the pending {State.PendingChoice.Kind} first";
            if (State.Encounter?.Current == null) return "No enemy";
            return null;
        }

        /// <summary>Legal plays: 1 card · Ace + one non-Ace · same-rank set totalling ≤ 10 (§3).</summary>
        private static string ValidateCombo(List<PhysicalCard> cards)
        {
            if (cards.Count == 1) return null;

            var faces = cards.Select(c => c.EffectiveFace()).ToList();
            int aces = faces.Count(f => f.Rank == Rank.Ace);

            if (cards.Count == 2 && aces == 1)
                return null; // animal companion: one Ace + one non-Ace of any rank/suit

            if (faces.Select(f => f.Rank).Distinct().Count() == 1)
            {
                int total = cards.Sum(c => c.EffectiveValue());
                return total <= Tuning.ComboValueCap
                    ? null
                    : $"Same-rank combo total {total} exceeds {Tuning.ComboValueCap}";
            }

            return "Illegal combo: play 1 card, an Ace + one card, or a same-rank set totalling ≤ 10";
        }

        // ── combat resolution ───────────────────────────────────────────────────

        private void ResolveDamageOutcome(List<GameEvent> events)
        {
            var enemy = State.Encounter.Current;

            if (enemy.Hp == 0)
            {
                // Exact kill — THE reward trigger (§6). No counterattack; play again.
                enemy.Alive = false;
                events.Add(new EnemyKilled { Face = enemy.Face, Kind = KillKind.Exact });

                if (State.OwnsFace(enemy.Face))
                {
                    // Redundant kill → graft, if there is a hand card to graft onto.
                    if (State.Deck.Hand.Count > 0)
                    {
                        State.PendingChoice = new PendingChoice
                        {
                            Kind = PendingChoiceKind.GraftSelect,
                            SlainFace = enemy.Face,
                        };
                        events.Add(new GraftOffered { SlainFace = enemy.Face });
                        return; // fight continues after the choice resolves
                    }
                }
                else
                {
                    // Recruit: mint a PhysicalCard, shuffle it into the Tavern (§6).
                    var card = State.Cards.Mint(enemy.Suit, enemy.Rank);
                    State.OwnedCards.Add(card.PhysicalId);
                    State.Deck.Tavern.Insert(_rng.Int(State.Deck.Tavern.Count + 1), card.PhysicalId);
                    events.Add(new Recruited { PhysicalId = card.PhysicalId, Face = card.Printed });
                }

                AdvancePastDead(events);
            }
            else if (enemy.Hp < 0)
            {
                // Overkill — defeated, no reward, card lost (§3, §6). No counterattack.
                enemy.Alive = false;
                events.Add(new EnemyKilled { Face = enemy.Face, Kind = KillKind.Overkill });
                AdvancePastDead(events);
            }
            else
            {
                ResolveCounterattack(events);
            }
        }

        private void ResolveCounterattack(List<GameEvent> events)
        {
            var enemy = State.Encounter.Current;
            int net = System.Math.Max(0, enemy.Attack - enemy.Shield);

            if (net == 0)
            {
                events.Add(new CounterattackBlocked());
                return; // turn ends; play again next turn
            }

            if (State.HandTotalValue() < net)
            {
                events.Add(new PlayerDied { Unpayable = net });
                State.Hero.Alive = false;
                State.Phase = CampaignPhase.CampaignLost;
                return;
            }

            State.PendingChoice = new PendingChoice { Kind = PendingChoiceKind.Defend, RequiredValue = net };
            events.Add(new CounterattackIncoming { NetAttack = net });
        }

        private void AdvancePastDead(List<GameEvent> events)
        {
            var enc = State.Encounter;
            while (enc.CurrentIndex < enc.Enemies.Count && !enc.Enemies[enc.CurrentIndex].Alive)
                enc.CurrentIndex++;

            if (enc.AllDead)
            {
                events.Add(new EncounterWon());
                State.Encounter = null;
                State.Phase = CampaignPhase.Road;

                // Agnostic fragment economy: 50% drop after each won encounter (§7).
                if (_rng.NextDouble() < Tuning.FragmentDropChance)
                {
                    State.TokenFragments++;
                    events.Add(new FragmentDropped { Total = State.TokenFragments });
                }
            }
            else
            {
                events.Add(new NextEnemy { Face = enc.Current.Face });
            }
        }

        // ── pending choices ─────────────────────────────────────────────────────

        private Result HandleDefendDiscard(DefendDiscard a)
        {
            var pending = State.PendingChoice;
            if (pending == null || pending.Kind != PendingChoiceKind.Defend)
                return Result.Fail("No defend pending");

            var ids = a.PhysicalIds ?? new List<int>();
            if (ids.Distinct().Count() != ids.Count) return Result.Fail("Duplicate card in defend");
            foreach (int id in ids)
                if (!State.Deck.Hand.Contains(id)) return Result.Fail($"Card #{id} is not in hand");

            int paid = ids.Sum(id => State.Cards.Get(id).EffectiveValue());
            if (paid < pending.RequiredValue)
                return Result.Fail($"Selected {paid}, need {pending.RequiredValue}");

            // ── validated; mutate ──
            foreach (int id in ids) State.Deck.Hand.Remove(id);
            State.Deck.Discard.AddRange(ids);
            State.PendingChoice = null;

            return Result.Success(new List<GameEvent>
            {
                new Defended { Paid = paid, Required = pending.RequiredValue },
            });
        }

        private Result HandleChooseGraft(ChooseGraft a)
        {
            var pending = State.PendingChoice;
            if (pending == null || pending.Kind != PendingChoiceKind.GraftSelect)
                return Result.Fail("No graft pending");
            if (!State.Deck.Hand.Contains(a.TargetPhysicalId))
                return Result.Fail($"Card #{a.TargetPhysicalId} is not in hand");

            var card = State.Cards.Get(a.TargetPhysicalId);
            var slain = pending.SlainFace;
            string source = $"exact-kill {PhysicalCard.Pretty(slain)} (ch{State.Chapter})";

            GraftRecord graft;
            if (a.Branch == GraftBranch.ReplaceRank)
            {
                // Royal cap: a rank graft never goes above 10 (§6).
                int r = System.Math.Min((int)slain.Rank, Tuning.GraftRankCap);
                graft = new GraftRecord(State.Cards.NextGraftSeq(), GraftKind.Rank, (Rank)r, default, source);
            }
            else
            {
                if (card.FiresSuit(slain.Suit))
                    return Result.Fail($"#{card.PhysicalId} already fires {PhysicalCard.SuitGlyph(slain.Suit)} — pick another card or branch");
                graft = new GraftRecord(State.Cards.NextGraftSeq(), GraftKind.SuitAdd, default, slain.Suit, source);
            }

            // ── validated; mutate ──
            card.Grafts.Add(graft);
            State.PendingChoice = null;

            var events = new List<GameEvent>
            {
                new GraftApplied
                {
                    PhysicalId = card.PhysicalId,
                    Branch = a.Branch,
                    SlainFace = slain,
                    NewEffective = card.EffectiveFace(),
                },
            };
            AdvancePastDead(events); // resume the fight (or win it)
            return Result.Success(events);
        }
    }
}
