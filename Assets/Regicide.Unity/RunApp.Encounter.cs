using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;
using Regicide.Core;

namespace Regicide.Unity
{
    public partial class RunApp
    {
        // ── encounter screen (§16), Slay-the-Spire arena layout ────────────────
        //   top bar: chapter chips + deck counts
        //   arena:   [gauntlet/staff/relics rail] [the enemy card] [chronicle]
        //   bottom:  selected-total chip · the hand fan · play/yield

        private VisualElement BuildEncounter()
        {
            var enc = S.Encounter;
            var enemy = enc.Current;

            var screen = new VisualElement();
            screen.style.flexGrow = 1;
            Theme.SetPadding(screen, 8, 12);

            // ── top strip: one quiet line each side ──
            var top = Row();
            top.style.flexWrap = Wrap.NoWrap;
            top.style.justifyContent = Justify.SpaceBetween;
            string where = $"chapter {S.Chapter} · province {S.Province}" +
                           (enc.IsGate ? $"   ROYAL {PhysicalCard.RankGlyph(enc.GateRank)} GATE" : "") +
                           (enc.Enemies.Count > 1 ? $"   {enc.Enemies.Count(e => !e.Alive)}/{enc.Enemies.Count} down" : "");
            var whereLabel = Theme.Subtle(where);
            if (enc.IsGate) whereLabel.style.color = Theme.Gold;
            top.Add(whereLabel);
            top.Add(DeckCounts());
            screen.Add(top);

            if (enc.IsGate)
            {
                // The keep-pyramid ledger, live during the fight that decides it (C6):
                // grey = still to fight · gold = exact, eligible · red-struck = banished.
                var ledger = Row();
                ledger.style.flexWrap = Wrap.NoWrap;
                ledger.style.justifyContent = Justify.Center;
                ledger.Add(Theme.Subtle($"keep {GameSession.KeepTarget(enc.GateRank)} of: "));
                foreach (var royal in enc.Enemies)
                {
                    string glyph = PhysicalCard.SuitGlyph(royal.Suit);
                    if (royal.KillOutcome == KillKind.Exact)
                        ledger.Add(Theme.Chip($"{glyph} exact", Theme.GoldBright));
                    else if (royal.KillOutcome == KillKind.Overkill)
                        ledger.Add(Theme.Chip($"{glyph} banished", Theme.RedBright));
                    else
                        ledger.Add(Theme.Chip(glyph, Theme.Grey));
                }
                screen.Add(ledger);

                // First-blood banner (J3): the rule that ruins runs, said out loud
                // before any royal has fallen.
                if (enc.Enemies.All(e => e.Alive))
                {
                    var banner = Theme.Frame();
                    Theme.SetBorder(banner, Theme.GoldBright, 2);
                    banner.style.alignSelf = Align.Center;
                    Theme.SetPadding(banner, 6, 18);
                    var text = new Label(
                        $"ROYAL GATE — exact kills stay eligible to keep · overkills are BANISHED forever · you keep {GameSession.KeepTarget(enc.GateRank)}");
                    text.style.color = Theme.GoldPale;
                    text.style.fontSize = 12;
                    text.style.unityFontStyleAndWeight = FontStyle.Bold;
                    banner.Add(text);
                    screen.Add(banner);
                }
            }

            // ── arena ──
            var arena = new VisualElement();
            arena.style.flexDirection = FlexDirection.Row;
            arena.style.flexGrow = 1;
            arena.style.marginTop = 6;

            var leftRail = new ScrollView();
            leftRail.style.width = 300;
            leftRail.style.flexShrink = 0;
            leftRail.Add(GauntletCombatPanel());
            leftRail.Add(StaffCombatPanel());
            leftRail.Add(RelicCombatPanel());
            var armed = ArmedChips();
            if (armed != null) leftRail.Add(armed);
            arena.Add(leftRail);

            arena.Add(EnemyZone(enc, enemy));

            screen.Add(arena);

            // ── bottom: the player's table, flanked — player corner | fan | piles ──
            var table = new VisualElement();
            table.style.flexShrink = 0;

            var spread = new VisualElement();
            spread.style.flexDirection = FlexDirection.Row;
            spread.style.alignItems = Align.FlexEnd;

            spread.Add(PlayerCorner(enemy));

            var center = new VisualElement();
            center.style.flexGrow = 1;

            var pending = S.PendingChoice;
            if (pending != null && pending.Kind == PendingChoiceKind.Defend)
            {
                // ── the pay step, INLINE: the hand fan is the selector, no popup ──
                int covered = _sel.Sum(id => S.Cards.Get(id).EffectiveValue());
                bool enough = covered >= pending.RequiredValue;

                var payRow = Row();
                payRow.style.justifyContent = Justify.Center;
                payRow.Add(Theme.Bar(covered / (float)pending.RequiredValue,
                    $"pay {covered} / {pending.RequiredValue}",
                    enough ? Theme.Green : Theme.RedBright, 260, 18));
                if (covered > pending.RequiredValue)
                {
                    // Don't burn a King on a 4-counter without noticing (C11).
                    var over = Theme.Subtle($"overpaying by {covered - pending.RequiredValue}");
                    over.style.color = Theme.Gold;
                    over.style.marginLeft = 8;
                    payRow.Add(over);
                }
                center.Add(payRow);
                if (S.Hero.PathC2 == ClassTables.RungRenewal)
                {
                    var renewal = Theme.Subtle("Renewal: paying with 3+ cards recovers your best discard");
                    renewal.style.alignSelf = Align.Center;
                    center.Add(renewal);
                }

                center.Add(HandStrip(true));

                var payActions = Row();
                payActions.style.justifyContent = Justify.Center;
                payActions.style.marginTop = 4;
                payActions.Add(BtnPrimary($"Pay the counterattack ({covered}/{pending.RequiredValue})",
                    () => Dispatch(new DefendDiscard(_sel.ToList())), enough));
                if (S.Hero.StaffId == "parry")
                    payActions.Add(Btn("Parry with selected ♠",
                        () => Dispatch(new ActivateStaff(_sel.First())), _sel.Count == 1));
                if (S.GauntletTiers[(int)Suit.Spades] == SpellTables.TierHalf &&
                    !enc.CastSuits.Contains(Suit.Spades))
                {
                    // Brace auto-spends the HIGHEST card — say which one (C9).
                    string braceCost = S.Deck.Hand.Count > 0
                        ? PhysicalCard.Pretty(S.Cards.Get(
                              S.Deck.Hand.OrderByDescending(id => S.Cards.Get(id).EffectiveValue()).First())
                          .EffectiveFace())
                        : "?";
                    payActions.Add(Theme.Button($"Cast Brace ♠ — spends {braceCost}",
                        () => Dispatch(new CastSpell(Suit.Spades)), Theme.ButtonKind.Danger));
                }
                center.Add(payActions);
            }
            else if (pending != null && pending.Kind == PendingChoiceKind.DebtDiscard)
            {
                // ── the debt instalment, INLINE: pick exactly one card ──
                var debtRow = Row();
                debtRow.style.justifyContent = Justify.Center;
                debtRow.Add(Theme.Subtle("the debt comes due — discard one card"));
                center.Add(debtRow);

                center.Add(HandStrip(true));

                var debtActions = Row();
                debtActions.style.justifyContent = Justify.Center;
                debtActions.style.marginTop = 4;
                debtActions.Add(BtnPrimary("Pay the instalment",
                    () => Dispatch(new DefendDiscard(_sel.ToList())), _sel.Count == 1));
                center.Add(debtActions);
            }
            else
            {
                // ── the normal turn: the TRUTH before the click (PreviewPlay) ──
                var pv = _sel.Count > 0 ? _session.PreviewPlay(_sel.ToList()) : default(PlayPreview);
                var yp = _session.YieldPreview();

                var status = Row();
                status.style.justifyContent = Justify.Center;
                if (_sel.Count > 0)
                {
                    Label line;
                    if (!pv.Legal)
                    {
                        line = Theme.Subtle("! " + pv.Illegal);
                        line.style.color = Theme.RedBright;
                    }
                    else
                    {
                        var sb = new System.Text.StringBuilder();
                        sb.Append($"deals {pv.Damage}");
                        var mods = new List<string>();
                        if (pv.Doubled) mods.Add("♣ ×2");
                        if (enc.FirstAttackDouble) mods.Add("camp ×2");
                        if (enc.KeenEdgeArmed) mods.Add("keen edge ×2");
                        if (enc.AttackBank > 0) mods.Add($"+{enc.AttackBank} bank");
                        if (pv.WhetstoneShaved) mods.Add("whetstone shave");
                        if (mods.Count > 0) sb.Append(" (").Append(string.Join(", ", mods)).Append(')');
                        if (pv.ShieldGain > 0) sb.Append($" · shields {pv.ShieldGain}");
                        if (pv.Draw > 0) sb.Append($" · draws {pv.Draw}");
                        if (pv.Recover > 0)
                            sb.Append($" · recovers {pv.Recover}").Append(pv.RecoverIsChoice ? " (your pick)" : "");
                        if (pv.BlockedSuit is Suit bs)
                            sb.Append($" · {PhysicalCard.SuitGlyph(bs)} power blocked");

                        Color lineColor;
                        if (pv.Outcome == KillKind.Exact)
                        {
                            sb.Append(" — EXACT KILL");
                            lineColor = Theme.GoldBright;
                        }
                        else if (pv.Outcome == KillKind.Overkill)
                        {
                            sb.Append(enc.IsGate ? " — OVERKILL: banished forever" : " — OVERKILL: no reward");
                            lineColor = Theme.RedBright;
                        }
                        else if (pv.LethalCounter)
                        {
                            sb.Append($" — COUNTER {pv.NetCounter} KILLS YOU");
                            lineColor = Theme.RedBright;
                        }
                        else
                        {
                            sb.Append($" — they survive: counter {pv.NetCounter}");
                            lineColor = Theme.Green;
                        }
                        line = Theme.Subtle(sb.ToString());
                        line.style.color = lineColor;
                    }
                    line.style.fontSize = 12;
                    status.Add(line);
                }
                else
                {
                    // The idle hint knows the player's own widened legality (C10).
                    string hint = "1 card · an Ace + one card · a same-rank set up to 10";
                    if (S.Hero.StaffId == "reinforce") hint += " · your ♠ may join any set (Reinforce)";
                    if (S.Hero.StaffId == "dovetail") hint += " · one adjacent card may join (Dovetail)";
                    if (enc.CommitArmed) hint += " · +1 any card (Commit)";
                    hint += " — or yield";
                    status.Add(Theme.Subtle(hint));
                }
                center.Add(status);

                center.Add(HandStrip(true));
                ScheduleKillGlow(center); // the exact-kill invitation on the fan

                bool playLethal = _sel.Count > 0 && pv.Legal && pv.LethalCounter;
                if (!playLethal && !yp.lethal) _confirmLethal = false; // danger passed — disarm

                var actions = Row();
                actions.style.justifyContent = Justify.Center;
                actions.style.marginTop = 4;

                // The survival number only speaks when it bites — a comfortable margin
                // is noise the player asked us to drop (playtest: "17 vs 3 is useless").
                if (yp.net > 0)
                {
                    int margin = S.HandTotalValue() - yp.net;
                    if (margin < 0)
                        actions.Add(Theme.Chip($"counter {yp.net} — your hand covers {S.HandTotalValue()}", Theme.RedBright));
                    else if (margin <= 2)
                        actions.Add(Theme.Chip($"counter {yp.net} — only {margin} to spare", Theme.Gold));
                }

                if (playLethal)
                    actions.Add(Theme.Button(
                        _confirmLethal ? "Yes — take the hit and die" : "Play — the counter KILLS YOU",
                        () =>
                        {
                            if (_confirmLethal) { _confirmLethal = false; Dispatch(new PlayCards(_sel.ToList())); }
                            else { _confirmLethal = true; Render(); }
                        }, Theme.ButtonKind.Danger));
                else
                    actions.Add(BtnPrimary($"Play selected ({_sel.Count})",
                        () => Dispatch(new PlayCards(_sel.ToList())), _sel.Count > 0 && pv.Legal));

                if (yp.lethal)
                    actions.Add(Theme.Button(
                        _confirmLethal ? "Yes — die on your feet" : "Yield — THIS KILLS YOU",
                        () =>
                        {
                            if (_confirmLethal) { _confirmLethal = false; Dispatch(new Yield()); }
                            else { _confirmLethal = true; Render(); }
                        }, Theme.ButtonKind.Danger));
                else
                    actions.Add(Btn("Yield", () => Dispatch(new Yield())));
                center.Add(actions);
            }

            spread.Add(center);

            // RIGHT flank: the piles live beside the fan (not the far corner) + the pool.
            var rightFlank = new VisualElement();
            rightFlank.style.width = 130;
            rightFlank.style.flexShrink = 0;
            rightFlank.style.alignItems = Align.Center;
            rightFlank.style.paddingBottom = 6;
            rightFlank.Add(PileIcons());
            if (S.TokenFragments > 0 || S.TokenHalves > 0)
            {
                var pool = Theme.Subtle($"{S.TokenFragments} frags" +
                    (S.TokenHalves > 0 ? $" · {S.TokenHalves} half" : ""));
                pool.style.marginTop = 3;
                rightFlank.Add(pool);
            }
            spread.Add(rightFlank);
            table.Add(spread);

            var foot = Row();
            foot.style.flexWrap = Wrap.NoWrap;
            foot.style.justifyContent = Justify.Center;
            foot.style.marginTop = 2;
            foot.Add(EventLog());
            table.Add(foot);

            screen.Add(table);
            return screen;
        }

        /// <summary>
        /// The LEFT flank of the table — the player's corner: class crest, staff,
        /// and the BLOCK readout (it lives per-enemy in the rules, but it is YOURS).
        /// </summary>
        private VisualElement PlayerCorner(EnemyState enemy)
        {
            var left = new VisualElement();
            left.style.width = 130;
            left.style.flexShrink = 0;
            left.style.alignItems = Align.Center;
            left.style.justifyContent = Justify.FlexEnd;
            left.style.paddingBottom = 6;

            var homeSuit = ClassTables.Classes[S.Hero.ClassId].HomeSuit;
            var crest = new Label(PhysicalCard.SuitGlyph(homeSuit));
            crest.style.fontSize = 40 * CardView.GlyphScale(homeSuit);
            crest.style.color = Color.Lerp(CardView.SuitColor(homeSuit), Color.white, 0.30f);
            left.Add(crest);

            var staff = Theme.Subtle(ContentText.StaffName(S.Hero.StaffId));
            staff.style.unityTextAlign = TextAnchor.MiddleCenter;
            staff.style.whiteSpace = WhiteSpace.Normal;
            left.Add(staff);

            if (enemy != null && enemy.Shield > 0)
            {
                var row = new VisualElement();
                row.style.flexDirection = FlexDirection.Row;
                row.style.alignItems = Align.Center;
                row.style.marginTop = 6;
                row.Add(Widgets.MiniIcon(Widgets.Icon.Shield, Color.Lerp(Theme.Shield, Color.white, 0.4f), 22));
                var n = new Label(enemy.Shield.ToString());
                n.style.fontSize = 22;
                n.style.unityFontStyleAndWeight = FontStyle.Bold;
                n.style.color = Color.Lerp(Theme.Shield, Color.white, 0.5f);
                n.style.marginLeft = 5;
                row.Add(n);
                left.Add(row);

                var cap = new Label("BLOCK");
                cap.style.fontSize = 9;
                cap.style.letterSpacing = 2;
                cap.style.color = Theme.ParchmentDim;
                left.Add(cap);

                Tips.Attach(left, "your block",
                    "your ♠ plays build block against THIS enemy — it cuts its counterattack " +
                    "and resets when the next duellist steps up.");
            }
            return left;
        }

        /// <summary>Two-step arm for suicidal plays/yields (C1). Disarmed whenever the danger passes.</summary>
        private bool _confirmLethal;

        /// <summary>
        /// The exact-kill invitation (user-ordered): after layout, probe each hand
        /// card with PreviewPlay — nothing selected probes singles; one selected Ace
        /// probes its pairings (and one selected non-Ace probes the Aces) — and set
        /// the breathing gold glow on every card whose play lands EXACTLY on 0.
        /// </summary>
        private void ScheduleKillGlow(VisualElement host)
        {
            if (S.Encounter?.Current == null || S.Deck.Hand.Count == 0 || S.Deck.Hand.Count > 9) return;
            var hand = S.Deck.Hand.ToList();
            host.schedule.Execute(() =>
            {
                if (S?.Encounter?.Current == null) return;
                foreach (int id in hand)
                {
                    if (!S.Deck.Hand.Contains(id)) continue;
                    List<int> probe = null;
                    if (_sel.Count == 0)
                    {
                        probe = new List<int> { id };
                    }
                    else if (_sel.Count == 1)
                    {
                        int selId = _sel.First();
                        if (selId == id) continue;
                        bool selAce = S.Cards.Get(selId).EffectiveFace().Rank == Rank.Ace;
                        bool idAce = S.Cards.Get(id).EffectiveFace().Rank == Rank.Ace;
                        if (selAce && !idAce) probe = new List<int> { selId, id };
                        else if (!selAce && idAce) probe = new List<int> { id, selId };
                        else continue;
                    }
                    else
                    {
                        break; // multi-card selections are judged by the status line
                    }

                    var p = _session.PreviewPlay(probe);
                    if (p.Legal && p.Outcome == KillKind.Exact)
                    {
                        var el = _root.Q<VisualElement>("card-" + id);
                        if (el != null && el.panel != null) CardView.MarkKillGlow(el, true);
                    }
                }
            }).ExecuteLater(25);
        }

        // Large-card footprint (CardView.Size.Large) and the queue fan step.
        private const float EnemyCardW = 150f;
        private const float EnemyCardH = 210f;
        private const float QueueStep = 16f;

        /// <summary>
        /// The enemy zone: upcoming duellists stacked greyed BEHIND the current
        /// card (a visible queue), with diegetic readouts instead of a stats box —
        /// HP bar under the card, an intent plaque hanging at its right, a shield
        /// chip on its left edge, and a slashed-suit immunity badge on its corner.
        /// </summary>
        private VisualElement EnemyZone(EncounterState enc, EnemyState enemy)
        {
            var zone = new VisualElement();
            zone.style.flexGrow = 1;
            zone.style.alignItems = Align.Center;
            zone.style.justifyContent = Justify.Center;

            if (enemy == null) return zone;

            // Flavor caption in small caps above the stack.
            string flavor = enemy.Tier.ToString().ToUpperInvariant() +
                            (enc.Enemies.Count > 1
                                ? $" · DUEL {enc.CurrentIndex + 1} OF {enc.Enemies.Count}"
                                : "");
            var caption = new Label(flavor);
            caption.style.color = Theme.ParchmentDim;
            caption.style.fontSize = 11;
            caption.style.letterSpacing = 2;
            caption.style.marginBottom = 8;
            zone.Add(caption);

            var upcoming = enc.Enemies
                .Where((e, i) => i > enc.CurrentIndex && e.Alive)
                .ToList();
            bool scouted = S.HasRelic("scout_ahead");

            // The stack: back-to-front so the current card draws on top.
            var stack = new VisualElement();
            stack.style.width = EnemyCardW + upcoming.Count * QueueStep;
            stack.style.height = EnemyCardH + upcoming.Count * QueueStep;

            for (int j = upcoming.Count - 1; j >= 0; j--)
            {
                VisualElement waiting;
                if (scouted)
                {
                    waiting = CardView.Face(upcoming[j].Face, CardView.Size.Large);
                }
                else if (enc.IsGate)
                {
                    // The gate roster is public knowledge (all four royals of the
                    // rank) — show WHO waits, in suit, without the full face (C12).
                    waiting = CardView.Back(CardView.Size.Large);
                    var suitPeek = new Label(PhysicalCard.SuitGlyph(upcoming[j].Suit));
                    suitPeek.pickingMode = PickingMode.Ignore;
                    suitPeek.style.position = Position.Absolute;
                    suitPeek.style.left = 0; suitPeek.style.right = 0;
                    suitPeek.style.top = 0; suitPeek.style.bottom = 0;
                    suitPeek.style.unityTextAlign = TextAnchor.MiddleCenter;
                    suitPeek.style.fontSize = 44 * CardView.GlyphScale(upcoming[j].Suit);
                    suitPeek.style.color = Color.Lerp(CardView.SuitColor(upcoming[j].Suit), Color.white, 0.35f);
                    waiting.Add(suitPeek);
                }
                else
                {
                    waiting = CardView.Back(CardView.Size.Large);
                }
                waiting.pickingMode = PickingMode.Ignore;
                waiting.style.position = Position.Absolute;
                waiting.style.left = (j + 1) * QueueStep;
                waiting.style.top = (upcoming.Count - (j + 1)) * QueueStep;
                waiting.style.scale = new Scale(Vector3.one * (1f - 0.07f * (j + 1)));
                waiting.style.opacity = 0.5f;

                // A night shroud so the queue reads as waiting, not fighting.
                var shroud = new VisualElement();
                shroud.pickingMode = PickingMode.Ignore;
                shroud.style.position = Position.Absolute;
                shroud.style.left = 0; shroud.style.right = 0;
                shroud.style.top = 0; shroud.style.bottom = 0;
                shroud.style.backgroundColor = new Color(Theme.Night.r, Theme.Night.g, Theme.Night.b, 0.45f);
                Theme.SetRadius(shroud, 12);
                waiting.Add(shroud);

                stack.Add(waiting);
            }

            var enemyCard = CardView.Face(enemy.Face, CardView.Size.Large);
            enemyCard.name = "fx-enemy"; // FX hook: damage floats, shakes and lunges anchor here
            enemyCard.style.position = Position.Absolute;
            enemyCard.style.left = 0;
            enemyCard.style.top = upcoming.Count * QueueStep;
            AttachReadouts(enemyCard, enemy);
            stack.Add(enemyCard);
            zone.Add(stack);

            // HP directly under the current card, exactly its width — no frame box.
            var hp = Theme.Bar(enemy.MaxHp > 0 ? enemy.Hp / (float)enemy.MaxHp : 0f,
                $"{enemy.Hp} / {enemy.MaxHp}", Theme.RedBright, EnemyCardW, 14);
            hp.style.marginTop = 6;
            // Centre it under the current card, not under the whole stack.
            hp.style.translate = new Translate(-(upcoming.Count * QueueStep) / 2f, 0);
            Tips.Attach(hp, "the stakes",
                "land damage EXACTLY on 0 → recruit the card (or stay keep-eligible at a gate). " +
                "Take it below 0 → overkill: the reward is lost" +
                (enc.IsGate ? " and the royal is BANISHED." : "."));
            zone.Add(hp);

            return zone;
        }

        /// <summary>Intent plaque, shield chip and immunity badge, pinned to the card.</summary>
        private static void AttachReadouts(VisualElement card, EnemyState enemy)
        {
            int net = Math.Max(0, enemy.Attack - enemy.Shield);

            // ── attack intent: a plaque hanging off the card's right side ──
            var plaque = new VisualElement();
            plaque.pickingMode = PickingMode.Ignore;
            plaque.style.position = Position.Absolute;
            plaque.style.right = -78;
            plaque.style.top = EnemyCardH / 2f - 32;
            plaque.style.backgroundColor = new Color(Theme.NightDeep.r, Theme.NightDeep.g, Theme.NightDeep.b, 0.94f);
            Theme.SetBorder(plaque, net == 0 ? Theme.Shield : Theme.RedBright, 1.5f);
            Theme.SetRadius(plaque, 10);
            Theme.SetPadding(plaque, 6, 12);
            plaque.style.alignItems = Align.Center;

            if (net == 0)
            {
                plaque.Add(Widgets.MiniIcon(Widgets.Icon.Shield, Theme.Shield, 18));
                var word = new Label("blanked");
                word.style.fontSize = 10;
                word.style.color = Theme.Shield;
                plaque.Add(word);
            }
            else
            {
                if (enemy.Shield > 0)
                {
                    // The base attack, struck through — the shield already ate the rest.
                    var basewrap = new VisualElement();
                    var baseLbl = new Label(enemy.Attack.ToString());
                    baseLbl.style.fontSize = 11;
                    baseLbl.style.color = Theme.Grey;
                    basewrap.Add(baseLbl);
                    var strike = new VisualElement();
                    strike.pickingMode = PickingMode.Ignore;
                    strike.style.position = Position.Absolute;
                    strike.style.left = -2; strike.style.right = -2;
                    strike.style.top = 7; strike.style.height = 1.5f;
                    strike.style.backgroundColor = new Color(Theme.RedBright.r, Theme.RedBright.g, Theme.RedBright.b, 0.85f);
                    basewrap.Add(strike);
                    plaque.Add(basewrap);
                }
                var hitRow = new VisualElement();
                hitRow.style.flexDirection = FlexDirection.Row;
                hitRow.style.alignItems = Align.Center;
                hitRow.Add(Widgets.MiniIcon(Widgets.Icon.Sword, Theme.RedBright, 20));
                var hit = new Label(net.ToString());
                hit.style.fontSize = 24;
                hit.style.unityFontStyleAndWeight = FontStyle.Bold;
                hit.style.color = Theme.RedBright;
                hit.style.marginLeft = 4;
                hitRow.Add(hit);
                plaque.Add(hitRow);
            }
            // The plaque explains itself on hover (picking enabled just for that).
            plaque.pickingMode = PickingMode.Position;
            Tips.Attach(plaque, () => net == 0
                ? ("counterattack — blanked",
                   "your block fully covers this enemy's attack: no payment this turn. Block resets when the next duellist steps up.")
                : ("counterattack",
                   $"after a play that leaves this enemy alive (or a yield), it strikes for attack − your block = {net}. " +
                   "Pay at least that much card value from your hand — or die. No counter after a kill."));
            card.Add(plaque);

            // (The player's block reads on the PLAYER's side of the table now —
            // pinned to the enemy it looked like the NPC's stat.)

            // ── immunity: the suit, slashed, riding the top-right corner ──
            if (enemy.ImmuneSuit is Suit imm)
            {
                var badge = new VisualElement();
                badge.pickingMode = PickingMode.Ignore;
                badge.style.position = Position.Absolute;
                badge.style.top = -14; badge.style.right = -16;
                badge.style.alignItems = Align.Center;

                var disc = new VisualElement();
                disc.style.width = 34; disc.style.height = 34;
                Theme.SetRadius(disc, 17);
                disc.style.backgroundColor = Theme.Parchment;
                Theme.SetBorder(disc, Theme.Ink, 1.5f);
                disc.style.alignItems = Align.Center;
                disc.style.justifyContent = Justify.Center;
                disc.style.overflow = Overflow.Hidden;

                var glyph = new Label(PhysicalCard.SuitGlyph(imm));
                glyph.style.fontSize = 18 * CardView.GlyphScale(imm);
                glyph.style.color = CardView.SuitColor(imm);
                disc.Add(glyph);

                var slash = new VisualElement();
                slash.pickingMode = PickingMode.Ignore;
                slash.style.position = Position.Absolute;
                slash.style.left = -6; slash.style.right = -6;
                slash.style.top = 15; slash.style.height = 3.5f;
                slash.style.backgroundColor = Theme.RedBright;
                slash.style.rotate = new Rotate(-45);
                disc.Add(slash);

                badge.Add(disc);
                var cap = new Label("immune");
                cap.style.fontSize = 8;
                cap.style.color = Theme.ParchmentDim;
                badge.Add(cap);

                badge.pickingMode = PickingMode.Position;
                Tips.Attach(badge, $"immune to {PhysicalCard.SuitGlyph(imm)}",
                    $"this enemy blocks {PhysicalCard.SuitGlyph(imm)}'s POWER — " +
                    "the card's value still counts toward damage. Spells ignore immunity entirely.");
                card.Add(badge);
            }
        }

        /// <summary>Every primed one-shot effect, visible at a glance.</summary>
        private VisualElement ArmedChips()
        {
            var enc = S.Encounter;
            var chips = new List<(string, Color)>();
            if (enc.FirstAttackDouble) chips.Add(("camp: first attack ×2", Theme.Green));
            if (enc.SteadyHandArmed) chips.Add(("steady hand: ♣ double off", Theme.Blue));
            if (enc.KeenEdgeArmed) chips.Add(("keen edge: next attack ×2", Theme.RedBright));
            if (enc.CommitArmed) chips.Add(("commit: +1 card allowed", Theme.Gold));
            if (enc.RallyArmed) chips.Add(("rally: draw before paying", Theme.Blue));
            if (enc.TransfuseArmed) chips.Add(("transfuse: ♥ → shield", Theme.Shield));
            if (enc.AceInHoleArmed) chips.Add(("ace in the hole armed", Theme.Gold));
            if (enc.StockpileArmed) chips.Add(($"stockpile: hand cap {S.MaxHandSize}", Theme.Green));
            if (enc.AttackBank > 0) chips.Add(($"+{enc.AttackBank} banked damage", Theme.RedBright));
            if (enc.VanguardArmed) chips.Add(("vanguard: first counter held", Theme.Shield));
            if (enc.SecondWindArmed) chips.Add(("second wind: counter skipped", Theme.Shield));
            if (enc.AegisArmed) chips.Add(($"aegis: counter -{Tuning.AegisReduction}", Theme.Shield));
            if (enc.UnbindingArmed) chips.Add(("unbinding: immunity off", Theme.Gold));
            if (chips.Count == 0) return null;

            var panel = Panel("Primed");
            var row = Row();
            foreach (var (text, tint) in chips) row.Add(Theme.Chip(text, tint));
            panel.Add(row);
            return panel;
        }

        private VisualElement StaffCombatPanel()
        {
            string staff = S.Hero.StaffId;
            var panel = Panel($"Staff — {ContentText.StaffName(staff)}");
            var rules = Text(ContentText.Staffs[staff].Rules);
            rules.style.fontSize = 11;
            rules.style.color = Theme.ParchmentDim;
            panel.Add(rules);

            // Once-per charges made visible (C7): these passives SPEND per enemy.
            var oncePerEnemy = new[] { "whetstone", "field_dressing", "last_rites", "hold_the_line", "stockpile", "transfuse" };
            if (System.Array.IndexOf(oncePerEnemy, staff) >= 0)
            {
                bool spent = S.Encounter.UsedThisEnemy.Contains(staff);
                var pip = Row();
                pip.style.flexWrap = Wrap.NoWrap;
                var dot = new VisualElement();
                dot.style.width = 8; dot.style.height = 8;
                Theme.SetRadius(dot, 4);
                dot.style.backgroundColor = spent ? Theme.Grey : Theme.GoldBright;
                dot.style.marginRight = 5;
                dot.style.marginTop = 3;
                pip.Add(dot);
                var pipText = Theme.Subtle(spent ? "spent vs this enemy" : "charge ready");
                pipText.style.color = spent ? Theme.Grey : Theme.GoldBright;
                pip.Add(pipText);
                panel.Add(pip);
            }

            if (ContentText.StaffPassive.Contains(staff))
            {
                var passive = Text("(passive — always working)");
                passive.style.fontSize = 10;
                passive.style.color = Theme.Grey;
                panel.Add(passive);
                return panel;
            }

            bool needsTarget = ContentText.StaffNeedsHandTarget.Contains(staff);
            string label = needsTarget
                ? $"Use on selected card{(_sel.Count == 1 ? $" ({PhysicalCard.Pretty(S.Cards.Get(_sel.First()).EffectiveFace())})" : "")}"
                : "Activate";
            // Truthful button (C3): the same query the dispatcher checks.
            string blockedWhy = needsTarget && _sel.Count != 1
                ? "select exactly one hand card"
                : _session.CanActivateStaff(needsTarget ? _sel.First() : 0);
            var activate = Theme.Button(label,
                () => Dispatch(new ActivateStaff(needsTarget ? _sel.First() : 0)),
                Theme.ButtonKind.Primary,
                blockedWhy == null);
            Tips.Attach(activate, ContentText.StaffName(staff), ContentText.Staffs[staff].Rules);
            panel.Add(activate);
            if (blockedWhy != null)
            {
                var why = Theme.Subtle(blockedWhy);
                why.style.color = Theme.Grey;
                why.style.fontSize = 10;
                panel.Add(why);
            }
            return panel;
        }

        private VisualElement GauntletCombatPanel()
        {
            var panel = Panel("Gauntlet");
            var row = Row();
            row.style.justifyContent = Justify.Center;
            foreach (Suit suit in new[] { Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades })
            {
                Suit captured = suit;
                int tier = S.GauntletTiers[(int)suit];
                bool spent = S.Encounter.CastSuits.Contains(suit);
                row.Add(Widgets.Crystal(suit, tier,
                    castable: _session.CanCastSpell(suit) == null, // truthful socket (C3)
                    spent: spent,
                    onCast: () => Dispatch(new CastSpell(captured))));
            }
            panel.Add(row);
            var note = new Label("one cast per suit per combat — casting empties the slot");
            note.style.fontSize = 9;
            note.style.color = Theme.Grey;
            panel.Add(note);
            return panel;
        }

        private VisualElement RelicCombatPanel()
        {
            var actives = S.EquippedRelics
                .Where(id => id != null && ContentText.RelicActives.ContainsKey(id))
                .ToList();
            var panel = Panel("Relics");
            if (actives.Count == 0)
            {
                var none = Text("(no activated relics equipped)");
                none.style.fontSize = 10;
                none.style.color = Theme.Grey;
                panel.Add(none);
                return panel;
            }
            foreach (string id in actives)
            {
                string captured = id;
                var target = ContentText.RelicActives[id];
                // Truthful buttons (C3): a relic Core would reject greys out with why.
                string blockedWhy = _session.CanUseRelic(captured);
                bool usable = blockedWhy == null;
                Button button = null;
                switch (target)
                {
                    case ContentText.RelicTarget.None:
                        button = Btn(RelicTables.Get(id).Name, () => Dispatch(new UseRelic(captured)), usable);
                        break;
                    case ContentText.RelicTarget.OneHandCard:
                        button = Btn($"{RelicTables.Get(id).Name} (selected card)",
                            () => Dispatch(new UseRelic(captured, _sel.First())), usable && _sel.Count == 1);
                        if (usable && _sel.Count != 1) blockedWhy = "select exactly one hand card";
                        break;
                    case ContentText.RelicTarget.HandCards:
                        button = Btn($"{RelicTables.Get(id).Name} (selected cards)",
                            () => Dispatch(new UseRelic(captured, _sel.ToArray())), usable && _sel.Count > 0);
                        if (usable && _sel.Count == 0) blockedWhy = "select the cards to spend";
                        break;
                    case ContentText.RelicTarget.DiscardCard:
                        button = Btn($"{RelicTables.Get(id).Name}…",
                            () => OpenPicker("Replay which discard?", S.Deck.Discard.ToList(), CardLabel,
                                pick => Dispatch(new UseRelic(captured, pick))),
                            usable && S.Deck.Discard.Count > 0);
                        if (usable && S.Deck.Discard.Count == 0) blockedWhy = "the discard is empty";
                        break;
                    case ContentText.RelicTarget.TavernCard:
                        button = Btn($"{RelicTables.Get(id).Name}…",
                            () => OpenPicker("Pull which Tavern card?", S.Deck.Tavern.ToList(), CardLabel,
                                pick => Dispatch(new UseRelic(captured, pick))),
                            usable && S.Deck.Tavern.Count > 0);
                        if (usable && S.Deck.Tavern.Count == 0) blockedWhy = "the deck is empty";
                        break;
                }
                if (button != null)
                {
                    Tips.Attach(button, RelicTables.Get(id).Name, ContentText.RelicRules[id]);
                    panel.Add(button);
                }
                if (blockedWhy != null)
                {
                    var why = Theme.Subtle(blockedWhy);
                    why.style.color = Theme.Grey;
                    why.style.fontSize = 10;
                    panel.Add(why);
                }
                var rules = Text(ContentText.RelicRules[id]);
                rules.style.fontSize = 10;
                rules.style.color = Theme.ParchmentDim;
                rules.style.marginBottom = 6;
                panel.Add(rules);
            }
            return panel;
        }
    }
}
