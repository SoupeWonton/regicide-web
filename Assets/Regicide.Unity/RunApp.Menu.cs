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
            v.style.alignItems = Align.Center;
            v.style.justifyContent = Justify.Center;

            var box = Panel();
            box.style.minWidth = 420;
            box.Add(Head("KINGFALL — Regicide"));
            box.Add(Text("You don't build a deck — you conquer one."));
            box.Add(Text(""));

            var seed = new TextField("Seed (blank = random)") { value = _menuSeed };
            seed.RegisterValueChangedCallback(e => _menuSeed = e.newValue);
            box.Add(seed);

            box.Add(Btn("New Run", () => NewRun(_menuSeed)));
            box.Add(Text(""));
            box.Add(Text($"Lineage: {_meta.Runs} run(s), {_meta.Wins} crown(s)" +
                         (_meta.C2Cleared ? " — Continent 2 cleared" : "")));
            box.Add(Text("(No mid-run save — a run is a single sitting.)"));
            box.Add(Btn("Quit", Application.Quit));
            v.Add(box);
            return v;
        }

        // ── class select (§16): 4 classes × 4 staffs + greyed path teasers ──────

        private VisualElement BuildClassSelect()
        {
            var v = new ScrollView();
            v.Add(Head("Choose your class and Staff"));

            var classRow = Row();
            foreach (string classId in ClassTables.ClassOrder)
            {
                string captured = classId;
                var b = Btn(ContentText.ClassName(classId), () => { _classPick = captured; Render(); });
                if (_classPick == classId)
                    b.style.backgroundColor = new StyleColor(new Color(0.35f, 0.5f, 0.28f));
                classRow.Add(b);
            }
            v.Add(classRow);

            if (_classPick == null)
            {
                v.Add(Text("All four classes start from the identical 20-card A–5 deck — identity comes from Staff and path."));
                return v;
            }

            var info = ClassTables.Classes[_classPick];
            var panel = Panel(ContentText.ClassName(_classPick));
            panel.Add(Text(ContentText.Classes[_classPick].Rules));
            panel.Add(Text(""));
            panel.Add(Text("Pick a Staff:"));
            foreach (string staffId in info.StaffIds)
            {
                string captured = staffId;
                var row = Row();
                row.Add(Btn($"⚚ {ContentText.StaffName(staffId)}",
                    () => Dispatch(new SelectClass(_classPick, captured))));
                row.Add(Text(ContentText.Staffs[staffId].Rules));
                panel.Add(row);
            }
            v.Add(panel);

            var teaser = Panel("Path tree (future continents — locked)");
            foreach (string ladder in ContentText.LockedLadders[_classPick])
            {
                var l = Text($"🔒 {ladder}");
                l.style.color = new StyleColor(new Color(0.5f, 0.5f, 0.55f));
                teaser.Add(l);
            }
            v.Add(teaser);
            return v;
        }

        // ── recap / win / loss (§16) ────────────────────────────────────────────

        private VisualElement BuildRecap()
        {
            var v = new ScrollView();
            v.Add(Head($"Province cleared — Chapter {S.Chapter} (Continent {S.Continent})"));
            v.Add(Text("The seam rest already reshuffled your discard and drew your hand to full."));
            v.Add(DeckCounts());
            v.Add(BraceletPanel());
            v.Add(RelicPanel());
            v.Add(Btn(S.Chapter >= Tuning.FinalChapter ? "…" : "Continue the conquest →",
                () => Dispatch(new ContinueRun())));
            v.Add(EventLog());
            return v;
        }

        private VisualElement BuildEnd(bool won)
        {
            var v = new VisualElement();
            v.style.alignItems = Align.Center;
            v.style.justifyContent = Justify.Center;
            var box = Panel();
            box.style.minWidth = 480;
            if (won)
            {
                box.Add(Head("👑 CROWNED"));
                var crown = S.OwnedCards.Select(id => S.Cards.Get(id))
                    .FirstOrDefault(c => c.Printed.Rank == Rank.King);
                box.Add(Text(crown != null
                    ? $"The {PhysicalCard.Pretty(crown.Printed)} is your crown. The realm is yours."
                    : "The realm is yours."));
                box.Add(Text($"Conquest: {S.OwnedCards.Count} cards · seed \"{S.Seed}\""));
            }
            else
            {
                box.Add(Head("☠ The run is over"));
                box.Add(Text($"Fallen in chapter {S.Chapter} (Continent {S.Continent}). No revive, no save — the lineage remembers."));
            }
            box.Add(Text($"Lineage: {_meta.Runs} run(s), {_meta.Wins} crown(s)."));
            box.Add(Btn("Back to the menu", BackToMenu));
            v.Add(box);
            return v;
        }
    }
}
