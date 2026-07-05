using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;
using Regicide.Core;

namespace Regicide.Unity
{
    public partial class RunApp
    {
        // ── road screen (§16): node graph, hand, bracelet, landmark panels ──────

        private VisualElement BuildRoad()
        {
            var v = new ScrollView();
            v.Add(Head($"Chapter {S.Chapter} — Continent {S.Continent}, Province {S.Province}" +
                       $"   ·   {ContentText.ClassName(S.Hero.ClassId)} / {ContentText.StaffName(S.Hero.StaffId)}" +
                       (S.Hero.PathC2 != null ? $"   ·   rung: {S.Hero.PathC2}" : "")));

            v.Add(MapPanel());

            var here = S.Map.Current;
            if (here.Kind == RoadNodeKind.Forge) v.Add(ForgePanel());
            if (S.CaravanOffer != null) v.Add(CaravanPanel());
            if (S.StaffOffer != null) v.Add(HeroesPanel());
            if (S.SanctumCharge) v.Add(SanctumPanel());

            var handPanel = Panel("Hand");
            handPanel.Add(HandStrip(true));
            handPanel.Add(DeckCounts());
            v.Add(handPanel);

            v.Add(BraceletPanel());
            v.Add(RelicPanel());
            v.Add(EventLog());
            return v;
        }

        private VisualElement MapPanel()
        {
            var panel = Panel("The road (one-way — ? until scouted)");
            var current = S.Map.Current;
            foreach (var layer in S.Map.Nodes.GroupBy(n => n.Layer).OrderBy(g => g.Key))
            {
                var row = Row();
                foreach (var node in layer)
                {
                    int captured = node.Id;
                    bool reachable = current.Next.Contains(node.Id);
                    string label = node.Known ? ContentText.NodeLabel(node.Kind) : "?";
                    if (node.Id == current.Id) label = "▶ " + label;
                    var b = Btn(label, () => Dispatch(new MoveToNode(captured)), reachable);
                    if (node.Visited)
                        b.style.backgroundColor = new StyleColor(new Color(0.2f, 0.2f, 0.24f));
                    if (reachable)
                        b.style.backgroundColor = new StyleColor(new Color(0.24f, 0.34f, 0.44f));
                    row.Add(b);
                }
                panel.Add(row);
            }
            return panel;
        }

        // ── the bracelet (§7): arm pool tokens into empty suit slots ────────────

        private VisualElement BraceletPanel()
        {
            var panel = Panel($"Bracelet — gauntlet crystals   (pool: {S.TokenFragments} fragment(s), {S.TokenHalves} half(s))");
            foreach (Suit suit in new[] { Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades })
            {
                Suit captured = suit;
                int tier = S.GauntletTiers[(int)suit];
                var row = Row();
                string slotText = tier == SpellTables.TierEmpty
                    ? "empty"
                    : $"{SpellTables.Name(suit, tier)} ({(tier == SpellTables.TierHalf ? "Half" : "Fragment")})";
                row.Add(Text($"{PhysicalCard.SuitGlyph(suit)}  {slotText}   "));
                if (tier == SpellTables.TierEmpty)
                {
                    row.Add(Btn("Arm Fragment",
                        () => Dispatch(new ArmCrystal(captured, SpellTables.TierFragment)),
                        S.TokenFragments > 0));
                    row.Add(Btn("Arm Half",
                        () => Dispatch(new ArmCrystal(captured, SpellTables.TierHalf)),
                        S.TokenHalves > 0));
                }
                else
                {
                    row.Add(Text("· " + ContentText.SpellRules(suit, tier)));
                }
                panel.Add(row);
            }
            return panel;
        }

        // ── relic bag & slots (§8) ──────────────────────────────────────────────

        private VisualElement RelicPanel()
        {
            var panel = Panel("Relics — Staff + four slots (swaps free outside combat)");
            foreach (RelicSlot slot in new[] { RelicSlot.Hat, RelicSlot.Amulet, RelicSlot.Ring, RelicSlot.Cloak })
            {
                string id = S.EquippedRelics[(int)slot];
                panel.Add(Text($"{slot}: " + (id != null
                    ? $"{RelicTables.Get(id).Name} — {ContentText.RelicRules[id]}"
                    : "(empty)")));
            }
            if (S.RelicBag.Count > 0)
            {
                panel.Add(Text("Bag:"));
                var row = Row();
                foreach (string id in S.RelicBag.ToList())
                {
                    string captured = id;
                    row.Add(Btn($"Equip {RelicTables.Get(id).Name} ({RelicTables.Get(id).Slot})",
                        () => Dispatch(new EquipRelic(captured)),
                        S.Phase != CampaignPhase.Encounter));
                }
                panel.Add(row);
            }
            return panel;
        }

        // ── landmark panels (§7, §8, §9, §10) ───────────────────────────────────

        private VisualElement ForgePanel()
        {
            var panel = Panel("🔥 The Forge");
            panel.Add(Text($"Convert {Tuning.FragmentsPerHalf} fragments → 1 Half. Repeatable while standing here."));
            panel.Add(Btn("Forge a Half", () => Dispatch(new ForgeConvert()),
                S.TokenFragments >= Tuning.FragmentsPerHalf));
            return panel;
        }

        private VisualElement CaravanPanel()
        {
            string id = S.CaravanOffer;
            int cost = Tuning.CaravanCost -
                       (S.HasRelic("caravan_coin") ? Tuning.CaravanCoinDiscount : 0);
            var panel = Panel("🛒 The Caravan");
            panel.Add(Text($"{RelicTables.Get(id).Name} — {ContentText.RelicRules[id]}"));
            int paying = _sel.Sum(cid => S.Cards.Get(cid).EffectiveValue());
            panel.Add(Text($"Price: {cost} card-value from hand. Selected: {paying}."));
            panel.Add(Btn($"Pay {paying} and buy", () => Dispatch(new BuyRelic(_sel.ToList())), paying >= cost));
            return panel;
        }

        private VisualElement HeroesPanel()
        {
            var panel = Panel("🕯 Fallen Heroes — swap your Staff (free, repeatable here)");
            panel.Add(Text($"Current: {ContentText.StaffName(S.Hero.StaffId)}"));
            foreach (string staffId in S.StaffOffer)
            {
                string captured = staffId;
                var row = Row();
                row.Add(Btn($"Take {ContentText.StaffName(staffId)}",
                    () => Dispatch(new SwapStaff(captured)), staffId != S.Hero.StaffId));
                row.Add(Text(ContentText.Staffs.TryGetValue(staffId, out var e) ? e.Rules : ""));
                panel.Add(row);
            }
            return panel;
        }

        private VisualElement SanctumPanel()
        {
            var panel = Panel("✦ The Sanctum — move one graft between cards (once per visit)");
            var grafted = S.OwnedCards.Where(id => S.Cards.Get(id).Grafts.Count > 0).ToList();
            if (grafted.Count == 0)
            {
                panel.Add(Text("No grafted cards yet — nothing to rearrange."));
                return panel;
            }
            panel.Add(Btn("Rearrange a graft…", () =>
                OpenPicker("Move a graft FROM which card?", grafted, CardLabel, fromId =>
                {
                    var from = S.Cards.Get(fromId);
                    var seqs = from.Grafts.Select(g => g.Seq).ToList();
                    OpenPicker("Which graft?", seqs,
                        seq =>
                        {
                            var g = from.Grafts.First(x => x.Seq == seq);
                            return g.Kind == GraftKind.Rank
                                ? $"rank → {PhysicalCard.RankGlyph(g.ToRank)} ({g.Source})"
                                : $"{g.Kind} → {PhysicalCard.SuitGlyph(g.ToSuit)} ({g.Source})";
                        },
                        seq =>
                        {
                            var targets = S.OwnedCards.Where(id => id != fromId).ToList();
                            OpenPicker("Move it TO which card?", targets, CardLabel,
                                toId => Dispatch(new RearrangeGraft(fromId, seq, toId)));
                        });
                })));
            return panel;
        }
    }
}
