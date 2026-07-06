using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;
using Regicide.Core;

namespace Regicide.Unity
{
    public partial class RunApp
    {
        // ── road screen (§16): the StS-style map, side panels, hand fan ─────────

        private VisualElement BuildRoad()
        {
            var v = new VisualElement();
            v.style.flexGrow = 1;
            Theme.SetPadding(v, 8, 12);

            v.Add(RoadTopBar());

            var mid = new VisualElement();
            mid.style.flexDirection = FlexDirection.Row;
            mid.style.flexGrow = 1;
            mid.Add(MapPanel());
            mid.Add(RoadSidePanels());
            v.Add(mid);

            // The hand rides along the bottom; selectable only while a payment
            // flow (the caravan) reads the selection.
            bool paying = S.CaravanOffer != null;
            var handWrap = new VisualElement();
            handWrap.style.alignItems = Align.Center;
            if (paying)
            {
                var hint = new Label("Select cards to pay the caravan");
                hint.style.color = Theme.GoldBright;
                hint.style.fontSize = 12;
                handWrap.Add(hint);
            }
            handWrap.Add(HandStrip(paying));
            v.Add(handWrap);
            return v;
        }

        private VisualElement RoadTopBar()
        {
            // One quiet line each side — the map is the star, not the chrome.
            var bar = Row();
            bar.style.flexWrap = Wrap.NoWrap;
            bar.style.justifyContent = Justify.SpaceBetween;
            bar.style.marginBottom = 6;
            string who = $"{ContentText.ClassName(S.Hero.ClassId)} · {ContentText.StaffName(S.Hero.StaffId)}" +
                         (S.Hero.PathC2 != null ? $" · {S.Hero.PathC2} lit" : "") +
                         $"      chapter {S.Chapter} · province {S.Province}";
            bar.Add(Theme.Subtle(who));
            bar.Add(DeckCounts());
            return bar;
        }

        // ── the map: layer columns, node discs, drawn edges ─────────────────────

        private VisualElement MapPanel()
        {
            var frame = Theme.Frame("The Road");
            frame.style.flexGrow = 1;
            frame.style.marginRight = 8;

            var hint = new Label("one-way — ? until scouted");
            hint.style.fontSize = 10;
            hint.style.color = Theme.Grey;
            hint.style.marginBottom = 6;
            frame.Add(hint);

            var scroll = new ScrollView(ScrollViewMode.Horizontal);
            scroll.style.flexGrow = 1;

            // The body holds the layer columns AND the edge canvas drawn over them.
            var body = new VisualElement();
            body.style.flexDirection = FlexDirection.Row;
            body.style.alignItems = Align.Center;
            body.style.flexGrow = 1;
            Theme.SetPadding(body, 14, 14);

            var current = S.Map.Current;
            var discs = new Dictionary<int, VisualElement>();

            foreach (var layer in S.Map.Nodes.GroupBy(n => n.Layer).OrderBy(g => g.Key))
            {
                var column = new VisualElement();
                column.style.justifyContent = Justify.Center;
                column.style.marginRight = 42;
                foreach (var node in layer)
                {
                    int captured = node.Id;
                    bool isCurrent = node.Id == current.Id;
                    bool reachable = current.Next.Contains(node.Id);
                    var disc = Widgets.NodeDisc(node, isCurrent, reachable,
                        () => Dispatch(new MoveToNode(captured)));
                    discs[node.Id] = disc;
                    column.Add(disc);
                }
                body.Add(column);
            }

            var edges = new List<(VisualElement from, VisualElement to, bool lit)>();
            foreach (var node in S.Map.Nodes)
                foreach (int next in node.Next)
                    if (discs.TryGetValue(node.Id, out var from) && discs.TryGetValue(next, out var to))
                        edges.Add((from, to, node.Id == current.Id && current.Next.Contains(next)));
            body.Add(Widgets.EdgeCanvas(edges));

            scroll.Add(body);
            frame.Add(scroll);
            return frame;
        }

        // ── the right rail: whatever this stand offers ──────────────────────────

        private VisualElement RoadSidePanels()
        {
            var rail = new ScrollView();
            rail.style.width = 340;
            rail.style.flexShrink = 0;

            var here = S.Map.Current;
            if (here.Kind == RoadNodeKind.Forge) rail.Add(ForgePanel());
            if (S.CaravanOffer != null) rail.Add(CaravanPanel());
            if (S.StaffOffer != null) rail.Add(HeroesPanel());
            if (S.SanctumCharge) rail.Add(SanctumPanel());

            rail.Add(BraceletPanel());
            rail.Add(RelicPanel());
            rail.Add(EventLog());
            return rail;
        }

        // ── the bracelet (§7): arm pool tokens into empty suit slots ────────────

        private VisualElement BraceletPanel()
        {
            var panel = Theme.Frame("Bracelet — Gauntlet");
            var pool = Row();
            pool.Add(Theme.Chip($"{S.TokenFragments} fragment(s)", Theme.Gold));
            pool.Add(Theme.Chip($"{S.TokenHalves} half(s)", Theme.GoldBright));
            panel.Add(pool);

            var sockets = Row();
            sockets.style.marginTop = 6;
            sockets.style.alignItems = Align.FlexStart;
            foreach (Suit suit in new[] { Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades })
            {
                Suit captured = suit;
                int tier = S.GauntletTiers[(int)suit];
                var col = new VisualElement();
                col.style.alignItems = Align.Center;
                col.style.marginRight = 10;
                col.Add(Widgets.Crystal(suit, tier, false, false, null));
                if (tier == SpellTables.TierEmpty)
                {
                    var frag = Theme.Button("Frag",
                        () => Dispatch(new ArmCrystal(captured, SpellTables.TierFragment)),
                        Theme.ButtonKind.Ghost, S.TokenFragments > 0);
                    frag.style.fontSize = 10;
                    col.Add(frag);
                    var half = Theme.Button("Half",
                        () => Dispatch(new ArmCrystal(captured, SpellTables.TierHalf)),
                        Theme.ButtonKind.Ghost, S.TokenHalves > 0);
                    half.style.fontSize = 10;
                    col.Add(half);
                }
                sockets.Add(col);
            }
            panel.Add(sockets);

            // Rules of whatever is armed, so the next fight can be planned here.
            foreach (Suit suit in new[] { Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades })
            {
                int tier = S.GauntletTiers[(int)suit];
                if (tier == SpellTables.TierEmpty) continue;
                var t = Text($"{PhysicalCard.SuitGlyph(suit)} {SpellTables.Name(suit, tier)} — {ContentText.SpellRules(suit, tier)}");
                t.style.fontSize = 11;
                t.style.color = Theme.ParchmentDim;
                panel.Add(t);
            }
            return panel;
        }

        // ── relic bag & slots (§8) ──────────────────────────────────────────────

        private VisualElement RelicPanel()
        {
            var panel = Theme.Frame("Relics — four slots + Staff");
            foreach (RelicSlot slot in new[] { RelicSlot.Hat, RelicSlot.Amulet, RelicSlot.Ring, RelicSlot.Cloak })
            {
                string id = S.EquippedRelics[(int)slot];
                var entry = new VisualElement();
                entry.style.backgroundColor = Theme.NightDeep;
                Theme.SetBorder(entry, id != null ? Theme.GoldDim : new Color(0.3f, 0.28f, 0.36f), 1);
                Theme.SetRadius(entry, 6);
                Theme.SetPadding(entry, 4, 8);
                entry.style.marginBottom = 4;

                var head = Row();
                var slotLabel = new Label(slot.ToString().ToUpperInvariant());
                slotLabel.style.fontSize = 9;
                slotLabel.style.letterSpacing = 2;
                slotLabel.style.color = Theme.Gold;
                slotLabel.style.marginRight = 6;
                head.Add(slotLabel);
                var name = new Label(id != null ? RelicTables.Get(id).Name : "(empty)");
                name.style.unityFontStyleAndWeight = FontStyle.Bold;
                name.style.color = id != null ? Theme.Parchment : Theme.Grey;
                head.Add(name);
                entry.Add(head);

                if (id != null)
                {
                    var rules = Text(ContentText.RelicRules[id]);
                    rules.style.fontSize = 10;
                    rules.style.color = Theme.ParchmentDim;
                    entry.Add(rules);
                }
                panel.Add(entry);
            }

            if (S.RelicBag.Count > 0)
            {
                panel.Add(Theme.FrameTitle("Bag"));
                foreach (string id in S.RelicBag.ToList())
                {
                    string captured = id;
                    var row = Row();
                    row.Add(Btn($"Equip {RelicTables.Get(id).Name}",
                        () => Dispatch(new EquipRelic(captured)),
                        S.Phase != CampaignPhase.Encounter));
                    row.Add(Theme.Chip(RelicTables.Get(id).Slot.ToString()));
                    panel.Add(row);
                    var rules = Text(ContentText.RelicRules[id]);
                    rules.style.fontSize = 10;
                    rules.style.color = Theme.Grey;
                    panel.Add(rules);
                }
            }
            return panel;
        }

        // ── landmark panels (§7, §8, §9, §10) ───────────────────────────────────

        private VisualElement ForgePanel()
        {
            var panel = Theme.Frame("The Forge");
            Theme.SetBorder(panel, Theme.Gold, 2);
            panel.Add(Text($"Convert {Tuning.FragmentsPerHalf} fragments → 1 Half. Repeatable while standing here."));
            panel.Add(BtnPrimary("Forge a Half", () => Dispatch(new ForgeConvert()),
                S.TokenFragments >= Tuning.FragmentsPerHalf));
            return panel;
        }

        private VisualElement CaravanPanel()
        {
            string id = S.CaravanOffer;
            int cost = Tuning.CaravanCost -
                       (S.HasRelic("caravan_coin") ? Tuning.CaravanCoinDiscount : 0);
            var panel = Theme.Frame("The Caravan");
            Theme.SetBorder(panel, Theme.Gold, 2);

            var head = Row();
            var name = new Label(RelicTables.Get(id).Name);
            name.style.color = Theme.GoldBright;
            name.style.unityFontStyleAndWeight = FontStyle.Bold;
            head.Add(name);
            head.Add(Theme.Chip(RelicTables.Get(id).Slot.ToString(), Theme.Gold));
            panel.Add(head);
            panel.Add(Text(ContentText.RelicRules[id]));

            int paying = _sel.Sum(cid => S.Cards.Get(cid).EffectiveValue());
            panel.Add(Theme.Bar(cost == 0 ? 1f : Mathf.Clamp01(paying / (float)cost),
                $"{paying} / {cost} card-value", paying >= cost ? Theme.Green : Theme.RedDeep, 280));
            panel.Add(BtnPrimary($"Pay {paying} and buy",
                () => Dispatch(new BuyRelic(_sel.ToList())), paying >= cost));
            return panel;
        }

        private VisualElement HeroesPanel()
        {
            var panel = Theme.Frame("Fallen Heroes — swap your Staff");
            panel.Add(Text($"Current: {ContentText.StaffName(S.Hero.StaffId)}  (free, repeatable here)"));
            foreach (string staffId in S.StaffOffer)
            {
                string captured = staffId;
                var entry = new VisualElement();
                entry.style.backgroundColor = Theme.NightDeep;
                Theme.SetBorder(entry, Theme.GoldDim, 1);
                Theme.SetRadius(entry, 6);
                Theme.SetPadding(entry, 4, 8);
                entry.style.marginBottom = 4;

                var row = Row();
                var name = new Label(ContentText.StaffName(staffId));
                name.style.unityFontStyleAndWeight = FontStyle.Bold;
                name.style.color = Theme.GoldPale;
                name.style.marginRight = 6;
                row.Add(name);
                row.Add(Btn("Take", () => Dispatch(new SwapStaff(captured)), staffId != S.Hero.StaffId));
                entry.Add(row);

                var rules = Text(ContentText.Staffs.TryGetValue(staffId, out var e) ? e.Rules : "");
                rules.style.fontSize = 10;
                rules.style.color = Theme.ParchmentDim;
                entry.Add(rules);
                panel.Add(entry);
            }
            return panel;
        }

        private VisualElement SanctumPanel()
        {
            var panel = Theme.Frame("The Sanctum");
            Theme.SetBorder(panel, Theme.Gold, 2);
            panel.Add(Text("Move one graft between cards (once per visit)."));
            var grafted = S.OwnedCards.Where(id => S.Cards.Get(id).Grafts.Count > 0).ToList();
            if (grafted.Count == 0)
            {
                var none = Text("No grafted cards yet — nothing to rearrange.");
                none.style.color = Theme.Grey;
                panel.Add(none);
                return panel;
            }
            panel.Add(BtnPrimary("Rearrange a graft…", () =>
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
