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

            // ── top bar ──
            var top = Row();
            top.Add(Theme.Chip($"Chapter {S.Chapter}", Theme.Gold));
            top.Add(Theme.Chip($"Continent {S.Continent} · Province {S.Province}"));
            if (enc.IsGate)
                top.Add(Theme.Chip($"♛ {PhysicalCard.RankGlyph(enc.GateRank)} GATE", Theme.GoldBright));
            top.Add(Theme.Chip($"{enc.Enemies.Count(e => !e.Alive)}/{enc.Enemies.Count} down",
                enc.Enemies.Count > 1 ? Theme.RedDeep : Theme.Grey));
            var counts = DeckCounts();
            counts.style.marginLeft = 12;
            top.Add(counts);
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

            var rightRail = new VisualElement();
            rightRail.style.width = 280;
            rightRail.style.flexShrink = 0;
            rightRail.Add(EventLog());
            arena.Add(rightRail);

            screen.Add(arena);

            // ── bottom: the player's table ──
            var table = new VisualElement();
            table.style.flexShrink = 0;

            var status = Row();
            status.style.justifyContent = Justify.Center;
            int selValue = _sel.Sum(id => S.Cards.Get(id).EffectiveValue());
            if (_sel.Count > 0)
                status.Add(Theme.Chip($"selected {_sel.Count} card(s) · value {selValue}", Theme.GoldBright));
            else
            {
                var hint = new Label("select cards, then play — or yield and take the counterattack");
                hint.style.fontSize = 11;
                hint.style.color = Theme.Grey;
                status.Add(hint);
            }
            table.Add(status);

            table.Add(HandStrip(true));

            var actions = Row();
            actions.style.justifyContent = Justify.Center;
            actions.style.marginTop = 4;
            actions.Add(BtnPrimary($"Play selected ({_sel.Count})",
                () => Dispatch(new PlayCards(_sel.ToList())), _sel.Count > 0));
            actions.Add(Btn("Yield", () => Dispatch(new Yield())));
            table.Add(actions);

            screen.Add(table);
            return screen;
        }

        /// <summary>The enemy as a big card with HP/intent, plus the duel queue.</summary>
        private VisualElement EnemyZone(EncounterState enc, EnemyState enemy)
        {
            var zone = new VisualElement();
            zone.style.flexGrow = 1;
            zone.style.alignItems = Align.Center;
            zone.style.justifyContent = Justify.Center;

            if (enemy == null) return zone;

            if (enc.Enemies.Count > 1)
            {
                var caption = new Label($"duel {enc.CurrentIndex + 1} of {enc.Enemies.Count} — {enemy.Tier}");
                caption.style.color = Theme.ParchmentDim;
                caption.style.fontSize = 12;
                caption.style.marginBottom = 4;
                zone.Add(caption);
            }
            else
            {
                var caption = new Label(enemy.Tier.ToString());
                caption.style.color = Theme.Grey;
                caption.style.fontSize = 12;
                caption.style.marginBottom = 4;
                zone.Add(caption);
            }

            var enemyCard = CardView.Face(enemy.Face, CardView.Size.Large);
            enemyCard.name = "fx-enemy"; // FX hook: damage floats and shakes anchor here
            zone.Add(enemyCard);

            var stats = Widgets.EnemyStatus(enemy);
            stats.style.marginTop = 8;
            zone.Add(stats);

            // The queue: fallen royals greyed, the rest scouted or face-down (§8 Scout Ahead).
            var upcoming = enc.Enemies
                .Select((e, i) => (e, i))
                .Where(t => t.i > enc.CurrentIndex)
                .ToList();
            if (upcoming.Count > 0)
            {
                bool scouted = S.HasRelic("scout_ahead");
                var queueTitle = new Label(scouted ? "scouted — waiting in line" : "waiting in line");
                queueTitle.style.fontSize = 10;
                queueTitle.style.color = Theme.Grey;
                queueTitle.style.marginTop = 12;
                zone.Add(queueTitle);

                var queue = Row();
                queue.style.justifyContent = Justify.Center;
                foreach (var (e, _) in upcoming)
                {
                    if (scouted)
                    {
                        var wrap = new VisualElement();
                        wrap.style.alignItems = Align.Center;
                        wrap.Add(CardView.Face(e.Face, CardView.Size.Small));
                        var imm = new Label($"immune {PhysicalCard.SuitGlyph(e.Suit)}");
                        imm.style.fontSize = 9;
                        imm.style.color = Theme.Grey;
                        wrap.Add(imm);
                        queue.Add(wrap);
                    }
                    else
                    {
                        queue.Add(CardView.Back(CardView.Size.Small));
                    }
                }
                zone.Add(queue);
            }
            return zone;
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
            if (enc.AegisArmed) chips.Add(($"aegis: counter −{Tuning.AegisReduction}", Theme.Shield));
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
