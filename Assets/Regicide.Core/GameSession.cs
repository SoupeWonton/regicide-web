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
    /// A read-only forecast of a play (see <see cref="GameSession.PreviewPlay"/>).
    /// Everything the UI needs to tell the truth before the click.
    /// </summary>
    public struct PlayPreview
    {
        public bool Legal;
        /// <summary>ValidatePlay's rejection when not legal; null otherwise.</summary>
        public string Illegal;
        public int Damage;
        /// <summary>Block added by ♠ (or an armed Transfuse).</summary>
        public int ShieldGain;
        /// <summary>♦ cards that would actually be drawn (caps applied).</summary>
        public int Draw;
        /// <summary>♥ discards that would return (or the pick ceiling under Triage).</summary>
        public int Recover;
        public bool RecoverIsChoice;
        /// <summary>Exact / Overkill, or null when the enemy survives.</summary>
        public KillKind? Outcome;
        public Suit? BlockedSuit;
        public bool Doubled;
        public bool WhetstoneShaved;
        /// <summary>Counterattack after this play's shield, when the enemy survives.</summary>
        public int NetCounter;
        /// <summary>Known post-play hand value available to pay that counter.</summary>
        public int CounterCoverage;
        /// <summary>True only when death is CERTAIN (even best-case draws can't pay).</summary>
        public bool LethalCounter;
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
                MoveToNode a => HandleMoveToNode(a),
                ChooseHunt a => HandleChooseHunt(a),
                ChooseRoyal a => HandleChooseRoyal(a),
                ActivateStaff a => HandleActivateStaff(a),
                SwapStaff a => HandleSwapStaff(a),
                ChooseRecover a => HandleChooseRecover(a),
                ChooseOverdraw a => HandleChooseOverdraw(a),
                ArmCrystal a => HandleArmCrystal(a),
                ForgeConvert _ => HandleForgeConvert(),
                CastSpell a => HandleCastSpell(a),
                RearrangeGraft a => HandleRearrangeGraft(a),
                ChooseRelic a => HandleChooseRelic(a),
                EquipRelic a => HandleEquipRelic(a),
                BuyRelic a => HandleBuyRelic(a),
                UseRelic a => HandleUseRelic(a),
                ContinueRun _ => HandleContinueRun(),
                _ => Result.Fail($"Unknown action {action?.GetType().Name ?? "null"}"),
            };
            // Draw() may queue an OverdrawPick from deep inside any handler — surface
            // the offer as an event without threading a list through every call site.
            if (result.Ok && _overdrawOffer != null)
                result.Events.Add(_overdrawOffer);
            _overdrawOffer = null;
            State.RngState = _rng.State;
            if (result.Ok)
                foreach (var e in result.Events) State.Log.Add(e.ToString());
            return result;
        }

        /// <summary>Set by Draw() when an overdraw pick is queued; drained by Dispatch.</summary>
        private OverdrawOffered _overdrawOffer;

        // ── class select ────────────────────────────────────────────────────────

        private Result HandleSelectClass(SelectClass a)
        {
            if (State.Phase != CampaignPhase.ClassSelect)
                return Result.Fail("Not in class select");
            if (!ClassTables.IsValidPick(a.ClassId, a.StaffId))
                return Result.Fail($"Unknown class/Staff pick '{a.ClassId}' / '{a.StaffId}'");

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
            State.Map = RoadGen.Generate(State.Chapter, _rng);
            events.Add(new MapGenerated { Chapter = State.Chapter, NodeCount = State.Map.Nodes.Count });
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

        /// <summary>
        /// Draw up to <paramref name="count"/> cards, capped by hand size and the Tavern.
        /// Overdraw (house rule, 2026-07): when draws are still owed as the LAST hand
        /// slot comes up, that slot isn't drawn blind — the owed cards are revealed
        /// (they stay on the Tavern top) and an OverdrawPick lets the player take one;
        /// the rest shuffle back into the Tavern on resolution.
        /// </summary>
        private CardsDrawn Draw(int count)
        {
            var drawn = new CardsDrawn();
            // While a pick owns the Tavern top, further draws would corrupt the
            // revealed set — they stay lost, exactly like the old full-hand fizzle.
            if (State.PendingChoices.Any(p => p.Kind == PendingChoiceKind.OverdrawPick))
                return drawn;

            while (drawn.PhysicalIds.Count < count &&
                   State.Deck.Hand.Count < State.MaxHandSize &&
                   State.Deck.Tavern.Count > 0)
            {
                int owed = count - drawn.PhysicalIds.Count;
                if (State.Deck.Hand.Count == State.MaxHandSize - 1 &&
                    owed >= 2 && State.Deck.Tavern.Count >= 2)
                {
                    var options = State.Deck.Tavern
                        .Take(System.Math.Min(owed, State.Deck.Tavern.Count)).ToList();
                    State.PendingChoices.Add(new PendingChoice
                    {
                        Kind = PendingChoiceKind.OverdrawPick,
                        OverdrawIds = options,
                    });
                    _overdrawOffer = new OverdrawOffered { Options = new List<int>(options) };
                    break;
                }

                int id = State.Deck.Tavern[0];
                State.Deck.Tavern.RemoveAt(0);
                State.Deck.Hand.Add(id);
                drawn.PhysicalIds.Add(id);
            }
            return drawn;
        }

        private Result HandleChooseOverdraw(ChooseOverdraw a)
        {
            var pending = State.PendingChoice;
            if (pending == null || pending.Kind != PendingChoiceKind.OverdrawPick)
                return Result.Fail("No overdraw pick pending");
            if (!pending.OverdrawIds.Contains(a.PhysicalId))
                return Result.Fail($"Card #{a.PhysicalId} is not on offer");

            // ── validated; mutate ── the pick fills the last slot; the Tavern
            // shuffles so the revealed leftovers can't be tracked.
            State.Deck.Tavern.Remove(a.PhysicalId);
            State.Deck.Hand.Add(a.PhysicalId);
            _rng.Shuffle(State.Deck.Tavern);
            State.PendingChoices.RemoveAt(0);
            var events = new List<GameEvent>
            {
                new CardsDrawn { PhysicalIds = { a.PhysicalId } },
                new OverdrawPicked { PhysicalId = a.PhysicalId, ShuffledBack = pending.OverdrawIds.Count - 1 },
            };

            // The counter's death test was deferred past this pick — the hand is
            // final now, so an unpayable Defend resolves the only way it can.
            var head = State.PendingChoice;
            if (head != null && head.Kind == PendingChoiceKind.Defend &&
                State.HandTotalValue() < head.RequiredValue)
            {
                events.Add(new PlayerDied { Unpayable = head.RequiredValue });
                State.Hero.Alive = false;
                State.Phase = CampaignPhase.CampaignLost;
            }
            return Result.Success(events);
        }

        // ── encounter entry ─────────────────────────────────────────────────────

        private Result HandleStartEncounter(StartEncounter a)
        {
            if (State.Phase != CampaignPhase.Road)
                return Result.Fail("Can only start an encounter from the road");
            if (State.PendingChoice != null)
                return Result.Fail($"Resolve the pending {State.PendingChoice.Kind} first");
            if (a.Enemies == null || a.Enemies.Count == 0)
                return Result.Fail("Encounter needs at least one enemy");

            var events = new List<GameEvent>();
            BeginEncounter(a.Enemies, null, events);
            return Result.Success(events);
        }

        /// <summary>Enter a fight, consuming any armed Camp bonuses (§9).</summary>
        private void BeginEncounter(List<EnemyState> enemies, int? nodeId, List<GameEvent> events, Rank? gateRank = null)
        {
            State.Encounter = new EncounterState
            {
                Enemies = new List<EnemyState>(enemies),
                FirstAttackDouble = State.NextFightFirstAttackDouble,
                IsGate = gateRank != null,
                GateRank = gateRank ?? default,
            };
            State.EncounterNodeId = nodeId;
            State.NextFightFirstAttackDouble = false;

            if (State.NextFightStartShield > 0)
            {
                State.Encounter.Current.Shield += State.NextFightStartShield;
                State.NextFightStartShield = 0;
            }

            // Vanguard (§8): the first fight of each road opens without a counterattack.
            if (State.HasRelic("vanguard") && !State.RoadFirstFightDone)
                State.Encounter.VanguardArmed = true;
            State.RoadFirstFightDone = true;

            State.Phase = CampaignPhase.Encounter;
            events.Add(new EncounterStarted { EnemyCount = enemies.Count });
            events.Add(new NextEnemy { Face = State.Encounter.Current.Face });

            // Interest (§8): a fight after a no-pay fight starts +1 card.
            if (State.HasRelic("interest") && State.LastFightPaidNothing)
            {
                var drawn = Draw(Tuning.InterestDraw);
                if (drawn.PhysicalIds.Count > 0)
                {
                    events.Add(new RelicUsed { RelicId = "interest", Note = $"+{drawn.PhysicalIds.Count} card" });
                    events.Add(drawn);
                }
            }

            CheckTurnStart(events);
        }

        /// <summary>
        /// A player turn is about to begin (fight start, or a counterattack just
        /// resolved). Last Coin's empty-hand rescue fires first, then a Debt
        /// installment comes due (skipped on an empty hand — no soft-locks, §1).
        /// </summary>
        private void CheckTurnStart(List<GameEvent> events)
        {
            var enc = State.Encounter;
            if (State.Phase != CampaignPhase.Encounter || enc?.Current == null || State.PendingChoice != null)
                return;

            if (State.HasRelic("last_coin") && State.Deck.Hand.Count == 0 &&
                !enc.UsedThisFight.Contains("last_coin"))
            {
                enc.UsedThisFight.Add("last_coin");
                var drawn = Draw(Tuning.LastCoinDraw);
                if (drawn.PhysicalIds.Count > 0)
                {
                    events.Add(new RelicUsed { RelicId = "last_coin", Note = $"empty-handed — drew {drawn.PhysicalIds.Count}" });
                    events.Add(drawn);
                }
            }

            if (enc.DebtTurnsRemaining > 0 && State.Deck.Hand.Count > 0)
            {
                enc.DebtTurnsRemaining--;
                State.PendingChoices.Add(new PendingChoice { Kind = PendingChoiceKind.DebtDiscard, RequiredValue = 1 });
                events.Add(new DebtDue());
            }
        }

        // ── combat: play / yield ────────────────────────────────────────────────

        /// <summary>
        /// Would this play be legal RIGHT NOW? Pure query — mutates nothing, returns
        /// the exact rejection HandlePlayCards would give, or null when legal. The
        /// UI uses it to explain illegal combos before the player clicks (§16).
        /// </summary>
        public string ValidatePlay(List<int> physicalIds)
        {
            string gate = ValidateCombatActionAllowed();
            if (gate != null) return gate;

            if (physicalIds == null || physicalIds.Count == 0) return "No cards selected (use Yield to pass)";
            if (physicalIds.Distinct().Count() != physicalIds.Count) return "Duplicate card in play";
            foreach (int id in physicalIds)
                if (!State.Deck.Hand.Contains(id)) return $"Card #{id} is not in hand";

            var cards = physicalIds.Select(id => State.Cards.Get(id)).ToList();
            return ValidateCombo(cards, out _);
        }

        /// <summary>
        /// What a play would ACTUALLY do — the full pipeline (ace-in-hole, immunity/
        /// unbinding, ♣ double/steady hand, camp double, keen edge, bank, whetstone
        /// charge, draw/recover caps) computed read-only. The UI's single source of
        /// pre-play truth (§16); mutates nothing, mirrors HandlePlayCards exactly.
        /// </summary>
        public PlayPreview PreviewPlay(List<int> ids)
        {
            var p = new PlayPreview { Illegal = ValidatePlay(ids) };
            if (p.Illegal != null) return p;
            p.Legal = true;

            var enc = State.Encounter;
            var enemy = enc.Current;
            var cards = ids.Select(id => State.Cards.Get(id)).ToList();

            int baseAttack = cards.Sum(c => c.EffectiveValue());
            if (enc.AceInHoleArmed && cards.Count == 2 &&
                cards.Count(c => c.EffectiveFace().Rank == Rank.Ace) == 1)
                baseAttack = cards.First(c => c.EffectiveFace().Rank != Rank.Ace).EffectiveValue() * 2;

            var activeSuits = cards.SelectMany(c => c.EffectiveSuits()).Distinct().ToList();
            Suit? blocked = enemy.ImmuneSuit is Suit imm && activeSuits.Contains(imm) ? (Suit?)imm : null;
            if (blocked != null && enc.UnbindingArmed) blocked = null;
            p.BlockedSuit = blocked;
            bool Active(Suit s) => activeSuits.Contains(s) && blocked != s;

            if (Active(Suit.Spades)) p.ShieldGain += baseAttack;

            if (Active(Suit.Hearts))
            {
                if (enc.TransfuseArmed)
                {
                    p.ShieldGain += baseAttack;
                }
                else
                {
                    int bonus = State.Hero.StaffId == "field_dressing" &&
                                !enc.UsedThisEnemy.Contains("field_dressing")
                        ? Tuning.FieldDressingBonus : 0;
                    p.Recover = System.Math.Min(baseAttack + bonus, State.Deck.Discard.Count);
                    p.RecoverIsChoice = State.Hero.StaffId == "triage" && p.Recover > 0;
                }
            }

            if (Active(Suit.Diamonds))
            {
                int space = System.Math.Max(0, State.MaxHandSize - (State.Deck.Hand.Count - ids.Count));
                p.Draw = System.Math.Min(baseAttack, System.Math.Min(space, State.Deck.Tavern.Count));
            }

            p.Doubled = Active(Suit.Clubs) && !enc.SteadyHandArmed;
            int damage = p.Doubled ? baseAttack * 2 : baseAttack;
            if (enc.FirstAttackDouble) damage *= 2;
            if (enc.KeenEdgeArmed) damage *= 2;
            damage += enc.AttackBank;
            if (State.Hero.StaffId == "whetstone" && !enc.UsedThisEnemy.Contains("whetstone") &&
                damage > enemy.Hp && damage - enemy.Hp <= Tuning.WhetstoneShaveMax)
            {
                p.WhetstoneShaved = true;
                damage = enemy.Hp;
            }
            p.Damage = damage;

            int hpAfter = enemy.Hp - damage;
            p.Outcome = hpAfter == 0 ? KillKind.Exact : hpAfter < 0 ? (KillKind?)KillKind.Overkill : null;

            if (p.Outcome == null)
            {
                int net = System.Math.Max(0, enemy.Attack - (enemy.Shield + p.ShieldGain));
                if (net > 0 && enc.AegisArmed) net = System.Math.Max(0, net - Tuning.AegisReduction);
                if (enc.SecondWindArmed || enc.VanguardArmed) net = 0;
                p.NetCounter = net;

                // CERTAIN death only: the known post-play hand can't pay even if
                // every unknown draw (♦ and Rally) came up a King.
                int known = 0;
                foreach (int id in State.Deck.Hand)
                    if (!ids.Contains(id)) known += State.Cards.Get(id).EffectiveValue();
                p.CounterCoverage = known;
                int optimism = p.Draw * CardRules.AttackValue(Rank.King) +
                               (enc.RallyArmed ? System.Math.Min(net, Tuning.RallyDrawCap) * CardRules.AttackValue(Rank.King) : 0);
                p.LethalCounter = net > 0 && known + optimism < net;
            }
            return p;
        }

        /// <summary>What yielding right now costs — and whether it is certain death.</summary>
        public (int net, bool lethal) YieldPreview()
        {
            var enc = State.Encounter;
            var enemy = enc?.Current;
            if (enemy == null || State.Phase != CampaignPhase.Encounter) return (0, false);

            int net = System.Math.Max(0, enemy.Attack - enemy.Shield);
            if (net > 0 && enc.AegisArmed) net = System.Math.Max(0, net - Tuning.AegisReduction);
            if (enc.SecondWindArmed || enc.VanguardArmed) net = 0;

            bool rescue = enc.RallyArmed ||
                          (State.Deck.Hand.Count == 0 && State.HasRelic("last_coin") &&
                           !enc.UsedThisFight.Contains("last_coin"));
            return (net, net > 0 && !rescue && State.HandTotalValue() < net);
        }

        private Result HandlePlayCards(PlayCards a)
        {
            string invalid = ValidatePlay(a.PhysicalIds);
            if (invalid != null) return Result.Fail(invalid);

            var ids = a.PhysicalIds;
            var cards = ids.Select(id => State.Cards.Get(id)).ToList();
            ValidateCombo(cards, out bool usedCommit); // re-derive which allowance the play uses

            // ── validated; mutate from here ──
            var events = new List<GameEvent>();
            var enemy = State.Encounter.Current;

            if (usedCommit) State.Encounter.CommitArmed = false; // the extra card spent it (§7)

            int baseAttack = cards.Sum(c => c.EffectiveValue());

            // Ace in the Hole (§10): the next Ace pair plays the Ace at the partner's value.
            if (State.Encounter.AceInHoleArmed && cards.Count == 2 &&
                cards.Count(c => c.EffectiveFace().Rank == Rank.Ace) == 1)
            {
                var partner = cards.First(c => c.EffectiveFace().Rank != Rank.Ace);
                baseAttack = partner.EffectiveValue() * 2;
                State.Encounter.AceInHoleArmed = false;
                events.Add(new StaffTriggered { StaffId = "ace_in_the_hole", Note = $"the Ace plays at {partner.EffectiveValue()}" });
            }

            var activeSuits = cards.SelectMany(c => c.EffectiveSuits()).Distinct().ToList();
            Suit? blocked = enemy.ImmuneSuit is Suit imm && activeSuits.Contains(imm) ? (Suit?)imm : null;
            if (blocked != null && State.Encounter.UnbindingArmed)
            {
                // Unbinding (§8): the enemy's immunity is cancelled for this play only.
                State.Encounter.UnbindingArmed = false;
                blocked = null;
                events.Add(new RelicUsed { RelicId = "unbinding", Note = "immunity cancelled for this play" });
            }
            bool SuitActive(Suit s) => activeSuits.Contains(s) && blocked != s;

            foreach (int id in ids) State.Deck.Hand.Remove(id);

            events.Add(new CardsPlayed
            {
                PhysicalIds = new List<int>(ids),
                BaseAttack = baseAttack,
                ActiveSuits = activeSuits,
                BlockedSuit = blocked,
            });

            enemy.SpadeCardsPlayed += cards.Count(c => c.FiresSuit(Suit.Spades));

            // Suit powers (§3). Immune suit still contributes value, never its power.
            if (SuitActive(Suit.Spades))
            {
                enemy.Shield += baseAttack;
                events.Add(new ShieldGained { Amount = baseAttack, Total = enemy.Shield });
            }
            if (SuitActive(Suit.Hearts))
            {
                var enc = State.Encounter;
                if (enc.TransfuseArmed)
                {
                    // Transfuse (§10): this ♥ play skips recovery; its value becomes shield.
                    enc.TransfuseArmed = false;
                    enemy.Shield += baseAttack;
                    events.Add(new StaffTriggered { StaffId = "transfuse", Note = $"recovery becomes {baseAttack} shield" });
                    events.Add(new ShieldGained { Amount = baseAttack, Total = enemy.Shield });
                }
                else
                {
                    // Recover BEFORE the played cards land in discard (they are still in play).
                    // Field Dressing (§10): the first recovery each enemy recovers +1.
                    int bonus = State.Hero.StaffId == "field_dressing" &&
                                !enc.UsedThisEnemy.Contains("field_dressing")
                        ? Tuning.FieldDressingBonus : 0;
                    int n = System.Math.Min(baseAttack + bonus, State.Deck.Discard.Count);
                    if (n > 0)
                    {
                        if (bonus > 0) enc.UsedThisEnemy.Add("field_dressing");

                        if (State.Hero.StaffId == "triage")
                        {
                            // Triage (§10): recovery pauses — the player picks which
                            // discards return, instead of random ones. Queued so the
                            // rest of the play (draws, damage, kill) resolves first.
                            State.PendingChoices.Add(new PendingChoice
                            {
                                Kind = PendingChoiceKind.RecoverSelect,
                                RecoverIds = new List<int>(State.Deck.Discard),
                                RecoverMax = n,
                            });
                            events.Add(new RecoverChoiceOffered
                            {
                                Kind = PendingChoiceKind.RecoverSelect,
                                Options = new List<int>(State.Deck.Discard),
                                Max = n,
                            });
                        }
                        else
                        {
                            _rng.Shuffle(State.Deck.Discard);
                            var recovered = State.Deck.Discard.Take(n).ToList();
                            State.Deck.Discard.RemoveRange(0, n);
                            State.Deck.Tavern.AddRange(recovered); // bottom of the Tavern
                            events.Add(new CardsRecovered { Count = n });

                            // Last Rites (§10, once/enemy): pick one recovered card into hand.
                            if (State.Hero.StaffId == "last_rites" &&
                                !enc.UsedThisEnemy.Contains("last_rites") &&
                                State.Deck.Hand.Count < State.MaxHandSize)
                            {
                                enc.UsedThisEnemy.Add("last_rites");
                                State.PendingChoices.Add(new PendingChoice
                                {
                                    Kind = PendingChoiceKind.RecoverToHand,
                                    RecoverIds = recovered,
                                });
                                events.Add(new RecoverChoiceOffered
                                {
                                    Kind = PendingChoiceKind.RecoverToHand,
                                    Options = new List<int>(recovered),
                                    Max = 1,
                                });
                            }
                        }
                    }
                }
            }
            if (SuitActive(Suit.Diamonds))
            {
                var drawn = Draw(baseAttack); // may queue an OverdrawPick for the last slot
                if (drawn.PhysicalIds.Count > 0) events.Add(drawn);
            }

            // Damage pipeline: multipliers first (♣, Camp), then flat banked bonuses,
            // then the Whetstone shave against the final number.
            bool doubled = SuitActive(Suit.Clubs);
            if (doubled && State.Encounter.SteadyHandArmed)
            {
                // Steady Hand (§10): deal single damage on purpose. Consumed here.
                doubled = false;
                State.Encounter.SteadyHandArmed = false;
                events.Add(new StaffTriggered { StaffId = "steady_hand", Note = "♣ double skipped" });
            }
            int damage = doubled ? baseAttack * 2 : baseAttack;
            if (State.Encounter.FirstAttackDouble)
            {
                damage *= 2; // Camp bonus: the fight's first attack deals double (§9)
                State.Encounter.FirstAttackDouble = false;
            }
            if (State.Encounter.KeenEdgeArmed)
            {
                damage *= 2; // Keen Edge (♣ Fragment, §7): the next attack deals ×2
                State.Encounter.KeenEdgeArmed = false;
            }
            if (State.Encounter.AttackBank > 0)
            {
                damage += State.Encounter.AttackBank; // Bloodletting bank (§10)
                events.Add(new StaffTriggered { StaffId = "bloodletting", Note = $"+{State.Encounter.AttackBank} banked damage" });
                State.Encounter.AttackBank = 0;
            }
            if (State.Hero.StaffId == "whetstone" &&
                !State.Encounter.UsedThisEnemy.Contains("whetstone") &&
                damage > enemy.Hp && damage - enemy.Hp <= Tuning.WhetstoneShaveMax)
            {
                // Whetstone (§10, once/enemy): shave a 1–2 point overshoot to an exact kill.
                State.Encounter.UsedThisEnemy.Add("whetstone");
                events.Add(new StaffTriggered { StaffId = "whetstone", Note = $"overshoot shaved {damage - enemy.Hp} → exact" });
                damage = enemy.Hp;
            }
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

        /// <summary>
        /// Legal plays: 1 card · Ace + one non-Ace · same-rank set totalling ≤ 10 (§3).
        /// Staff passives widen this (§10): Reinforce lets a same-rank set include ONE
        /// true ♠ of any rank (the ♠ rides outside the value cap — "any rank" would be
        /// dead text otherwise); Dovetail lets it include ONE adjacent-rank card (the
        /// cap covers the whole play — adjacency, not rank freedom, is its point).
        /// </summary>
        private string ValidateCombo(List<PhysicalCard> cards, out bool usedCommit)
        {
            usedCommit = false;
            if (cards.Count == 1) return null;

            var faces = cards.Select(c => c.EffectiveFace()).ToList();
            int aces = faces.Count(f => f.Rank == Rank.Ace);

            if (cards.Count == 2 && aces == 1)
                return null; // animal companion: one Ace + one non-Ace of any rank/suit

            if (SameRankTotal(cards, out int total) && total <= Tuning.ComboValueCap)
                return null;

            string staff = State.Hero.StaffId;
            if (staff == "reinforce")
            {
                for (int i = 0; i < cards.Count; i++)
                {
                    if (cards[i].EffectiveFace().Suit != Suit.Spades) continue;
                    var rest = cards.Where((_, j) => j != i).ToList();
                    if (SameRankTotal(rest, out int t) && t <= Tuning.ComboValueCap)
                        return null;
                }
            }
            if (staff == "dovetail")
            {
                for (int i = 0; i < cards.Count; i++)
                {
                    var rest = cards.Where((_, j) => j != i).ToList();
                    if (!SameRankTotal(rest, out _)) continue;
                    int restRank = (int)rest[0].EffectiveFace().Rank;
                    int oddRank = (int)cards[i].EffectiveFace().Rank;
                    if (System.Math.Abs(restRank - oddRank) == 1 &&
                        cards.Sum(c => c.EffectiveValue()) <= Tuning.ComboValueCap)
                        return null;
                }
            }

            // Commit spell (♣ Half, §7): the next play may include ONE extra card of
            // any rank — the value cap still applies, and never with an Ace pair
            // (the pair shape validates above without touching the spell).
            if (State.Encounter != null && State.Encounter.CommitArmed)
            {
                for (int i = 0; i < cards.Count; i++)
                {
                    var rest = cards.Where((_, j) => j != i).ToList();
                    if (SameRankTotal(rest, out _) &&
                        cards.Sum(c => c.EffectiveValue()) <= Tuning.ComboValueCap)
                    {
                        usedCommit = true;
                        return null;
                    }
                }
            }

            if (SameRankTotal(cards, out int over))
                return $"Same-rank combo total {over} exceeds {Tuning.ComboValueCap}";
            return "Illegal combo: play 1 card, an Ace + one card, or a same-rank set totalling ≤ 10";
        }

        private static bool SameRankTotal(List<PhysicalCard> cards, out int total)
        {
            total = cards.Sum(c => c.EffectiveValue());
            return cards.Count > 0 &&
                   cards.Select(c => c.EffectiveFace().Rank).Distinct().Count() == 1;
        }

        // ── combat resolution ───────────────────────────────────────────────────

        private void ResolveDamageOutcome(List<GameEvent> events)
        {
            var enemy = State.Encounter.Current;

            if (enemy.Hp == 0)
            {
                // Exact kill — THE reward trigger (§6). No counterattack; play again.
                enemy.Alive = false;
                enemy.KillOutcome = KillKind.Exact;
                events.Add(new EnemyKilled { Face = enemy.Face, Kind = KillKind.Exact });

                if (State.OwnsFace(enemy.Face) || CardRules.IsRoyal(enemy.Rank))
                {
                    // Redundant kill → graft, if there is a hand card to graft onto.
                    // Royals (road duels AND gates) always take this path — recruiting
                    // a royal happens only through the gate keep pyramid, which resolves
                    // after the gate clears and can queue behind this graft (§6).
                    if (State.Deck.Hand.Count > 0)
                    {
                        State.PendingChoices.Add(new PendingChoice
                        {
                            Kind = PendingChoiceKind.GraftSelect,
                            SlainFace = enemy.Face,
                        });
                        events.Add(new GraftOffered { SlainFace = enemy.Face });
                        return; // fight continues after the choice resolves
                    }
                }
                else
                {
                    RecruitEnemy(enemy, false, events);
                }

                AdvancePastDead(events);
            }
            else if (enemy.Hp < 0)
            {
                // Overkill — defeated, no reward, card lost (§3, §6). No counterattack.
                // At a gate the royal is banished entirely — never eligible to keep.
                enemy.Alive = false;
                enemy.KillOutcome = KillKind.Overkill;
                events.Add(new EnemyKilled { Face = enemy.Face, Kind = KillKind.Overkill });

                // Conscription (§8): an overkill still recruits — one value down.
                // Never at gates (banished outright) and never a royal (§6).
                if (State.HasRelic("conscription") && !State.Encounter.IsGate &&
                    !CardRules.IsRoyal(enemy.Rank) && !State.OwnsFace(enemy.Face))
                {
                    events.Add(new RelicUsed { RelicId = "conscription", Note = "the overkill is pressed into service anyway" });
                    RecruitEnemy(enemy, true, events);
                }

                AdvancePastDead(events);
            }
            else
            {
                ResolveCounterattack(events);
            }
        }

        /// <summary>
        /// Mint a defeated enemy into the deck (§6), running the Hat-relic pipeline:
        /// Conscription's −1 token → Press-gang home-suit rewrite → Plunder's
        /// same-suit upgrade → Battlefield Promotion's +1 rank → destination
        /// (hand > Tavern top > shuffled in) → Apprentice draw → Rallying Cry return.
        /// </summary>
        private void RecruitEnemy(EnemyState enemy, bool overkilled, List<GameEvent> events)
        {
            var card = State.Cards.Mint(enemy.Suit, enemy.Rank);
            State.OwnedCards.Add(card.PhysicalId);
            string source = $"recruited (ch{State.Chapter})";

            if (overkilled)
                card.ValueModifier = -1; // Conscription's value token (§8) — not a graft

            if (State.HasRelic("press_gang"))
            {
                var home = ClassTables.Classes[State.Hero.ClassId].HomeSuit;
                if (card.EffectiveFace().Suit != home)
                {
                    card.Grafts.Add(new GraftRecord(State.Cards.NextGraftSeq(), GraftKind.Suit, default, home,
                        "press_gang " + source));
                    events.Add(new RelicUsed { RelicId = "press_gang", Note = $"recruit rewritten to {PhysicalCard.SuitGlyph(home)}" });
                }
            }

            if (State.HasRelic("plunder"))
            {
                // PLACEHOLDER interpretation of "swap the recruit for a stronger
                // same-suit card in your discard": the recruit enters at the rank of
                // the strongest same-suit discard, if higher. Tune later.
                var suit = card.EffectiveFace().Suit;
                int bestRank = 0;
                foreach (int id in State.Deck.Discard)
                {
                    var f = State.Cards.Get(id).EffectiveFace();
                    if (f.Suit == suit && (int)f.Rank <= Tuning.GraftRankCap && (int)f.Rank > bestRank)
                        bestRank = (int)f.Rank;
                }
                if (bestRank > (int)card.EffectiveFace().Rank)
                {
                    card.Grafts.Add(new GraftRecord(State.Cards.NextGraftSeq(), GraftKind.Rank, (Rank)bestRank, default,
                        "plunder " + source));
                    events.Add(new RelicUsed { RelicId = "plunder", Note = $"recruit swapped up to rank {bestRank}" });
                }
            }

            if (State.HasRelic("battlefield_promotion") && State.Encounter != null &&
                !State.Encounter.UsedThisFight.Contains("battlefield_promotion"))
            {
                State.Encounter.UsedThisFight.Add("battlefield_promotion");
                int r = (int)card.EffectiveFace().Rank + 1;
                if (r <= Tuning.GraftRankCap)
                {
                    card.Grafts.Add(new GraftRecord(State.Cards.NextGraftSeq(), GraftKind.Rank, (Rank)r, default,
                        "battlefield_promotion " + source));
                    events.Add(new RelicUsed { RelicId = "battlefield_promotion", Note = $"first recruit promoted to rank {r}" });
                }
            }

            bool toHand = (State.Hero.PathC2 == ClassTables.RungConscript ||
                           State.Hero.StaffId == "field_promotion") &&
                          State.Deck.Hand.Count < State.MaxHandSize;
            if (toHand)
                State.Deck.Hand.Add(card.PhysicalId);
            else if (State.HasRelic("black_standard"))
                State.Deck.Tavern.Insert(0, card.PhysicalId); // your next draw (§8)
            else
                State.Deck.Tavern.Insert(_rng.Int(State.Deck.Tavern.Count + 1), card.PhysicalId);
            events.Add(new Recruited { PhysicalId = card.PhysicalId, Face = card.Printed, ToHand = toHand });

            if (State.HasRelic("apprentice"))
            {
                var drawn = Draw(1); // simple variant sanctioned by §8: on recruit, draw 1
                if (drawn.PhysicalIds.Count > 0)
                {
                    events.Add(new RelicUsed { RelicId = "apprentice", Note = "the recruit earns a draw" });
                    events.Add(drawn);
                }
            }

            if (State.HasRelic("rallying_cry") && State.Deck.Discard.Count > 0)
            {
                int pick = State.Deck.Discard[_rng.Int(State.Deck.Discard.Count)];
                State.Deck.Discard.Remove(pick);
                State.Deck.Tavern.Add(pick);
                events.Add(new RelicUsed { RelicId = "rallying_cry", Note = $"card #{pick} rallies back to the Tavern" });
            }
        }

        private void ResolveCounterattack(List<GameEvent> events)
        {
            var enc = State.Encounter;
            var enemy = enc.Current;

            if (enc.SecondWindArmed)
            {
                // Second Wind (§8): an extra turn before the enemy counterattacks.
                enc.SecondWindArmed = false;
                events.Add(new RelicUsed { RelicId = "second_wind", Note = "extra turn — the counterattack never comes" });
                CheckTurnStart(events);
                return;
            }
            if (enc.VanguardArmed)
            {
                // Vanguard (§8): the road's first enemy can't counter on its first turn.
                enc.VanguardArmed = false;
                events.Add(new RelicUsed { RelicId = "vanguard", Note = "the first counterattack never lands" });
                CheckTurnStart(events);
                return;
            }

            int net = System.Math.Max(0, enemy.Attack - enemy.Shield);
            if (net > 0 && enc.AegisArmed)
            {
                enc.AegisArmed = false;
                net = System.Math.Max(0, net - Tuning.AegisReduction);
                events.Add(new RelicUsed { RelicId = "aegis", Note = $"counterattack blunted by {Tuning.AegisReduction}" });
            }

            if (net == 0)
            {
                events.Add(new CounterattackBlocked());
                CheckTurnStart(events);
                return; // turn ends; play again next turn
            }

            if (State.Encounter.RallyArmed)
            {
                // Rally (♦ Half, §7): draw min(net, 5) BEFORE paying — checked before
                // the death test on purpose; a Rally can be the thing that saves you.
                State.Encounter.RallyArmed = false;
                var drawn = Draw(System.Math.Min(net, Tuning.RallyDrawCap));
                if (drawn.PhysicalIds.Count > 0) events.Add(drawn);
            }

            // An overdraw pick still owed means the hand isn't final — the picked card
            // pays too, so the death test waits (HandleChooseOverdraw re-runs it).
            bool pickOwed = State.PendingChoices.Any(p => p.Kind == PendingChoiceKind.OverdrawPick);
            if (!pickOwed && State.HandTotalValue() < net)
            {
                events.Add(new PlayerDied { Unpayable = net });
                State.Hero.Alive = false;
                State.Phase = CampaignPhase.CampaignLost;
                return;
            }

            State.PendingChoices.Add(new PendingChoice { Kind = PendingChoiceKind.Defend, RequiredValue = net });
            events.Add(new CounterattackIncoming { NetAttack = net });
        }

        private void AdvancePastDead(List<GameEvent> events)
        {
            var enc = State.Encounter;
            var slain = enc.Current; // the enemy whose death brought us here (null-safe below)
            while (enc.CurrentIndex < enc.Enemies.Count && !enc.Enemies[enc.CurrentIndex].Alive)
                enc.CurrentIndex++;

            // Bastion rung (§10): on enemy death, if shield outgrew its attack, the next
            // enemy starts with shield = min(♠ cards played vs the slain one, the excess).
            if (!enc.AllDead && slain != null && !slain.Alive &&
                State.Hero.PathC2 == ClassTables.RungBastion && slain.Shield > slain.Attack)
            {
                int carry = System.Math.Min(slain.SpadeCardsPlayed, slain.Shield - slain.Attack);
                if (carry > 0)
                {
                    enc.Current.Shield += carry;
                    events.Add(new ShieldGained { Amount = carry, Total = enc.Current.Shield });
                }
            }

            if (enc.AllDead)
            {
                State.LastFightPaidNothing = !enc.PaidThisFight; // Interest (§8)

                if (enc.IsGate)
                {
                    ResolveGateClear(events);
                    return;
                }

                events.Add(new EncounterWon());
                State.Encounter = null;

                // Agnostic fragment economy: 50% drop after each won encounter (§7).
                if (_rng.NextDouble() < Tuning.FragmentDropChance)
                {
                    State.TokenFragments++;
                    events.Add(new FragmentDropped { Total = State.TokenFragments });
                }

                int? nodeId = State.EncounterNodeId;
                State.EncounterNodeId = null;
                var node = nodeId != null && State.Map != null ? State.Map.Get(nodeId.Value) : null;
                if (node != null && node.Kind == RoadNodeKind.Boss)
                {
                    // Province cleared → recap with the automatic seam reset (§9).
                    State.Phase = CampaignPhase.ChapterComplete;
                    SeamRest(events);
                    events.Add(new ChapterCompleted { Chapter = State.Chapter });
                }
                else if (node != null && node.Kind == RoadNodeKind.Lair)
                {
                    // The raid pays off (§8): pick 1 of 2 unowned relics.
                    State.Phase = CampaignPhase.Road;
                    OfferLairRelics(events);
                }
                else
                {
                    State.Phase = CampaignPhase.Road;
                }
            }
            else
            {
                // A fresh duel: once-per-enemy abilities refresh; unspent per-enemy
                // arms (Transfuse, Stockpile, Aegis, Unbinding) lapse with their enemy.
                enc.UsedThisEnemy.Clear();
                enc.StockpileArmed = false;
                enc.TransfuseArmed = false;
                enc.AegisArmed = false;
                enc.UnbindingArmed = false;
                events.Add(new NextEnemy { Face = enc.Current.Face });
                CheckTurnStart(events); // play-again-after-a-kill is a fresh turn
            }
        }

        /// <summary>Offer 1-of-2 unowned relics after a Lair raid (§8). Seeded, blocking.</summary>
        private void OfferLairRelics(List<GameEvent> events)
        {
            var owned = new HashSet<string>(State.RelicBag);
            foreach (var e in State.EquippedRelics) if (e != null) owned.Add(e);

            // forked_road is shelved while maps generate fully revealed — its whole
            // effect was lifting fog. Reinstate (or rework) if fog returns.
            var pool = RelicTables.All.Select(r => r.Id)
                .Where(id => !owned.Contains(id) && id != "forked_road").ToList();
            var options = new List<string>();
            for (int i = 0; i < Tuning.LairOffers && pool.Count > 0; i++)
            {
                string pick = pool[_rng.Int(pool.Count)];
                pool.Remove(pick);
                options.Add(pick);
            }
            if (options.Count == 0) return; // every relic owned — nothing left to raid

            State.PendingChoices.Add(new PendingChoice
            {
                Kind = PendingChoiceKind.RelicSelect,
                RelicOptions = options,
            });
            events.Add(new RelicOffered { Options = new List<string>(options) });
        }

        /// <summary>Seam reset (§9): reshuffle discard into the Tavern, draw up to full.</summary>
        private void SeamRest(List<GameEvent> events)
        {
            State.Deck.Tavern.AddRange(State.Deck.Discard);
            State.Deck.Discard.Clear();
            _rng.Shuffle(State.Deck.Tavern);
            events.Add(new SeamRestApplied());
            DealHand(events);
        }

        // ── royal gates: the 3/2/1 keep pyramid (§4, §6) ────────────────────────

        /// <summary>How many royals a gate lets you keep (Jack 3 · Queen 2 · King 1).</summary>
        public static int KeepTarget(Rank rank) => rank switch
        {
            Rank.Jack => 3,
            Rank.Queen => 2,
            _ => 1,
        };

        /// <summary>
        /// The gate's last royal is down: award the win, then resolve the keep pyramid.
        /// Only exact-killed royals are eligible — overkills were banished (§6). If no
        /// picks are needed (eligible ≤ keep target), keeps auto-resolve; otherwise a
        /// RoyalKeep choice blocks until answered.
        /// </summary>
        private void ResolveGateClear(List<GameEvent> events)
        {
            var enc = State.Encounter;
            Rank rank = enc.GateRank;

            events.Add(new EncounterWon());
            State.Encounter = null;
            State.EncounterNodeId = null;

            if (_rng.NextDouble() < Tuning.FragmentDropChance)
            {
                State.TokenFragments++;
                events.Add(new FragmentDropped { Total = State.TokenFragments });
            }

            var eligible = enc.Enemies
                .Where(e => e.KillOutcome == KillKind.Exact)
                .Select(e => e.Suit)
                .ToList();
            int target = KeepTarget(rank);

            if (eligible.Count <= target)
            {
                // Nothing to choose — every eligible royal follows you.
                CardFace? crown = null;
                foreach (var suit in eligible)
                {
                    var kept = KeepRoyal(suit, rank, events);
                    if (rank == Rank.King) crown = kept.Printed;
                }
                FinishGate(rank, crown, events);
                return;
            }

            bool pickIsLeave = rank == Rank.Jack; // keep 3 of 4 = name the one left behind
            State.PendingChoices.Add(new PendingChoice
            {
                Kind = PendingChoiceKind.RoyalKeep,
                RoyalRank = rank,
                Eligible = eligible,
                PicksRemaining = pickIsLeave ? eligible.Count - target : target,
                PickIsLeave = pickIsLeave,
            });
            State.Phase = CampaignPhase.Road;
            events.Add(new RoyalKeepOffered
            {
                Rank = rank,
                Eligible = new List<Suit>(eligible),
                KeepCount = target,
                PickIsLeave = pickIsLeave,
            });
        }

        private Result HandleChooseRoyal(ChooseRoyal a)
        {
            var pending = State.PendingChoice;
            if (pending == null || pending.Kind != PendingChoiceKind.RoyalKeep)
                return Result.Fail("No royal keep pending");
            if (!pending.Eligible.Contains(a.Suit))
                return Result.Fail($"{PhysicalCard.Pretty(new CardFace(a.Suit, pending.RoyalRank))} is not on offer");

            // ── validated; mutate ──
            var events = new List<GameEvent>();
            Rank rank = pending.RoyalRank;
            CardFace? crown = null;

            pending.Eligible.Remove(a.Suit);
            pending.PicksRemaining--;

            if (pending.PickIsLeave)
            {
                events.Add(new RoyalLeft { Face = new CardFace(a.Suit, rank) });
            }
            else
            {
                var kept = KeepRoyal(a.Suit, rank, events);
                if (rank == Rank.King) crown = kept.Printed;
            }

            if (pending.PicksRemaining > 0)
                return Result.Success(events); // sequential picks (the Queen Gate's two)

            // Picks exhausted: what remains resolves the opposite way.
            foreach (var suit in pending.Eligible)
            {
                if (pending.PickIsLeave)
                {
                    var kept = KeepRoyal(suit, rank, events);
                    if (rank == Rank.King) crown = kept.Printed;
                }
                else
                {
                    events.Add(new RoyalLeft { Face = new CardFace(suit, rank) });
                }
            }
            State.PendingChoices.RemoveAt(0);
            FinishGate(rank, crown, events);
            return Result.Success(events);
        }

        /// <summary>
        /// Mint a kept royal as a real PhysicalCard, shuffled into the Tavern (§6) —
        /// or onto the Tavern top under the Muster relic (§8).
        /// </summary>
        private PhysicalCard KeepRoyal(Suit suit, Rank rank, List<GameEvent> events)
        {
            var card = State.Cards.Mint(suit, rank);
            State.OwnedCards.Add(card.PhysicalId);
            if (State.HasRelic("muster"))
                State.Deck.Tavern.Insert(0, card.PhysicalId);
            else
                State.Deck.Tavern.Insert(_rng.Int(State.Deck.Tavern.Count + 1), card.PhysicalId);
            events.Add(new RoyalKept { PhysicalId = card.PhysicalId, Face = card.Printed });
            return card;
        }

        /// <summary>
        /// A gate's keeps are settled: the King Gate crowns the run (§4 victory);
        /// the Jack/Queen Gates end their chapter like any province boss (§9 seam).
        /// </summary>
        private void FinishGate(Rank rank, CardFace? crown, List<GameEvent> events)
        {
            if (rank == Rank.King)
            {
                State.Phase = CampaignPhase.CampaignWon;
                events.Add(new CampaignWonEvent { Crown = crown });
                return;
            }

            State.Phase = CampaignPhase.ChapterComplete;
            SeamRest(events);
            events.Add(new ChapterCompleted { Chapter = State.Chapter });
        }

        // ── road navigation & run flow (§4, §12) ────────────────────────────────

        private Result HandleMoveToNode(MoveToNode a)
        {
            if (State.Phase != CampaignPhase.Road) return Result.Fail("Not on the road");
            if (State.PendingChoice != null)
                return Result.Fail($"Resolve the pending {State.PendingChoice.Kind} first");
            if (State.Map == null) return Result.Fail("No road map");
            if (!State.Map.Current.Next.Contains(a.NodeId))
                return Result.Fail($"Node {a.NodeId} is not reachable from here (one-way road)");

            var node = State.Map.Get(a.NodeId);

            // ── validated; mutate ──
            var events = new List<GameEvent>();
            State.StaffOffer = null;   // walking away from a Fallen Heroes stop closes its offer (§10)
            State.CaravanOffer = null; // likewise the caravan's stall (§8)
            State.SanctumCharge = false; // and the sanctum's single rearrange (§9)
            State.Map.CurrentNodeId = node.Id;
            node.Visited = true; // maps generate fully Known now — no fog to lift
            events.Add(new MovedToNode { NodeId = node.Id, Kind = node.Kind });

            switch (node.Kind)
            {
                case RoadNodeKind.Skirmish:
                case RoadNodeKind.Veteran:
                case RoadNodeKind.Elite:
                case RoadNodeKind.Recruit:
                case RoadNodeKind.Boss:
                    BeginEncounter(Lineups.For(node.Kind, State.Chapter, State, _rng), node.Id, events);
                    break;

                case RoadNodeKind.Gate:
                    // The province's royal gate: four sequential royal duels (§4, §6).
                    BeginEncounter(Lineups.For(node.Kind, State.Chapter, State, _rng), node.Id, events,
                                   Lineups.RoyalRank(State.Chapter));
                    break;

                case RoadNodeKind.Lair:
                    // The Lair is a raid (§8): an elite-grade fight, then pick 1 of 2 relics.
                    BeginEncounter(Lineups.For(RoadNodeKind.Elite, State.Chapter, State, _rng), node.Id, events);
                    break;

                case RoadNodeKind.Caravan:
                {
                    // The caravan (§8): one unowned relic, pay-from-hand while standing here.
                    var owned = new HashSet<string>(State.RelicBag);
                    foreach (var e in State.EquippedRelics) if (e != null) owned.Add(e);
                    var pool = RelicTables.All.Select(rl => rl.Id)
                        .Where(id => !owned.Contains(id) && id != "forked_road").ToList(); // shelved with the fog
                    if (pool.Count == 0)
                    {
                        events.Add(new LandmarkVisited { Kind = node.Kind, Note = "the caravan has nothing you lack" });
                        break;
                    }
                    State.CaravanOffer = pool[_rng.Int(pool.Count)];
                    events.Add(new CaravanOffered { RelicId = State.CaravanOffer, Cost = CaravanPrice() });
                    break;
                }

                case RoadNodeKind.Camp:
                    ResolveCamp(events);
                    break;

                case RoadNodeKind.Hunt:
                    var options = Lineups.MissingFaces(State.Chapter, State);
                    if (options.Count == 0)
                    {
                        events.Add(new LandmarkVisited { Kind = node.Kind, Note = "no recruits missing — nothing to hunt" });
                        break;
                    }
                    State.PendingChoices.Add(new PendingChoice
                    {
                        Kind = PendingChoiceKind.HuntSelect,
                        HuntOptions = options,
                    });
                    events.Add(new HuntOffered { Options = options });
                    break;

                case RoadNodeKind.Forge:
                    // The forge menu always opens (§7); ForgeConvert works while standing here.
                    events.Add(new LandmarkVisited
                    {
                        Kind = node.Kind,
                        Note = $"the forge is lit — {State.TokenFragments} fragment(s), {State.TokenHalves} half(s) banked",
                    });
                    break;

                case RoadNodeKind.Sanctum:
                    // The Sanctum (§9): one graft-rearrange while standing here.
                    State.SanctumCharge = true;
                    events.Add(new LandmarkVisited { Kind = node.Kind, Note = "the sanctum hums — one graft may be moved" });
                    break;

                case RoadNodeKind.Shrine:
                    // PLACEHOLDER (§12 names the Shrine but the spec never defines it):
                    // a small offering — +1 fragment. Replace when the design lands.
                    State.TokenFragments++;
                    events.Add(new ShrineBlessing { Fragments = State.TokenFragments });
                    break;

                case RoadNodeKind.Heroes:
                    // Fallen Heroes (§10): one random Staff from each of the four classes
                    // (own class included). Free and repeatable while standing here.
                    State.StaffOffer = ClassTables.ClassOrder
                        .Select(id => _rng.Pick(ClassTables.Classes[id].StaffIds))
                        .ToList();
                    events.Add(new StaffSwapOffered { Offer = new List<string>(State.StaffOffer) });
                    break;

                default:
                    // Forge/Lair/Caravan/Sanctum/Shrine/Event land in steps 7–9.
                    events.Add(new LandmarkVisited { Kind = node.Kind, Note = "nothing here yet (later build step)" });
                    break;
            }

            return Result.Success(events);
        }

        /// <summary>Camp (§9): a 4-part bundle — reshuffle, refill, and two armed fight bonuses.</summary>
        private void ResolveCamp(List<GameEvent> events)
        {
            State.Deck.Tavern.AddRange(State.Deck.Discard);
            State.Deck.Discard.Clear();
            _rng.Shuffle(State.Deck.Tavern);
            DealHand(events);
            State.NextFightFirstAttackDouble = true;
            State.NextFightStartShield = Tuning.CampStartShield;
            events.Add(new CampRested());
        }

        private Result HandleChooseHunt(ChooseHunt a)
        {
            var pending = State.PendingChoice;
            if (pending == null || pending.Kind != PendingChoiceKind.HuntSelect)
                return Result.Fail("No hunt pending");
            if (!pending.HuntOptions.Any(f => f.Suit == a.Suit && f.Rank == a.Rank))
                return Result.Fail($"{PhysicalCard.Pretty(new CardFace(a.Suit, a.Rank))} is not a legal quarry");

            // ── validated; mutate ──
            State.PendingChoices.RemoveAt(0);
            var events = new List<GameEvent>();
            BeginEncounter(Lineups.Hunted(a.Suit, a.Rank), State.Map.CurrentNodeId, events);
            return Result.Success(events);
        }

        private Result HandleContinueRun()
        {
            if (State.Phase != CampaignPhase.ChapterComplete)
                return Result.Fail("Nothing to continue from");
            if (State.PendingChoice != null)
                return Result.Fail($"Resolve the pending {State.PendingChoice.Kind} first");
            if (State.Chapter >= Tuning.FinalChapter)
                return Result.Fail("The crown ends the run — nothing lies beyond the King Gate in this build");

            // ── validated; mutate ──
            var events = new List<GameEvent>();
            State.Chapter++;
            State.Continent = State.Chapter <= Tuning.ChaptersPerContinent ? 1 : 2;
            State.Province = (State.Chapter - 1) % Tuning.ChaptersPerContinent + 1;
            events.Add(new RunAdvanced { Chapter = State.Chapter, Continent = State.Continent, Province = State.Province });

            if (State.Chapter == Tuning.ChaptersPerContinent + 1)
            {
                // Entering C2 lights the class's home-suit path rung (§4, §10).
                // (Depot's +2 hand flows from the MaxHandSize derivation.)
                State.Hero.PathC2 = ClassTables.HomeRungId(State.Hero.ClassId);
                events.Add(new ContinentEntered { Continent = 2, LitRungId = State.Hero.PathC2 });
            }

            State.UsedThisProvince.Clear(); // Forced March / Bedroll / Requisition Writ refresh (§8)
            State.RoadFirstFightDone = false; // a fresh road re-arms Vanguard (§8)
            State.Map = RoadGen.Generate(State.Chapter, _rng);
            events.Add(new MapGenerated { Chapter = State.Chapter, NodeCount = State.Map.Nodes.Count });
            State.Phase = CampaignPhase.Road;
            return Result.Success(events);
        }

        // ── pending choices ─────────────────────────────────────────────────────

        private Result HandleDefendDiscard(DefendDiscard a)
        {
            var pending = State.PendingChoice;
            if (pending == null ||
                (pending.Kind != PendingChoiceKind.Defend && pending.Kind != PendingChoiceKind.DebtDiscard))
                return Result.Fail("No discard owed");

            var ids = a.PhysicalIds ?? new List<int>();
            if (ids.Distinct().Count() != ids.Count) return Result.Fail("Duplicate card in defend");
            foreach (int id in ids)
                if (!State.Deck.Hand.Contains(id)) return Result.Fail($"Card #{id} is not in hand");

            if (pending.Kind == PendingChoiceKind.DebtDiscard)
            {
                if (ids.Count != 1) return Result.Fail("The debt instalment is exactly one card");

                // ── validated; mutate ── (no turn-start recheck: this IS the turn's start)
                State.Deck.Hand.Remove(ids[0]);
                State.Deck.Discard.Add(ids[0]);
                State.PendingChoices.RemoveAt(0);
                return Result.Success(new List<GameEvent>
                {
                    new RelicUsed { RelicId = "debt", Note = $"instalment paid (card #{ids[0]})" },
                });
            }

            int paid = ids.Sum(id => State.Cards.Get(id).EffectiveValue());
            if (paid < pending.RequiredValue)
                return Result.Fail($"Selected {paid}, need {pending.RequiredValue}");

            // ── validated; mutate ──
            foreach (int id in ids) State.Deck.Hand.Remove(id);
            State.Deck.Discard.AddRange(ids);
            State.PendingChoices.RemoveAt(0);
            if (State.Encounter != null) State.Encounter.PaidThisFight = true; // Interest (§8)

            var events = new List<GameEvent>
            {
                new Defended { Paid = paid, Required = pending.RequiredValue },
            };

            // Renewal rung (§10): paying a counter with 3+ cards recovers 1 — the
            // highest-value discard returns to the Tavern bottom.
            if (State.Hero.PathC2 == ClassTables.RungRenewal &&
                ids.Count >= Tuning.RenewalMinPayCards && State.Deck.Discard.Count > 0)
            {
                int best = State.Deck.Discard
                    .OrderByDescending(id => State.Cards.Get(id).EffectiveValue())
                    .First();
                State.Deck.Discard.Remove(best);
                State.Deck.Tavern.Add(best);
                events.Add(new CardsRecovered { Count = 1 });
            }

            CheckTurnStart(events); // a fresh turn begins once the counter is paid
            return Result.Success(events);
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
            State.PendingChoices.RemoveAt(0);

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

        // ── staffs (§10) ────────────────────────────────────────────────────────

        /// <summary>
        /// Would ActivateStaff succeed right now? Read-only twin of the handler's
        /// guards (the UI drives disabled states from this — §16 truthful buttons).
        /// Target validity included when a target id is supplied.
        /// </summary>
        public string CanActivateStaff(int targetPhysicalId = 0)
        {
            if (State.Phase != CampaignPhase.Encounter || State.Encounter?.Current == null)
                return "Staffs activate in combat";

            string staff = State.Hero.StaffId;
            var enc = State.Encounter;
            var pending = State.PendingChoice;
            if (pending != null && !(pending.Kind == PendingChoiceKind.Defend && staff == "parry"))
                return $"Resolve the pending {pending.Kind} first";
            if (staff == "parry" && pending == null)
                return "Parry works during the pay step — no counterattack to parry";

            PhysicalCard Target() =>
                targetPhysicalId != 0 && State.Deck.Hand.Contains(targetPhysicalId)
                    ? State.Cards.Get(targetPhysicalId) : null;

            switch (staff)
            {
                case "hold_the_line":
                    if (enc.UsedThisEnemy.Contains(staff)) return "Hold the Line already used vs this enemy";
                    if (!State.Deck.Discard.Any(id => State.Cards.Get(id).FiresSuit(Suit.Spades)))
                        return "No ♠ in the discard to hold with";
                    return null;
                case "footwork":
                {
                    var t = Target();
                    if (t == null) return "Footwork needs a hand card target";
                    return t.FiresSuit(Suit.Spades) ? null : "Footwork buries a ♠";
                }
                case "parry":
                {
                    var t = Target();
                    if (t == null) return "Parry needs a hand card target";
                    return t.FiresSuit(Suit.Spades) ? null : "Parry spends a ♠";
                }
                case "steady_hand":
                case "ace_in_the_hole":
                    return null;
                case "bloodletting":
                    return Target() == null ? "Bloodletting needs a hand card target" : null;
                case "provisioner":
                    return Target() == null ? "Provisioner needs a hand card target" : null;
                case "stockpile":
                    return enc.UsedThisEnemy.Contains(staff) ? "Stockpile already used vs this enemy" : null;
                case "transfuse":
                    return enc.UsedThisEnemy.Contains(staff) ? "Transfuse already used vs this enemy" : null;
                default:
                    return $"{staff} is passive — it works on its own";
            }
        }

        private Result HandleActivateStaff(ActivateStaff a)
        {
            // The public query IS the guard — buttons and dispatch agree by construction.
            string blockedWhy = CanActivateStaff(a.TargetPhysicalId);
            if (blockedWhy != null) return Result.Fail(blockedWhy);

            if (State.Phase != CampaignPhase.Encounter || State.Encounter?.Current == null)
                return Result.Fail("Staffs activate in combat");

            string staff = State.Hero.StaffId;
            var enc = State.Encounter;
            var enemy = enc.Current;
            var pending = State.PendingChoice;

            // Parry is the one staff whose moment IS the pay step.
            if (pending != null && !(pending.Kind == PendingChoiceKind.Defend && staff == "parry"))
                return Result.Fail($"Resolve the pending {pending.Kind} first");
            if (staff == "parry" && pending == null)
                return Result.Fail("Parry works during the pay step — no counterattack to parry");

            PhysicalCard Target()
            {
                if (a.TargetPhysicalId == 0 || !State.Deck.Hand.Contains(a.TargetPhysicalId)) return null;
                return State.Cards.Get(a.TargetPhysicalId);
            }
            List<GameEvent> One(GameEvent e) => new List<GameEvent> { e };
            Result Trigger(string note, params GameEvent[] extra)
            {
                var evs = One(new StaffTriggered { StaffId = staff, Note = note });
                evs.AddRange(extra);
                return Result.Success(evs);
            }

            switch (staff)
            {
                case "hold_the_line": // once/enemy: highest ♠ in discard adds to shield; stays there
                {
                    if (enc.UsedThisEnemy.Contains(staff)) return Result.Fail("Hold the Line already used vs this enemy");
                    var spades = State.Deck.Discard.Where(id => State.Cards.Get(id).FiresSuit(Suit.Spades)).ToList();
                    if (spades.Count == 0) return Result.Fail("No ♠ in the discard to hold with");
                    int best = spades.OrderByDescending(id => State.Cards.Get(id).EffectiveValue()).First();
                    int v = State.Cards.Get(best).EffectiveValue();
                    enc.UsedThisEnemy.Add(staff);
                    enemy.Shield += v;
                    return Trigger($"braced behind the {State.Cards.Get(best)}",
                        new ShieldGained { Amount = v, Total = enemy.Shield });
                }

                case "footwork": // bury a hand ♠ to the Tavern bottom, draw 1
                {
                    var card = Target();
                    if (card == null) return Result.Fail("Footwork needs a hand card target");
                    if (!card.FiresSuit(Suit.Spades)) return Result.Fail("Footwork buries a ♠");
                    State.Deck.Hand.Remove(card.PhysicalId);
                    State.Deck.Tavern.Add(card.PhysicalId);
                    var drawn = new CardsDrawn();
                    if (State.Deck.Tavern.Count > 0)
                    {
                        int id = State.Deck.Tavern[0];
                        State.Deck.Tavern.RemoveAt(0);
                        State.Deck.Hand.Add(id);
                        drawn.PhysicalIds.Add(id);
                    }
                    return Trigger($"buried #{card.PhysicalId}, drew {drawn.PhysicalIds.Count}", drawn);
                }

                case "parry": // pay step: spend a hand ♠ — shield up, payment owed down
                {
                    var card = Target();
                    if (card == null) return Result.Fail("Parry needs a hand card target");
                    if (!card.FiresSuit(Suit.Spades)) return Result.Fail("Parry spends a ♠");
                    int v = card.EffectiveValue();
                    State.Deck.Hand.Remove(card.PhysicalId);
                    State.Deck.Discard.Add(card.PhysicalId);
                    enemy.Shield += v;
                    pending.RequiredValue -= v;
                    enc.PaidThisFight = true; // a parry is still a payment (Interest, §8)
                    var extra = new List<GameEvent> { new ShieldGained { Amount = v, Total = enemy.Shield } };
                    if (pending.RequiredValue <= 0)
                    {
                        State.PendingChoices.RemoveAt(0);
                        extra.Add(new Defended { Paid = 0, Required = 0 });
                        return Trigger("counterattack fully parried", extra.ToArray());
                    }
                    return Trigger($"parried {v} — {pending.RequiredValue} still owed", extra.ToArray());
                }

                case "steady_hand": // toggle: the next play skips the ♣ double
                    enc.SteadyHandArmed = !enc.SteadyHandArmed;
                    return Trigger(enc.SteadyHandArmed ? "armed — next play deals single damage" : "disarmed");

                case "bloodletting": // discard a card, bank ⌊value/2⌋ onto the next attack
                {
                    var card = Target();
                    if (card == null) return Result.Fail("Bloodletting needs a hand card target");
                    State.Deck.Hand.Remove(card.PhysicalId);
                    State.Deck.Discard.Add(card.PhysicalId);
                    enc.AttackBank += card.EffectiveValue() / 2;
                    return Trigger($"bled #{card.PhysicalId} — +{card.EffectiveValue() / 2} banked (total {enc.AttackBank})");
                }

                case "ace_in_the_hole": // toggle: next Ace pair plays the Ace at partner value
                    enc.AceInHoleArmed = !enc.AceInHoleArmed;
                    return Trigger(enc.AceInHoleArmed ? "armed for the next Ace pair" : "disarmed");

                case "stockpile": // once/enemy: hand may exceed the cap by 1
                    if (enc.UsedThisEnemy.Contains(staff)) return Result.Fail("Stockpile already used vs this enemy");
                    enc.UsedThisEnemy.Add(staff);
                    enc.StockpileArmed = true;
                    return Trigger($"hand cap raised to {State.MaxHandSize} vs this enemy");

                case "provisioner": // discard 1, then draw 1
                {
                    var card = Target();
                    if (card == null) return Result.Fail("Provisioner needs a hand card target");
                    State.Deck.Hand.Remove(card.PhysicalId);
                    State.Deck.Discard.Add(card.PhysicalId);
                    var drawn = new CardsDrawn();
                    if (State.Deck.Tavern.Count > 0)
                    {
                        int id = State.Deck.Tavern[0];
                        State.Deck.Tavern.RemoveAt(0);
                        State.Deck.Hand.Add(id);
                        drawn.PhysicalIds.Add(id);
                    }
                    return Trigger($"cycled #{card.PhysicalId}", drawn);
                }

                case "transfuse": // once/enemy: next ♥ play converts recovery to shield
                    if (enc.UsedThisEnemy.Contains(staff)) return Result.Fail("Transfuse already used vs this enemy");
                    enc.UsedThisEnemy.Add(staff);
                    enc.TransfuseArmed = true;
                    return Trigger("armed — the next ♥ play shields instead of recovering");

                default:
                    return Result.Fail($"{staff} is passive — it works on its own");
            }
        }

        private Result HandleSwapStaff(SwapStaff a)
        {
            if (State.StaffOffer == null)
                return Result.Fail("No Staff offer here — Fallen Heroes only");
            if (a.StaffId != State.Hero.StaffId && !State.StaffOffer.Contains(a.StaffId))
                return Result.Fail($"'{a.StaffId}' is not on offer");

            // ── validated; mutate ──
            string from = State.Hero.StaffId;
            State.Hero.StaffId = a.StaffId;
            return Result.Success(new List<GameEvent> { new StaffSwapped { From = from, To = a.StaffId } });
        }

        private Result HandleChooseRecover(ChooseRecover a)
        {
            var pending = State.PendingChoice;
            if (pending == null ||
                (pending.Kind != PendingChoiceKind.RecoverSelect && pending.Kind != PendingChoiceKind.RecoverToHand))
                return Result.Fail("No recover choice pending");

            var ids = a.PhysicalIds ?? new List<int>();
            if (ids.Distinct().Count() != ids.Count) return Result.Fail("Duplicate card in pick");
            foreach (int id in ids)
                if (!pending.RecoverIds.Contains(id)) return Result.Fail($"Card #{id} is not on offer");

            if (pending.Kind == PendingChoiceKind.RecoverSelect)
            {
                if (ids.Count > pending.RecoverMax)
                    return Result.Fail($"Pick at most {pending.RecoverMax} card(s)");

                // ── validated; mutate ── Triage: chosen discards go to the Tavern bottom.
                foreach (int id in ids)
                {
                    State.Deck.Discard.Remove(id);
                    State.Deck.Tavern.Add(id);
                }
                State.PendingChoices.RemoveAt(0);
                return Result.Success(new List<GameEvent> { new CardsRecovered { Count = ids.Count } });
            }

            // RecoverToHand (Last Rites): at most one, from Tavern into hand.
            if (ids.Count > 1) return Result.Fail("Pick at most one card");
            if (ids.Count == 1 && State.Deck.Hand.Count >= State.MaxHandSize)
                return Result.Fail("Hand is full");

            // ── validated; mutate ──
            State.PendingChoices.RemoveAt(0);
            var events = new List<GameEvent>();
            if (ids.Count == 1)
            {
                State.Deck.Tavern.Remove(ids[0]);
                State.Deck.Hand.Add(ids[0]);
                events.Add(new RecoveredToHand { PhysicalId = ids[0] });
            }
            return Result.Success(events);
        }

        // ── sanctum (§9) ────────────────────────────────────────────────────────

        private Result HandleRearrangeGraft(RearrangeGraft a)
        {
            if (!State.SanctumCharge)
                return Result.Fail("Graft-rearrange works at a Sanctum (once per visit)");
            if (State.PendingChoice != null)
                return Result.Fail($"Resolve the pending {State.PendingChoice.Kind} first");
            if (!State.OwnedCards.Contains(a.FromPhysicalId) || !State.OwnedCards.Contains(a.ToPhysicalId))
                return Result.Fail("Both cards must be owned");
            if (a.FromPhysicalId == a.ToPhysicalId)
                return Result.Fail("Pick two different cards");

            var from = State.Cards.Get(a.FromPhysicalId);
            var to = State.Cards.Get(a.ToPhysicalId);
            var graft = from.Grafts.FirstOrDefault(g => g.Seq == a.GraftSeq);
            if (graft == null)
                return Result.Fail($"Card #{a.FromPhysicalId} has no graft with seq {a.GraftSeq}");
            if (graft.Kind == GraftKind.SuitAdd && to.FiresSuit(graft.ToSuit))
                return Result.Fail($"#{to.PhysicalId} already fires {PhysicalCard.SuitGlyph(graft.ToSuit)} — a no-op move");

            // ── validated; mutate ── The graft re-applies LAST on its new card
            // (fresh seq), so it wins over the target's older rewrites.
            State.SanctumCharge = false;
            from.Grafts.Remove(graft);
            to.Grafts.Add(new GraftRecord(State.Cards.NextGraftSeq(), graft.Kind, graft.ToRank, graft.ToSuit,
                graft.Source + " (sanctum-moved)"));

            return Result.Success(new List<GameEvent>
            {
                new GraftMoved { FromPhysicalId = from.PhysicalId, ToPhysicalId = to.PhysicalId, Kind = graft.Kind },
            });
        }

        // ── relics (§8) ─────────────────────────────────────────────────────────

        private int CaravanPrice() =>
            Tuning.CaravanCost - (State.HasRelic("caravan_coin") ? Tuning.CaravanCoinDiscount : 0);

        private Result HandleChooseRelic(ChooseRelic a)
        {
            var pending = State.PendingChoice;
            if (pending == null || pending.Kind != PendingChoiceKind.RelicSelect)
                return Result.Fail("No relic pick pending");
            if (!pending.RelicOptions.Contains(a.RelicId))
                return Result.Fail($"'{a.RelicId}' is not on offer");

            // ── validated; mutate ──
            State.RelicBag.Add(a.RelicId);
            State.PendingChoices.RemoveAt(0);
            return Result.Success(new List<GameEvent>
            {
                new RelicGained { RelicId = a.RelicId, Source = "lair raid" },
            });
        }

        private Result HandleEquipRelic(EquipRelic a)
        {
            if (State.Phase == CampaignPhase.Encounter)
                return Result.Fail("Relic swaps are locked during combat");
            if (State.PendingChoice != null)
                return Result.Fail($"Resolve the pending {State.PendingChoice.Kind} first");
            if (!RelicTables.Exists(a.RelicId)) return Result.Fail($"Unknown relic '{a.RelicId}'");
            if (!State.RelicBag.Contains(a.RelicId)) return Result.Fail("That relic is not in the bag");

            // ── validated; mutate ── A relic fits only its own slot; equipping over
            // an occupied slot swaps the old relic back to the bag — swaps are free.
            int slot = (int)RelicTables.Get(a.RelicId).Slot;
            string old = State.EquippedRelics[slot];
            State.RelicBag.Remove(a.RelicId);
            if (old != null) State.RelicBag.Add(old);
            State.EquippedRelics[slot] = a.RelicId;
            return Result.Success(new List<GameEvent>
            {
                new RelicEquipped { RelicId = a.RelicId, SwappedOut = old },
            });
        }

        private Result HandleBuyRelic(BuyRelic a)
        {
            if (State.CaravanOffer == null)
                return Result.Fail("No caravan here");
            var ids = a.PayPhysicalIds ?? new List<int>();
            if (ids.Distinct().Count() != ids.Count) return Result.Fail("Duplicate card in payment");
            foreach (int id in ids)
                if (!State.Deck.Hand.Contains(id)) return Result.Fail($"Card #{id} is not in hand");
            int paid = ids.Sum(id => State.Cards.Get(id).EffectiveValue());
            int price = CaravanPrice();
            if (paid < price) return Result.Fail($"Paid {paid}, the caravan wants {price}");

            // ── validated; mutate ──
            foreach (int id in ids) State.Deck.Hand.Remove(id);
            State.Deck.Discard.AddRange(ids);
            string relic = State.CaravanOffer;
            State.CaravanOffer = null;
            State.RelicBag.Add(relic);
            return Result.Success(new List<GameEvent>
            {
                new RelicGained { RelicId = relic, Source = $"caravan, {paid} card-value" },
            });
        }

        /// <summary>
        /// Would UseRelic succeed right now, ignoring target picks? Read-only twin
        /// of the handler's per-relic guards (drives truthful button states).
        /// Target-specific checks (which card, cost totals) stay at dispatch.
        /// </summary>
        public string CanUseRelic(string id)
        {
            if (!State.HasRelic(id)) return $"'{id}' is not equipped";
            if (State.PendingChoice != null) return $"Resolve the pending {State.PendingChoice.Kind} first";
            var enc = State.Encounter;
            bool inFight = State.Phase == CampaignPhase.Encounter && enc?.Current != null;

            switch (id)
            {
                case "forced_march":
                {
                    if (!inFight) return "Forced March skips a fight you are in";
                    if (State.UsedThisProvince.Contains(id)) return "Already marched this province";
                    var node = State.EncounterNodeId != null ? State.Map?.Get(State.EncounterNodeId.Value) : null;
                    if (node == null || (node.Kind != RoadNodeKind.Skirmish && node.Kind != RoadNodeKind.Veteran))
                        return "Only ordinary fights (skirmish/veteran) can be marched past";
                    return null;
                }
                case "bedroll":
                    if (inFight) return "No unrolling mid-fight";
                    if (State.Phase != CampaignPhase.Road) return "Bedrolls open on the road";
                    return State.UsedThisProvince.Contains(id) ? "Already rested this province" : null;
                case "slip_away":
                    return inFight ? null : "Nothing to slip away from";
                case "debt":
                    if (!inFight) return "Debt is taken in combat";
                    return enc.UsedThisFight.Contains(id) ? "Once per fight" : null;
                case "requisition_writ":
                    if (State.UsedThisProvince.Contains(id)) return "Once per province";
                    return State.Deck.Hand.Count < Tuning.RequisitionCards
                        ? $"The writ takes {Tuning.RequisitionCards} hand cards" : null;
                case "liquidate":
                    if (!inFight) return "Liquidate works in combat";
                    return enc.UsedThisFight.Contains(id) ? "Once per fight" : null;
                case "double_or_nothing":
                    if (!inFight) return "Double or Nothing is a combat gamble";
                    if (enc.UsedThisFight.Contains(id)) return "Once per fight";
                    return State.Deck.Hand.Count == 0 ? "Nothing to gamble" : null;
                case "sainted_scalpel":
                    if (!inFight) return "The scalpel works in combat";
                    return enc.UsedThisFight.Contains(id) ? "Once per fight" : null;
                case "unbinding":
                    if (!inFight) return "Unbinding works in combat";
                    return enc.UsedThisEnemy.Contains(id) ? "Once per enemy" : null;
                case "second_wind":
                    if (!inFight) return "Second Wind works in combat";
                    return enc.UsedThisFight.Contains(id) ? "Once per fight" : null;
                case "aegis":
                    if (!inFight) return "Aegis works in combat";
                    return enc.UsedThisEnemy.Contains(id) ? "Once per enemy" : null;
                case "bloodlust":
                    if (!inFight) return "Bloodlust works in combat";
                    return enc.UsedThisEnemy.Contains(id) ? "Once per enemy" : null;
                case "echo":
                    if (!inFight) return "Echo works in combat";
                    return enc.UsedThisFight.Contains(id) ? "Once per fight" : null;
                case "lodestone":
                    if (!inFight) return "Lodestone works in combat";
                    if (enc.UsedThisFight.Contains(id)) return "Once per fight";
                    return State.Deck.Hand.Count >= State.MaxHandSize ? "Hand is full" : null;
                default:
                    return $"{RelicTables.Get(id).Name} is passive — it works on its own";
            }
        }

        private Result HandleUseRelic(UseRelic a)
        {
            string id = a.RelicId;
            string blockedWhy = CanUseRelic(id);
            if (blockedWhy != null) return Result.Fail(blockedWhy);
            if (!State.HasRelic(id))
                return Result.Fail($"'{id}' is not equipped");

            var ids = a.PhysicalIds ?? new List<int>();
            var enc = State.Encounter;
            bool inFight = State.Phase == CampaignPhase.Encounter && enc?.Current != null;
            if (State.PendingChoice != null)
                return Result.Fail($"Resolve the pending {State.PendingChoice.Kind} first");

            List<GameEvent> events;
            Result Used(string note, params GameEvent[] extra)
            {
                events = new List<GameEvent> { new RelicUsed { RelicId = id, Note = note } };
                events.AddRange(extra);
                return Result.Success(events);
            }

            switch (id)
            {
                // ── Cloak ──
                case "forced_march": // once/province: skip an ordinary fight, no rewards
                {
                    if (!inFight) return Result.Fail("Forced March skips a fight you are in");
                    if (State.UsedThisProvince.Contains(id)) return Result.Fail("Already marched this province");
                    var node = State.EncounterNodeId != null ? State.Map?.Get(State.EncounterNodeId.Value) : null;
                    if (node == null || (node.Kind != RoadNodeKind.Skirmish && node.Kind != RoadNodeKind.Veteran))
                        return Result.Fail("Only ordinary fights (skirmish/veteran) can be marched past");
                    State.UsedThisProvince.Add(id);
                    State.Encounter = null;
                    State.EncounterNodeId = null;
                    State.Phase = CampaignPhase.Road;
                    return Used("the column marches past — no fight, no spoils");
                }

                case "bedroll": // once/province: reshuffle discard into the Tavern, no Camp
                {
                    if (inFight) return Result.Fail("No unrolling mid-fight");
                    if (State.Phase != CampaignPhase.Road) return Result.Fail("Bedrolls open on the road");
                    if (State.UsedThisProvince.Contains(id)) return Result.Fail("Already rested this province");
                    State.UsedThisProvince.Add(id);
                    int n = State.Deck.Discard.Count;
                    State.Deck.Tavern.AddRange(State.Deck.Discard);
                    State.Deck.Discard.Clear();
                    _rng.Shuffle(State.Deck.Tavern);
                    return Used($"{n} discard(s) shuffled back into the Tavern");
                }

                case "slip_away": // pay 5 card-value to retreat: hand kept, enemy not defeated
                {
                    if (!inFight) return Result.Fail("Nothing to slip away from");
                    if (ids.Count == 0) return Result.Fail("Slipping away costs cards");
                    if (ids.Distinct().Count() != ids.Count) return Result.Fail("Duplicate card in payment");
                    foreach (int pid in ids)
                        if (!State.Deck.Hand.Contains(pid)) return Result.Fail($"Card #{pid} is not in hand");
                    int paid = ids.Sum(pid => State.Cards.Get(pid).EffectiveValue());
                    if (paid < Tuning.SlipAwayCost)
                        return Result.Fail($"Paid {paid}, slipping away costs {Tuning.SlipAwayCost}");
                    foreach (int pid in ids) State.Deck.Hand.Remove(pid);
                    State.Deck.Discard.AddRange(ids);
                    State.Encounter = null;
                    State.EncounterNodeId = null;
                    State.Phase = CampaignPhase.Road;
                    return Used($"retreated for {paid} — the enemy stands undefeated");
                }

                case "forked_road":
                case "scout_ahead":
                case "vanguard":
                    return Result.Fail($"{RelicTables.Get(id).Name} is passive — it works on its own");

                // ── Ring ──
                case "debt": // once/fight: draw 2 now, discard 1 at each of the next two turn starts
                {
                    if (!inFight) return Result.Fail("Debt is taken in combat");
                    if (enc.UsedThisFight.Contains(id)) return Result.Fail("Once per fight");
                    enc.UsedThisFight.Add(id);
                    enc.DebtTurnsRemaining = Tuning.DebtTurns;
                    var drawn = Draw(Tuning.DebtDraw);
                    return Used($"drew {drawn.PhysicalIds.Count} against the next {Tuning.DebtTurns} turns", drawn);
                }

                case "requisition_writ": // once/province: two lowest hand cards → one fragment
                {
                    // PLACEHOLDER interpretation of "your two lowest cards": the two
                    // lowest-value HAND cards leave the run entirely. Tune later.
                    if (State.UsedThisProvince.Contains(id)) return Result.Fail("Once per province");
                    if (State.Deck.Hand.Count < Tuning.RequisitionCards)
                        return Result.Fail($"The writ takes {Tuning.RequisitionCards} hand cards");
                    State.UsedThisProvince.Add(id);
                    var lowest = State.Deck.Hand
                        .OrderBy(pid => State.Cards.Get(pid).EffectiveValue())
                        .Take(Tuning.RequisitionCards).ToList();
                    foreach (int pid in lowest)
                    {
                        State.Deck.Hand.Remove(pid);
                        State.OwnedCards.Remove(pid);
                    }
                    State.TokenFragments++;
                    return Used($"converted {lowest.Count} card(s) into a fragment (pool {State.TokenFragments})");
                }

                case "liquidate": // once/fight: discard one card to draw 2
                {
                    if (!inFight) return Result.Fail("Liquidate works in combat");
                    if (enc.UsedThisFight.Contains(id)) return Result.Fail("Once per fight");
                    if (ids.Count != 1 || !State.Deck.Hand.Contains(ids[0]))
                        return Result.Fail("Liquidate discards exactly one hand card");
                    enc.UsedThisFight.Add(id);
                    State.Deck.Hand.Remove(ids[0]);
                    State.Deck.Discard.Add(ids[0]);
                    var drawn = Draw(Tuning.LiquidateDraw);
                    return Used($"liquidated #{ids[0]}, drew {drawn.PhysicalIds.Count}", drawn);
                }

                case "double_or_nothing": // once/fight: discard the hand (n), draw n+1
                {
                    if (!inFight) return Result.Fail("Double or Nothing is a combat gamble");
                    if (enc.UsedThisFight.Contains(id)) return Result.Fail("Once per fight");
                    if (State.Deck.Hand.Count == 0) return Result.Fail("Nothing to gamble");
                    enc.UsedThisFight.Add(id);
                    int n = State.Deck.Hand.Count;
                    State.Deck.Discard.AddRange(State.Deck.Hand);
                    State.Deck.Hand.Clear();
                    var drawn = Draw(n + 1);
                    return Used($"threw {n} card(s), drew {drawn.PhysicalIds.Count}", drawn);
                }

                case "hoard":
                case "interest":
                case "last_coin":
                case "caravan_coin":
                    return Result.Fail($"{RelicTables.Get(id).Name} is passive — it works on its own");

                // ── Amulet buttons ──
                case "sainted_scalpel": // once/fight: up to 6 discards → Tavern, draw 1
                {
                    if (!inFight) return Result.Fail("The scalpel works in combat");
                    if (enc.UsedThisFight.Contains(id)) return Result.Fail("Once per fight");
                    enc.UsedThisFight.Add(id);
                    int n = System.Math.Min(Tuning.ScalpelMax, State.Deck.Discard.Count);
                    if (n > 0)
                    {
                        _rng.Shuffle(State.Deck.Discard);
                        var back = State.Deck.Discard.Take(n).ToList();
                        State.Deck.Discard.RemoveRange(0, n);
                        State.Deck.Tavern.AddRange(back);
                        _rng.Shuffle(State.Deck.Tavern);
                    }
                    var drawn = Draw(1);
                    return Used($"stitched {n} discard(s) back, drew {drawn.PhysicalIds.Count}", drawn);
                }

                case "unbinding": // once/enemy: cancel immunity for the next play
                    if (!inFight) return Result.Fail("Unbinding works in combat");
                    if (enc.UsedThisEnemy.Contains(id)) return Result.Fail("Once per enemy");
                    enc.UsedThisEnemy.Add(id);
                    enc.UnbindingArmed = true;
                    return Used("the enemy's immunity unravels for one play");

                case "second_wind": // once/fight: an extra turn before the counterattack
                    if (!inFight) return Result.Fail("Second Wind works in combat");
                    if (enc.UsedThisFight.Contains(id)) return Result.Fail("Once per fight");
                    enc.UsedThisFight.Add(id);
                    enc.SecondWindArmed = true;
                    return Used("armed — the next counterattack never comes");

                case "aegis": // once/enemy: next counterattack −5
                    if (!inFight) return Result.Fail("Aegis works in combat");
                    if (enc.UsedThisEnemy.Contains(id)) return Result.Fail("Once per enemy");
                    enc.UsedThisEnemy.Add(id);
                    enc.AegisArmed = true;
                    return Used($"armed — the next counterattack is blunted by {Tuning.AegisReduction}");

                case "bloodlust": // once/enemy: next play +3 damage
                    if (!inFight) return Result.Fail("Bloodlust works in combat");
                    if (enc.UsedThisEnemy.Contains(id)) return Result.Fail("Once per enemy");
                    enc.UsedThisEnemy.Add(id);
                    enc.AttackBank += Tuning.BloodlustBonus;
                    return Used($"+{Tuning.BloodlustBonus} banked onto the next play");

                case "echo": // once/fight: replay a discard for its VALUE only
                {
                    if (!inFight) return Result.Fail("Echo works in combat");
                    if (enc.UsedThisFight.Contains(id)) return Result.Fail("Once per fight");
                    if (ids.Count != 1 || !State.Deck.Discard.Contains(ids[0]))
                        return Result.Fail("Echo replays exactly one discard card");
                    enc.UsedThisFight.Add(id);
                    int v = State.Cards.Get(ids[0]).EffectiveValue();
                    var enemy = enc.Current;
                    enemy.Hp -= v; // value only: no suit powers, no doubles, no counterattack
                    events = new List<GameEvent>
                    {
                        new RelicUsed { RelicId = id, Note = $"#{ids[0]} echoes for {v}" },
                        new DamageDealt { Amount = v, Doubled = false },
                    };
                    if (enemy.Hp <= 0)
                    {
                        enemy.Alive = false;
                        enemy.KillOutcome = enemy.Hp == 0 ? KillKind.Exact : KillKind.Overkill;
                        events.Add(new EnemyKilled { Face = enemy.Face, Kind = enemy.KillOutcome.Value });
                        if (enemy.Hp == 0 && !enc.IsGate &&
                            !State.OwnsFace(enemy.Face) && !CardRules.IsRoyal(enemy.Rank))
                            RecruitEnemy(enemy, false, events);
                        AdvancePastDead(events);
                    }
                    return Result.Success(events);
                }

                case "lodestone": // once/fight: pull a named Tavern card into hand
                {
                    if (!inFight) return Result.Fail("Lodestone works in combat");
                    if (enc.UsedThisFight.Contains(id)) return Result.Fail("Once per fight");
                    if (ids.Count != 1 || !State.Deck.Tavern.Contains(ids[0]))
                        return Result.Fail("Lodestone pulls exactly one Tavern card");
                    if (State.Deck.Hand.Count >= State.MaxHandSize) return Result.Fail("Hand is full");
                    enc.UsedThisFight.Add(id);
                    State.Deck.Tavern.Remove(ids[0]);
                    State.Deck.Hand.Add(ids[0]);
                    return Used($"#{ids[0]} pulled from the Tavern into hand");
                }

                default:
                    return Result.Fail($"{RelicTables.Get(id).Name} has no activated use");
            }
        }

        // ── spells: gauntlet, bracelet, forge, casting (§7) ─────────────────────

        private Result HandleArmCrystal(ArmCrystal a)
        {
            if (State.Phase != CampaignPhase.Road && State.Phase != CampaignPhase.ChapterComplete)
                return Result.Fail("The bracelet opens between encounters");
            if (State.PendingChoice != null)
                return Result.Fail($"Resolve the pending {State.PendingChoice.Kind} first");
            if (a.Tier != SpellTables.TierFragment && a.Tier != SpellTables.TierHalf)
                return Result.Fail("Arm a Fragment (1) or a Half (2)");
            if (State.GauntletTiers[(int)a.Suit] != SpellTables.TierEmpty)
                return Result.Fail($"The {PhysicalCard.SuitGlyph(a.Suit)} slot is occupied — cast it first");
            if (a.Tier == SpellTables.TierFragment && State.TokenFragments < 1)
                return Result.Fail("No fragments in the pool");
            if (a.Tier == SpellTables.TierHalf && State.TokenHalves < 1)
                return Result.Fail("No Halves in the pool");

            // ── validated; mutate ──
            if (a.Tier == SpellTables.TierFragment) State.TokenFragments--;
            else State.TokenHalves--;
            State.GauntletTiers[(int)a.Suit] = a.Tier;
            return Result.Success(new List<GameEvent> { new CrystalArmed { Suit = a.Suit, Tier = a.Tier } });
        }

        private Result HandleForgeConvert()
        {
            if (State.Phase != CampaignPhase.Road || State.Map?.Current.Kind != RoadNodeKind.Forge)
                return Result.Fail("The Forge works only while standing at one");
            if (State.PendingChoice != null)
                return Result.Fail($"Resolve the pending {State.PendingChoice.Kind} first");
            if (State.TokenFragments < Tuning.FragmentsPerHalf)
                return Result.Fail($"Forging a Half takes {Tuning.FragmentsPerHalf} fragments");

            // ── validated; mutate ──
            State.TokenFragments -= Tuning.FragmentsPerHalf;
            State.TokenHalves++;
            return Result.Success(new List<GameEvent>
            {
                new HalfForged { Fragments = State.TokenFragments, Halves = State.TokenHalves },
            });
        }

        /// <summary>Read-only twin of HandleCastSpell's guards (truthful cast buttons).</summary>
        public string CanCastSpell(Suit suit)
        {
            if (State.Phase != CampaignPhase.Encounter || State.Encounter?.Current == null)
                return "Spells cast in combat";
            int tier = State.GauntletTiers[(int)suit];
            bool isBrace = suit == Suit.Spades && tier == SpellTables.TierHalf;
            var pending = State.PendingChoice;
            if (tier == SpellTables.TierEmpty)
                return $"The {PhysicalCard.SuitGlyph(suit)} slot is empty";
            if (State.Encounter.CastSuits.Contains(suit))
                return $"Already cast {PhysicalCard.SuitGlyph(suit)} this combat";
            if (pending != null && !(pending.Kind == PendingChoiceKind.Defend && isBrace))
                return $"Resolve the pending {pending.Kind} first";
            if (isBrace && pending == null)
                return "Brace casts during the pay step";
            if (isBrace && State.Deck.Hand.Count == 0)
                return "Brace spends a hand card — hand is empty";
            return null;
        }

        private Result HandleCastSpell(CastSpell a)
        {
            string blockedWhy = CanCastSpell(a.Suit);
            if (blockedWhy != null) return Result.Fail(blockedWhy);

            var enc = State.Encounter;
            var enemy = enc.Current;
            int tier = State.GauntletTiers[(int)a.Suit];
            bool isBrace = a.Suit == Suit.Spades && tier == SpellTables.TierHalf;
            var pending = State.PendingChoice;

            // ── validated; mutate ── Casting consumes the whole slot (§7); spells
            // sit above suit immunity, so the enemy's suit is never consulted.
            State.GauntletTiers[(int)a.Suit] = SpellTables.TierEmpty;
            enc.CastSuits.Add(a.Suit);

            var events = new List<GameEvent>();
            void Cast(string note) => events.Add(new SpellCast { Suit = a.Suit, Tier = tier, Note = note });

            switch ((a.Suit, tier))
            {
                case (Suit.Clubs, SpellTables.TierFragment): // Keen Edge
                    enc.KeenEdgeArmed = true;
                    Cast("the next attack deals ×2");
                    break;

                case (Suit.Clubs, SpellTables.TierHalf): // Commit
                    enc.CommitArmed = true;
                    Cast("the next play may include one extra card of any rank");
                    break;

                case (Suit.Diamonds, SpellTables.TierFragment): // Quick Muster
                {
                    var drawn = Draw(Tuning.QuickMusterDraw);
                    Cast($"drew {drawn.PhysicalIds.Count}");
                    if (drawn.PhysicalIds.Count > 0) events.Add(drawn);
                    break;
                }

                case (Suit.Diamonds, SpellTables.TierHalf): // Rally
                    enc.RallyArmed = true;
                    Cast($"next counterattack: draw min(net, {Tuning.RallyDrawCap}) before paying");
                    break;

                case (Suit.Spades, SpellTables.TierFragment): // Guard Up
                    enemy.Shield += Tuning.GuardUpShield;
                    Cast($"shield +{Tuning.GuardUpShield}");
                    events.Add(new ShieldGained { Amount = Tuning.GuardUpShield, Total = enemy.Shield });
                    break;

                case (Suit.Spades, SpellTables.TierHalf): // Brace — the pay step spell
                {
                    int best = State.Deck.Hand
                        .OrderByDescending(id => State.Cards.Get(id).EffectiveValue())
                        .First();
                    int v = State.Cards.Get(best).EffectiveValue();
                    State.Deck.Hand.Remove(best);
                    State.Deck.Discard.Add(best);
                    enemy.Shield += v;
                    pending.RequiredValue -= v;
                    enc.PaidThisFight = true; // a brace is still a payment (Interest, §8)
                    Cast($"spent #{best} — shield +{v}, payment cut to {System.Math.Max(0, pending.RequiredValue)}");
                    events.Add(new ShieldGained { Amount = v, Total = enemy.Shield });
                    if (pending.RequiredValue <= 0)
                    {
                        State.PendingChoices.RemoveAt(0);
                        events.Add(new Defended { Paid = 0, Required = 0 });
                    }
                    break;
                }

                case (Suit.Hearts, SpellTables.TierFragment): // Refit
                {
                    int n = System.Math.Min(Tuning.RefitReturn, State.Deck.Discard.Count);
                    if (n > 0)
                    {
                        _rng.Shuffle(State.Deck.Discard);
                        var back = State.Deck.Discard.Take(n).ToList();
                        State.Deck.Discard.RemoveRange(0, n);
                        State.Deck.Tavern.AddRange(back);
                    }
                    var drawn = Draw(Tuning.RefitDraw);
                    Cast($"returned {n} discard(s), drew {drawn.PhysicalIds.Count}");
                    if (n > 0) events.Add(new CardsRecovered { Count = n });
                    if (drawn.PhysicalIds.Count > 0) events.Add(drawn);
                    break;
                }

                case (Suit.Hearts, SpellTables.TierHalf): // Full Recycle
                {
                    int n = State.Deck.Discard.Count;
                    State.Deck.Tavern.AddRange(State.Deck.Discard);
                    State.Deck.Discard.Clear();
                    _rng.Shuffle(State.Deck.Tavern);
                    var drawn = Draw(Tuning.RecycleDraw);
                    Cast($"recycled the whole discard ({n}), drew {drawn.PhysicalIds.Count}");
                    if (n > 0) events.Add(new CardsRecovered { Count = n });
                    if (drawn.PhysicalIds.Count > 0) events.Add(drawn);
                    break;
                }
            }

            return Result.Success(events);
        }
    }
}
