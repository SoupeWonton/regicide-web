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

        /// <summary>Caravan overlay dismissed by "Walk away" — resets when the offer clears.</summary>
        private bool _caravanDismissed;

        private VisualElement BuildRoad()
        {
            if (S.CaravanOffer == null) _caravanDismissed = false;
            bool caravanOpen = S.CaravanOffer != null && !_caravanDismissed;

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

            // The hand rides along the bottom (payment happens inside the caravan
            // overlay now, so the bottom fan is view-only and hides under it).
            if (!caravanOpen)
            {
                var handWrap = new VisualElement();
                handWrap.style.alignItems = Align.Center;

                // Campfire warmth lingers visibly until the next fight spends it (§9).
                if (S.NextFightFirstAttackDouble || S.NextFightStartShield > 0)
                {
                    var parts = new List<string>();
                    if (S.NextFightFirstAttackDouble) parts.Add("first strike ×2");
                    if (S.NextFightStartShield > 0) parts.Add($"+{S.NextFightStartShield} shield next fight");
                    var warmth = Theme.Subtle("campfire warmth — " + string.Join(" · ", parts));
                    warmth.style.color = Theme.Hex("#e09c3f");
                    handWrap.Add(warmth);
                }

                handWrap.Add(HandStrip(false));
                v.Add(handWrap);
            }

            // The merchant draws over everything — a stop, not a side note.
            if (caravanOpen) v.Add(CaravanOverlay());
            return v;
        }

        private VisualElement RoadTopBar()
        {
            // One quiet line each side — the map is the star, not the chrome.
            var bar = Row();
            bar.style.flexWrap = Wrap.NoWrap;
            bar.style.justifyContent = Justify.SpaceBetween;
            bar.style.marginBottom = 6;
            string who = $"run {_runNumber} · {ContentText.ClassName(S.Hero.ClassId)} · {ContentText.StaffName(S.Hero.StaffId)}" +
                         (S.Hero.PathC2 != null ? $" · {S.Hero.PathC2} lit" : "") +
                         $"      chapter {S.Chapter} · province {S.Province}";
            bar.Add(Theme.Subtle(who));
            bar.Add(DeckCounts());
            return bar;
        }

        // ── the map: layer columns, node discs, drawn edges ─────────────────────

        /// <summary>Show-paths toggle: lights every route still reachable from here.</summary>
        private bool _showPaths;

        private VisualElement MapPanel()
        {
            var frame = Theme.Frame("The Road");
            frame.style.flexGrow = 1;
            frame.style.marginRight = 8;

            var header = Row();
            header.style.flexWrap = Wrap.NoWrap;
            header.style.justifyContent = Justify.SpaceBetween;
            header.style.marginBottom = 6;
            var hint = new Label("one-way — ? until scouted");
            hint.style.fontSize = 10;
            hint.style.color = Theme.Grey;
            header.Add(hint);
            var toggle = Theme.Button(_showPaths ? "HIDE PATHS" : "SHOW PATHS",
                () => { _showPaths = !_showPaths; Render(); }, Theme.ButtonKind.Ghost);
            toggle.style.fontSize = 10;
            toggle.style.letterSpacing = 2;
            Theme.SetPadding(toggle, 3, 10);
            Theme.SetRadius(toggle, 11);
            Tips.Attach(toggle, "show paths",
                "lights every route you can still take from where you stand — " +
                "forks commit you, so check before you step");
            header.Add(toggle);
            frame.Add(header);

            // The body holds the layer columns AND the edge canvas drawn over them.
            // No scroll view: the columns spread across whatever width the window
            // gives, so the map fills the screen and scales with resizes.
            var body = new VisualElement();
            body.style.flexDirection = FlexDirection.Row;
            body.style.justifyContent = Justify.SpaceEvenly;
            body.style.alignItems = Align.Stretch;
            body.style.flexGrow = 1;
            Theme.SetPadding(body, 14, 14);

            var current = S.Map.Current;
            var discs = new Dictionary<int, VisualElement>();

            // Everything still reachable from here (forward BFS) — feeds the
            // show-paths view. The current node counts as reachable.
            var open = new HashSet<int> { current.Id };
            var walk = new Queue<int>();
            walk.Enqueue(current.Id);
            while (walk.Count > 0)
                foreach (int nx in S.Map.Get(walk.Dequeue()).Next)
                    if (open.Add(nx)) walk.Enqueue(nx);

            foreach (var layer in S.Map.Nodes.GroupBy(n => n.Layer).OrderBy(g => g.Key))
            {
                var column = new VisualElement();
                column.style.justifyContent = Justify.SpaceEvenly; // spread forks vertically too
                foreach (var node in layer)
                {
                    int captured = node.Id;
                    bool isCurrent = node.Id == current.Id;
                    bool reachable = current.Next.Contains(node.Id);
                    var disc = Widgets.NodeDisc(node, isCurrent, reachable,
                        () => Dispatch(new MoveToNode(captured)));
                    // Show-paths: stops your lane can no longer reach fade out.
                    if (_showPaths && !open.Contains(node.Id) && !node.Visited)
                        disc.style.opacity = 0.3f;
                    discs[node.Id] = disc;
                    column.Add(disc);
                }
                body.Add(column);
            }

            var edges = new List<(VisualElement from, VisualElement to, Color color, float width)>();
            foreach (var node in S.Map.Nodes)
                foreach (int next in node.Next)
                    if (discs.TryGetValue(node.Id, out var from) && discs.TryGetValue(next, out var to))
                    {
                        bool isNextStep = node.Id == current.Id && current.Next.Contains(next);
                        var (color, width) = isNextStep ? (Widgets.EdgeLit, 2.5f)
                            : _showPaths && open.Contains(node.Id) ? (Widgets.EdgeOpen, 2f)
                            : (Widgets.EdgeDim, 1.5f);
                        edges.Add((from, to, color, width));
                    }
            var canvas = Widgets.EdgeCanvas(edges);
            body.Add(canvas);
            // The window is resizable — redraw the roads whenever the map reflows.
            body.RegisterCallback<GeometryChangedEvent>(_ => canvas.MarkDirtyRepaint());

            frame.Add(body);
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
            if (S.CaravanOffer != null && _caravanDismissed) rail.Add(CaravanPanel());
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
            // Diablo-style paper-doll: four sockets in a row, each showing a grey
            // silhouette of what belongs there until something gold fills it.
            var panel = Theme.Frame("Relics — four slots + Staff");
            var doll = Row();
            doll.style.flexWrap = Wrap.NoWrap;
            doll.style.justifyContent = Justify.Center;
            doll.style.alignItems = Align.FlexStart;
            foreach (RelicSlot slot in new[] { RelicSlot.Hat, RelicSlot.Amulet, RelicSlot.Ring, RelicSlot.Cloak })
            {
                string id = S.EquippedRelics[(int)slot];
                bool filled = id != null;

                var col = new VisualElement();
                col.style.alignItems = Align.Center;
                col.style.flexGrow = 1;
                col.style.flexBasis = 0;
                col.style.marginLeft = 3;
                col.style.marginRight = 3;

                col.Add(Widgets.RelicSlotIcon(slot, filled));

                var slotLabel = new Label(slot.ToString().ToUpperInvariant());
                slotLabel.style.fontSize = 9;
                slotLabel.style.letterSpacing = 2;
                slotLabel.style.marginTop = 3;
                slotLabel.style.color = filled ? Theme.Gold : Theme.Grey;
                col.Add(slotLabel);

                if (filled)
                {
                    var name = new Label(RelicTables.Get(id).Name);
                    name.style.unityFontStyleAndWeight = FontStyle.Bold;
                    name.style.fontSize = 11;
                    name.style.color = Theme.GoldBright;
                    name.style.unityTextAlign = TextAnchor.UpperCenter;
                    name.style.whiteSpace = WhiteSpace.Normal;
                    col.Add(name);

                    var rules = new Label(ContentText.RelicRules[id]);
                    rules.style.fontSize = 9;
                    rules.style.color = Theme.ParchmentDim;
                    rules.style.unityTextAlign = TextAnchor.UpperCenter;
                    rules.style.whiteSpace = WhiteSpace.Normal;
                    col.Add(rules);
                }
                else
                {
                    var empty = new Label("empty");
                    empty.style.fontSize = 9;
                    empty.style.color = Theme.Grey;
                    col.Add(empty);
                }
                doll.Add(col);
            }
            panel.Add(doll);

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

        /// <summary>Compact side note once the merchant was waved off — the way back in.</summary>
        private VisualElement CaravanPanel()
        {
            var panel = Theme.Frame("The Caravan");
            Theme.SetBorder(panel, Theme.GoldDim, 1);
            var note = Text($"The caravan waits — {RelicTables.Get(S.CaravanOffer).Name} is still for sale.");
            note.style.fontSize = 11;
            note.style.color = Theme.ParchmentDim;
            panel.Add(note);
            panel.Add(Btn("Reopen the caravan", () => { _caravanDismissed = false; Render(); }));
            return panel;
        }

        /// <summary>
        /// The merchant proper (§8) — a full overlay so the stop is a STOP: the
        /// relic on show, the price, and the hand fanned inside for payment.
        /// </summary>
        private VisualElement CaravanOverlay()
        {
            string id = S.CaravanOffer;
            var info = RelicTables.Get(id);
            int cost = Tuning.CaravanCost -
                       (S.HasRelic("caravan_coin") ? Tuning.CaravanCoinDiscount : 0);
            int paying = _sel.Sum(cid => S.Cards.Get(cid).EffectiveValue());
            bool covered = paying >= cost;

            var o = Overlay();
            var d = Dialog("THE CARAVAN");
            d.style.minWidth = 640;

            var head = Row();
            head.style.flexWrap = Wrap.NoWrap;
            head.Add(Widgets.RelicSlotIcon(info.Slot, true));
            var titleCol = new VisualElement();
            titleCol.style.marginLeft = 10;
            var name = new Label(info.Name);
            name.style.color = Theme.GoldBright;
            name.style.fontSize = 17;
            name.style.unityFontStyleAndWeight = FontStyle.Bold;
            titleCol.Add(name);
            var slotRow = Row();
            slotRow.Add(Theme.Chip(info.Slot.ToString(), Theme.Gold));
            slotRow.Add(Theme.Chip($"{cost} card-value", covered ? Theme.Green : Theme.RedDeep));
            titleCol.Add(slotRow);
            head.Add(titleCol);
            d.Add(head);

            var rules = Text(ContentText.RelicRules[id]);
            rules.style.color = Theme.ParchmentDim;
            rules.style.marginTop = 4;
            d.Add(rules);

            var payHint = Theme.Subtle("pick cards from your hand — they are spent to the discard");
            payHint.style.marginTop = 6;
            d.Add(payHint);
            d.Add(HandStrip(true));

            var barRow = Row();
            barRow.style.justifyContent = Justify.Center;
            barRow.Add(Theme.Bar(cost == 0 ? 1f : Mathf.Clamp01(paying / (float)cost),
                $"{paying} / {cost} card-value", covered ? Theme.Green : Theme.RedBright, 280, 18));
            d.Add(barRow);

            var actions = Row();
            actions.style.justifyContent = Justify.Center;
            actions.style.marginTop = 6;
            actions.Add(BtnPrimary($"Buy ({paying}/{cost})",
                () => Dispatch(new BuyRelic(_sel.ToList())), covered));
            actions.Add(Theme.Button("Walk away", () =>
            {
                _caravanDismissed = true;
                Render();
            }, Theme.ButtonKind.Ghost));
            d.Add(actions);

            o.Add(d);
            return o;
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
