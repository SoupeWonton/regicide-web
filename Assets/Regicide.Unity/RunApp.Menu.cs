using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;
using Regicide.Core;

namespace Regicide.Unity
{
    public partial class RunApp
    {
        // ── main menu (§16): new run + seed, lineage summary, quit ──────────────

        private VisualElement BuildMainMenu()
        {
            var v = new VisualElement();
            v.style.flexGrow = 1;
            v.style.alignItems = Align.Center;
            v.style.justifyContent = Justify.Center;

            v.Add(Theme.Title("KINGFALL", 56));

            var sub = new Label("you don't build a deck — you conquer one");
            sub.style.color = Theme.ParchmentDim;
            sub.style.fontSize = 16;
            sub.style.unityFontStyleAndWeight = FontStyle.Italic;
            sub.style.marginBottom = 14;
            v.Add(sub);

            // The four suits, a heraldic strip.
            var suitsRow = new VisualElement();
            suitsRow.style.flexDirection = FlexDirection.Row;
            suitsRow.style.marginBottom = 22;
            foreach (Suit s in new[] { Suit.Spades, Suit.Hearts, Suit.Clubs, Suit.Diamonds })
            {
                var g = new Label(PhysicalCard.SuitGlyph(s));
                g.style.fontSize = 40;
                g.style.marginLeft = 10; g.style.marginRight = 10;
                var c = CardView.SuitColor(s);
                g.style.color = s == Suit.Hearts || s == Suit.Diamonds
                    ? c : Theme.Lighten(c, 0.55f); // dark suits need lift on the night bg
                suitsRow.Add(g);
            }
            v.Add(suitsRow);

            var box = Theme.Frame();
            Theme.SetBorder(box, Theme.Gold, 2);
            Theme.SetPadding(box, 18, 26);
            box.style.minWidth = 440;
            box.style.alignItems = Align.Center;

            // Lineage first; the seed box sits under the run counts and crowns.
            var lineage = Row();
            lineage.style.justifyContent = Justify.Center;
            lineage.style.marginBottom = 12;
            lineage.Add(Theme.Chip($"{_meta.Runs} run(s)"));
            lineage.Add(Theme.Chip($"{_meta.Wins} crown(s)", Theme.Gold));
            if (_meta.C2Cleared) lineage.Add(Theme.Chip("Continent 2 cleared", Theme.Green));
            box.Add(lineage);

            // The last few runs, so a fresh start never blurs into the one before.
            if (_meta.History.Count > 0)
            {
                var recent = new VisualElement();
                recent.style.alignItems = Align.Center;
                recent.style.marginBottom = 10;
                int shown = 0;
                for (int i = _meta.History.Count - 1; i >= 0 && shown < 3; i--, shown++)
                {
                    var run = _meta.History[i];
                    string who = run.ClassId.Length > 0
                        ? $"{ContentText.ClassName(run.ClassId)} / {ContentText.StaffName(run.StaffId)}"
                        : "never left the menu";
                    string fate = run.Outcome == "won" ? "CROWNED"
                        : run.Outcome == "lost" ? $"fell ch{run.Chapter}" : "abandoned";
                    var line = Theme.Subtle($"#{run.N} · {who} — {fate}");
                    if (run.Outcome == "won") line.style.color = Theme.GoldBright;
                    recent.Add(line);
                }
                box.Add(recent);
            }

            var seed = new TextField("Seed (blank = random)") { value = _menuSeed };
            seed.RegisterValueChangedCallback(e => _menuSeed = e.newValue);
            seed.style.minWidth = 380;
            seed.style.marginBottom = 10;
            seed.labelElement.style.color = Theme.ParchmentDim;
            var input = seed.Q("unity-text-input");
            if (input != null)
            {
                input.style.backgroundColor = Theme.NightDeep;
                input.style.color = Theme.Parchment;
                Theme.SetBorder(input, Theme.GoldDim, 1);
                Theme.SetRadius(input, 4);
            }
            box.Add(seed);

            var newRun = BtnPrimary("N E W   R U N", () => NewRun(_menuSeed));
            newRun.style.fontSize = 18;
            Theme.SetPadding(newRun, 10, 34);
            box.Add(newRun);

            var note = new Label("no mid-run save — a run is a single sitting");
            note.style.color = Theme.Grey;
            note.style.fontSize = 11;
            note.style.marginTop = 6;
            box.Add(note);

            box.Add(Theme.Button("Quit", Application.Quit, Theme.ButtonKind.Ghost));
            v.Add(box);
            return v;
        }

        // ── class select (§16): 4 classes × 4 staffs + greyed path teasers ──────

        private VisualElement BuildClassSelect()
        {
            var v = new ScrollView();
            Theme.SetPadding(v, 10, 20);
            v.Add(Theme.Title("CHOOSE YOUR CLASS", 30));

            var hint = new Label("all four classes start from the identical 20-card A–5 deck — identity comes from Staff and path");
            hint.style.color = Theme.Grey;
            hint.style.fontSize = 12;
            hint.style.unityTextAlign = TextAnchor.MiddleCenter;
            hint.style.marginBottom = 12;
            v.Add(hint);

            var classRow = new VisualElement();
            classRow.style.flexDirection = FlexDirection.Row;
            classRow.style.justifyContent = Justify.Center;
            classRow.style.flexWrap = Wrap.Wrap;

            foreach (string classId in ClassTables.ClassOrder)
            {
                string captured = classId;
                var info = ClassTables.Classes[classId];
                bool picked = _classPick == classId;

                var panel = Theme.Frame();
                panel.style.width = 215;
                panel.style.marginRight = 10;
                Theme.SetBorder(panel, picked ? Theme.GoldBright : Theme.GoldDim, picked ? 2.5f : 1);
                panel.RegisterCallback<ClickEvent>(_ => { _classPick = captured; Render(); });

                // The class crest: one big home-suit glyph, the name in a uniform
                // slot under it — identical position and size on all four panels.
                var crest = new VisualElement();
                crest.style.alignItems = Align.Center;

                var logo = new Label(PhysicalCard.SuitGlyph(info.HomeSuit));
                logo.style.fontSize = 64 * CardView.GlyphScale(info.HomeSuit);
                logo.style.height = 74; // ♥'s smaller glyph must not shift the name row
                logo.style.unityTextAlign = TextAnchor.MiddleCenter;
                logo.style.color = Color.Lerp(CardView.SuitColor(info.HomeSuit), Color.white, 0.30f);
                crest.Add(logo);

                var name = new Label(ContentText.ClassName(classId).ToUpperInvariant());
                name.style.color = picked ? Theme.GoldBright : Theme.Gold;
                name.style.fontSize = 15; // fits QUARTERMASTER on one line at this width
                name.style.unityFontStyleAndWeight = FontStyle.Bold;
                name.style.letterSpacing = 1;
                name.style.whiteSpace = WhiteSpace.NoWrap;
                name.style.unityTextAlign = TextAnchor.MiddleCenter;
                crest.Add(name);
                panel.Add(crest);

                var rules = new Label(ContentText.Classes[classId].Rules);
                rules.style.whiteSpace = WhiteSpace.Normal;
                rules.style.fontSize = 11;
                rules.style.color = Theme.ParchmentDim;
                rules.style.marginTop = 6;
                panel.Add(rules);

                classRow.Add(panel);
            }
            v.Add(classRow);
            if (_classPick == null) return v;

            // Staff choice for the picked class.
            var pickInfo = ClassTables.Classes[_classPick];
            var staffPanel = Theme.Frame($"{ContentText.ClassName(_classPick)} — pick a Staff");
            staffPanel.style.maxWidth = 1040;
            staffPanel.style.alignSelf = Align.Center;
            staffPanel.style.marginTop = 12;
            foreach (string staffId in pickInfo.StaffIds)
            {
                string captured = staffId;
                var row = Row();
                row.style.marginBottom = 4;
                var take = BtnPrimary($"{ContentText.StaffName(staffId)}",
                    () => Dispatch(new SelectClass(_classPick, captured)));
                take.style.minWidth = 170;
                row.Add(take);
                var rules = new Label(ContentText.Staffs[staffId].Rules);
                rules.style.whiteSpace = WhiteSpace.Normal;
                rules.style.fontSize = 11;
                rules.style.color = Theme.ParchmentDim;
                rules.style.flexShrink = 1;
                row.Add(rules);
                staffPanel.Add(row);
            }
            v.Add(staffPanel);

            var teaser = Theme.Frame("path tree — future continents");
            teaser.style.maxWidth = 1040;
            teaser.style.alignSelf = Align.Center;
            foreach (string ladder in ContentText.LockedLadders[_classPick])
            {
                var l = new Label($"locked · {ladder}");
                l.style.color = Theme.Grey;
                l.style.fontSize = 11;
                teaser.Add(l);
            }
            v.Add(teaser);
            return v;
        }

        // ── recap / win / loss (§16) ────────────────────────────────────────────

        private VisualElement BuildRecap()
        {
            var v = new ScrollView();
            Theme.SetPadding(v, 10, 20);
            v.Add(Theme.Title("PROVINCE CLEARED", 26));

            var chips = Row();
            chips.style.justifyContent = Justify.Center;
            chips.Add(Theme.Chip($"Chapter {S.Chapter}", Theme.Gold));
            chips.Add(Theme.Chip($"Continent {S.Continent}"));
            chips.Add(Theme.Chip("seam rest applied — hand redrawn", Theme.Green));
            v.Add(chips);

            var center = Theme.Frame();
            center.style.maxWidth = 900;
            center.style.alignSelf = Align.Center;
            center.style.marginTop = 8;
            center.Add(DeckCounts());
            v.Add(center);

            v.Add(BraceletPanel());
            v.Add(RelicPanel());

            var go = BtnPrimary(S.Chapter >= Tuning.FinalChapter ? "…" : "CONTINUE THE CONQUEST  →",
                () => Dispatch(new ContinueRun()));
            go.style.alignSelf = Align.Center;
            go.style.fontSize = 16;
            Theme.SetPadding(go, 10, 26);
            v.Add(go);
            v.Add(EventLog());
            return v;
        }

        private VisualElement BuildEnd(bool won)
        {
            var v = new VisualElement();
            v.style.flexGrow = 1;
            v.style.alignItems = Align.Center;
            v.style.justifyContent = Justify.Center;

            var box = Theme.Frame();
            Theme.SetPadding(box, 20, 30);
            box.style.alignItems = Align.Center;
            box.style.maxWidth = 900;
            Theme.SetBorder(box, won ? Theme.GoldBright : Theme.RedDeep, 2.5f);

            // The run's identity, unmistakable — so the NEXT run reads as new.
            var stamp = Theme.Subtle(
                $"run #{_runNumber} · {ContentText.ClassName(S.Hero.ClassId)} / {ContentText.StaffName(S.Hero.StaffId)}" +
                $" · seed {S.Seed} · reached chapter {S.Chapter}");
            stamp.style.marginBottom = 8;
            box.Add(stamp);

            if (won)
            {
                box.Add(Theme.Title("LONG LIVE THE CROWN", 34));

                // The court you kept: every royal in the conquest, crown first.
                var royals = S.OwnedCards.Select(id => S.Cards.Get(id))
                    .Where(c => CardRules.IsRoyal(c.Printed.Rank))
                    .OrderByDescending(c => (int)c.Printed.Rank)
                    .ToList();
                var court = new VisualElement();
                court.style.flexDirection = FlexDirection.Row;
                court.style.justifyContent = Justify.Center;
                court.style.marginBottom = 10;
                foreach (var royal in royals)
                {
                    var slot = new VisualElement();
                    slot.style.alignItems = Align.Center;
                    slot.style.marginRight = 6;
                    slot.Add(CardView.Card(royal,
                        royal.Printed.Rank == Rank.King ? CardView.Size.Large : CardView.Size.Hand));
                    if (royal.Printed.Rank == Rank.King)
                    {
                        var crownTag = new Label("THE CROWN");
                        crownTag.style.color = Theme.GoldBright;
                        crownTag.style.fontSize = 12;
                        crownTag.style.unityFontStyleAndWeight = FontStyle.Bold;
                        crownTag.style.letterSpacing = 2;
                        slot.Add(crownTag);
                    }
                    court.Add(slot);
                }
                if (royals.Count > 0) box.Add(court);

                var line = new Label("The realm is yours.");
                line.style.color = Theme.Parchment;
                line.style.marginBottom = 8;
                box.Add(line);
            }
            else
            {
                box.Add(Theme.Title("THE RUN ENDS", 34));
                var line = new Label($"Fallen in chapter {S.Chapter}, Continent {S.Continent}. " +
                                     "No revive, no save — the lineage remembers.");
                line.style.color = Theme.ParchmentDim;
                line.style.whiteSpace = WhiteSpace.Normal;
                line.style.marginBottom = 8;
                box.Add(line);
            }

            var stats = Row();
            stats.style.justifyContent = Justify.Center;
            stats.Add(Theme.Chip($"conquest {S.OwnedCards.Count} cards", won ? Theme.Gold : Theme.Grey));
            stats.Add(Theme.Chip($"seed \"{S.Seed}\""));
            stats.Add(Theme.Chip($"lineage {_meta.Runs} run(s) · {_meta.Wins} crown(s)", Theme.Gold));
            box.Add(stats);

            var back = BtnPrimary("BACK TO THE MENU", BackToMenu);
            back.style.marginTop = 12;
            box.Add(back);
            v.Add(box);
            return v;
        }
    }
}
