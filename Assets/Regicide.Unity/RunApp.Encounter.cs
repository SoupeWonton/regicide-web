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

            // ── bottom: the player's table ──
            var table = new VisualElement();
            table.style.flexShrink = 0;

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
                table.Add(payRow);

                table.Add(HandStrip(true));

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
                    payActions.Add(Theme.Button("Cast Brace ♠",
                        () => Dispatch(new CastSpell(Suit.Spades)), Theme.ButtonKind.Danger));
                table.Add(payActions);
            }
            else if (pending != null && pending.Kind == PendingChoiceKind.DebtDiscard)
            {
                // ── the debt instalment, INLINE: pick exactly one card ──
                var debtRow = Row();
                debtRow.style.justifyContent = Justify.Center;
                debtRow.Add(Theme.Subtle("the debt comes due — discard one card"));
                table.Add(debtRow);

                table.Add(HandStrip(true));

                var debtActions = Row();
                debtActions.style.justifyContent = Justify.Center;
                debtActions.style.marginTop = 4;
                debtActions.Add(BtnPrimary("Pay the instalment",
                    () => Dispatch(new DefendDiscard(_sel.ToList())), _sel.Count == 1));
                table.Add(debtActions);
            }
            else
            {
                // ── the normal turn: live legality BEFORE the click (ValidatePlay) ──
                string invalid = _sel.Count > 0 ? _session.ValidatePlay(_sel.ToList()) : null;

                var status = Row();
                status.style.justifyContent = Justify.Center;
                int selValue = _sel.Sum(id => S.Cards.Get(id).EffectiveValue());
                if (_sel.Count > 0)
                {
                    var line = Theme.Subtle(invalid == null
                        ? $"value {selValue} — legal play"
                        : "! " + invalid);
                    line.style.color = invalid == null ? Theme.Green : Theme.RedBright;
                    line.style.fontSize = 12;
                    status.Add(line);
                }
                else
                {
                    status.Add(Theme.Subtle("1 card · an Ace + one card · a same-rank set up to 10 — or yield"));
                }
                table.Add(status);

                table.Add(HandStrip(true));

                var actions = Row();
                actions.style.justifyContent = Justify.Center;
                actions.style.marginTop = 4;
                actions.Add(BtnPrimary($"Play selected ({_sel.Count})",
                    () => Dispatch(new PlayCards(_sel.ToList())), _sel.Count > 0 && invalid == null));
                actions.Add(Btn("Yield", () => Dispatch(new Yield())));
                table.Add(actions);
            }

            var foot = Row();
            foot.style.flexWrap = Wrap.NoWrap;
            foot.style.justifyContent = Justify.Center;
            foot.style.marginTop = 2;
            foot.Add(EventLog());
            table.Add(foot);

            screen.Add(table);
            return screen;
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
                var waiting = scouted
                    ? CardView.Face(upcoming[j].Face, CardView.Size.Large)
                    : CardView.Back(CardView.Size.Large);
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
            card.Add(plaque);

            // ── shield: a blue chip on the card's left edge ──
            if (enemy.Shield > 0)
            {
                var sh = new VisualElement();
                sh.style.flexDirection = FlexDirection.Row;
                sh.style.alignItems = Align.Center;
                sh.style.backgroundColor = new Color(Theme.Shield.r, Theme.Shield.g, Theme.Shield.b, 0.25f);
                Theme.SetBorder(sh, new Color(Theme.Shield.r, Theme.Shield.g, Theme.Shield.b, 0.8f), 1);
                Theme.SetRadius(sh, 10);
                Theme.SetPadding(sh, 2, 6);
                sh.Add(Widgets.MiniIcon(Widgets.Icon.Shield, Color.Lerp(Theme.Shield, Color.white, 0.5f), 13));
                var shN = new Label(enemy.Shield.ToString());
                shN.style.fontSize = 12;
                shN.style.marginLeft = 3;
                shN.style.color = Color.Lerp(Theme.Shield, Color.white, 0.55f);
                sh.Add(shN);
                sh.style.position = Position.Absolute;
                sh.style.left = -26;
                sh.style.top = EnemyCardH / 2f - 10;
                sh.pickingMode = PickingMode.Ignore;
                card.Add(sh);
            }

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
            panel.Add(Theme.Button(label,
                () => Dispatch(new ActivateStaff(needsTarget ? _sel.First() : 0)),
                Theme.ButtonKind.Primary,
                !needsTarget || _sel.Count == 1));
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
                    castable: tier != SpellTables.TierEmpty && !spent,
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
                Button button = null;
                switch (target)
                {
                    case ContentText.RelicTarget.None:
                        button = Btn(RelicTables.Get(id).Name, () => Dispatch(new UseRelic(captured)));
                        break;
                    case ContentText.RelicTarget.OneHandCard:
                        button = Btn($"{RelicTables.Get(id).Name} (selected card)",
                            () => Dispatch(new UseRelic(captured, _sel.First())), _sel.Count == 1);
                        break;
                    case ContentText.RelicTarget.HandCards:
                        button = Btn($"{RelicTables.Get(id).Name} (selected cards)",
                            () => Dispatch(new UseRelic(captured, _sel.ToArray())), _sel.Count > 0);
                        break;
                    case ContentText.RelicTarget.DiscardCard:
                        button = Btn($"{RelicTables.Get(id).Name}…",
                            () => OpenPicker("Replay which discard?", S.Deck.Discard.ToList(), CardLabel,
                                pick => Dispatch(new UseRelic(captured, pick))),
                            S.Deck.Discard.Count > 0);
                        break;
                    case ContentText.RelicTarget.TavernCard:
                        button = Btn($"{RelicTables.Get(id).Name}…",
                            () => OpenPicker("Pull which Tavern card?", S.Deck.Tavern.ToList(), CardLabel,
                                pick => Dispatch(new UseRelic(captured, pick))),
                            S.Deck.Tavern.Count > 0);
                        break;
                }
                if (button != null) panel.Add(button);
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
