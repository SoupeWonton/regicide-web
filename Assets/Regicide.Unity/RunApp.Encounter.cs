using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;
using Regicide.Core;

namespace Regicide.Unity
{
    public partial class RunApp
    {
        // ── encounter screen (§16) ──────────────────────────────────────────────

        private VisualElement BuildEncounter()
        {
            var v = new ScrollView();
            var enc = S.Encounter;
            var enemy = enc.Current;

            string gate = enc.IsGate ? $"  👑 {PhysicalCard.RankGlyph(enc.GateRank)} GATE" : "";
            v.Add(Head($"Encounter — chapter {S.Chapter}{gate}   " +
                       $"({enc.Enemies.Count(e => !e.Alive)}/{enc.Enemies.Count} down)"));

            var enemyPanel = Panel("Enemy");
            if (enemy != null)
            {
                enemyPanel.Add(Head($"{PhysicalCard.Pretty(enemy.Face)}   {enemy.Hp}/{enemy.MaxHp} hp"));
                enemyPanel.Add(Text($"Attack {enemy.Attack} · Shield {enemy.Shield} · " +
                                    $"Immune to {(enemy.ImmuneSuit != null ? PhysicalCard.SuitGlyph(enemy.ImmuneSuit.Value) : "nothing")}" +
                                    $" · {enemy.Tier}"));
                if (S.HasRelic("scout_ahead"))
                {
                    var lineup = string.Join("  →  ", enc.Enemies.Select(e =>
                        (e.Alive ? "" : "✝ ") + PhysicalCard.Pretty(e.Face) +
                        $" (immune {PhysicalCard.SuitGlyph(e.Suit)})"));
                    enemyPanel.Add(Text("Scouted lineup: " + lineup));
                }
            }
            v.Add(enemyPanel);

            var handPanel = Panel("Hand — select cards, then play");
            handPanel.Add(HandStrip(true));
            int selValue = _sel.Sum(id => S.Cards.Get(id).EffectiveValue());
            var actions = Row();
            actions.Add(Btn($"Play selected ({_sel.Count} card(s), value {selValue})",
                () => Dispatch(new PlayCards(_sel.ToList())), _sel.Count > 0));
            actions.Add(Btn("Yield (take the counterattack)", () => Dispatch(new Yield())));
            handPanel.Add(actions);
            handPanel.Add(DeckCounts());
            v.Add(handPanel);

            v.Add(StaffCombatPanel());
            v.Add(GauntletCombatPanel());
            v.Add(RelicCombatPanel());
            v.Add(EventLog());
            return v;
        }

        private VisualElement StaffCombatPanel()
        {
            string staff = S.Hero.StaffId;
            var panel = Panel($"Staff — {ContentText.StaffName(staff)}");
            panel.Add(Text(ContentText.Staffs[staff].Rules));
            if (ContentText.StaffPassive.Contains(staff))
            {
                panel.Add(Text("(passive — always working)"));
                return panel;
            }
            bool needsTarget = ContentText.StaffNeedsHandTarget.Contains(staff);
            string label = needsTarget
                ? $"Use on selected card{(_sel.Count == 1 ? $" ({CardLabel(_sel.First())})" : "")}"
                : "Activate";
            panel.Add(Btn(label,
                () => Dispatch(new ActivateStaff(needsTarget ? _sel.First() : 0)),
                !needsTarget || _sel.Count == 1));
            return panel;
        }

        private VisualElement GauntletCombatPanel()
        {
            var panel = Panel("Gauntlet — one cast per suit per combat; casting empties the slot");
            var row = Row();
            foreach (Suit suit in new[] { Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades })
            {
                Suit captured = suit;
                int tier = S.GauntletTiers[(int)suit];
                if (tier == SpellTables.TierEmpty)
                {
                    row.Add(Text($"{PhysicalCard.SuitGlyph(suit)} —   "));
                    continue;
                }
                bool spent = S.Encounter.CastSuits.Contains(suit);
                row.Add(Btn($"Cast {SpellTables.Name(suit, tier)} {PhysicalCard.SuitGlyph(suit)}",
                    () => Dispatch(new CastSpell(captured)), !spent));
            }
            panel.Add(row);
            return panel;
        }

        private VisualElement RelicCombatPanel()
        {
            var actives = S.EquippedRelics
                .Where(id => id != null && ContentText.RelicActives.ContainsKey(id))
                .ToList();
            var panel = Panel("Relic actions");
            if (actives.Count == 0)
            {
                panel.Add(Text("(no activated relics equipped)"));
                return panel;
            }
            foreach (string id in actives)
            {
                string captured = id;
                var row = Row();
                var target = ContentText.RelicActives[id];
                switch (target)
                {
                    case ContentText.RelicTarget.None:
                        row.Add(Btn(RelicTables.Get(id).Name, () => Dispatch(new UseRelic(captured))));
                        break;
                    case ContentText.RelicTarget.OneHandCard:
                        row.Add(Btn($"{RelicTables.Get(id).Name} (selected card)",
                            () => Dispatch(new UseRelic(captured, _sel.First())), _sel.Count == 1));
                        break;
                    case ContentText.RelicTarget.HandCards:
                        row.Add(Btn($"{RelicTables.Get(id).Name} (selected cards)",
                            () => Dispatch(new UseRelic(captured, _sel.ToArray())), _sel.Count > 0));
                        break;
                    case ContentText.RelicTarget.DiscardCard:
                        row.Add(Btn($"{RelicTables.Get(id).Name}…",
                            () => OpenPicker("Replay which discard?", S.Deck.Discard.ToList(), CardLabel,
                                pick => Dispatch(new UseRelic(captured, pick))),
                            S.Deck.Discard.Count > 0));
                        break;
                    case ContentText.RelicTarget.TavernCard:
                        row.Add(Btn($"{RelicTables.Get(id).Name}…",
                            () => OpenPicker("Pull which Tavern card?", S.Deck.Tavern.ToList(), CardLabel,
                                pick => Dispatch(new UseRelic(captured, pick))),
                            S.Deck.Tavern.Count > 0));
                        break;
                }
                row.Add(Text(ContentText.RelicRules[id]));
                panel.Add(row);
            }
            return panel;
        }
    }
}
