using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;
using Regicide.Core;

namespace Regicide.Unity
{
    public partial class RunApp
    {
        // ── pending-choice overlays (§4): the game blocks until answered ────────

        private VisualElement BuildPendingOverlay(PendingChoice pending)
        {
            switch (pending.Kind)
            {
                case PendingChoiceKind.Defend: return DefendDialog(pending);
                case PendingChoiceKind.GraftSelect: return GraftDialog(pending);
                case PendingChoiceKind.HuntSelect: return HuntDialog(pending);
                case PendingChoiceKind.RoyalKeep: return RoyalKeepDialog(pending);
                case PendingChoiceKind.RecoverSelect: return RecoverSelectDialog(pending);
                case PendingChoiceKind.RecoverToHand: return RecoverToHandDialog(pending);
                case PendingChoiceKind.RelicSelect: return RelicSelectDialog(pending);
                case PendingChoiceKind.DebtDiscard: return DebtDialog();
                default: return Overlay();
            }
        }

        /// <summary>Toggleable card buttons over an id list, highlighting _sel.</summary>
        private VisualElement SelectableCards(IEnumerable<int> ids)
        {
            var row = Row();
            foreach (int id in ids)
            {
                int captured = id;
                var b = Btn(CardLabel(id), () =>
                {
                    if (!_sel.Remove(captured)) _sel.Add(captured);
                    Render();
                });
                if (_sel.Contains(id))
                    b.style.backgroundColor = new StyleColor(new Color(0.35f, 0.5f, 0.28f));
                row.Add(b);
            }
            return row;
        }

        private VisualElement DefendDialog(PendingChoice pending)
        {
            var o = Overlay();
            int covered = _sel.Sum(id => S.Cards.Get(id).EffectiveValue());
            var d = Dialog($"Counterattack! Discard to cover {pending.RequiredValue}");
            d.Add(Text($"Covered {covered} / needed {pending.RequiredValue}"));
            d.Add(SelectableCards(S.Deck.Hand.ToList()));
            d.Add(Btn($"Discard selected ({covered})",
                () => Dispatch(new DefendDiscard(_sel.ToList())), covered >= pending.RequiredValue));

            // Pay-step outs: Parry (staff) and Brace (♠ Half) live here too (§7, §10).
            if (S.Hero.StaffId == "parry")
                d.Add(Btn("⚚ Parry with selected ♠",
                    () => Dispatch(new ActivateStaff(_sel.First())), _sel.Count == 1));
            if (S.GauntletTiers[(int)Suit.Spades] == SpellTables.TierHalf &&
                !S.Encounter.CastSuits.Contains(Suit.Spades))
                d.Add(Btn("Cast Brace ♠ (spend your highest card)",
                    () => Dispatch(new CastSpell(Suit.Spades))));
            o.Add(d);
            return o;
        }

        private VisualElement GraftDialog(PendingChoice pending)
        {
            var o = Overlay();
            var d = Dialog($"Redundant exact kill — graft from {PhysicalCard.Pretty(pending.SlainFace)}");
            d.Add(Text("Pick ONE hand card, then a branch (§6):"));
            d.Add(SelectableCards(S.Deck.Hand.ToList()));
            bool one = _sel.Count == 1;
            var row = Row();
            row.Add(Btn($"Replace rank → {PhysicalCard.RankGlyph(pending.SlainFace.Rank)} (cap 10)",
                () => Dispatch(new ChooseGraft(_sel.First(), GraftBranch.ReplaceRank)), one));
            row.Add(Btn($"Add suit → +{PhysicalCard.SuitGlyph(pending.SlainFace.Suit)}",
                () => Dispatch(new ChooseGraft(_sel.First(), GraftBranch.AddSuit)), one));
            d.Add(row);
            o.Add(d);
            return o;
        }

        private VisualElement HuntDialog(PendingChoice pending)
        {
            var o = Overlay();
            var d = Dialog("🏹 The Hunt — chase a recruit you are missing");
            var row = Row();
            foreach (var face in pending.HuntOptions)
            {
                var captured = face;
                row.Add(Btn(PhysicalCard.Pretty(face),
                    () => Dispatch(new ChooseHunt(captured.Suit, captured.Rank))));
            }
            d.Add(row);
            o.Add(d);
            return o;
        }

        private VisualElement RoyalKeepDialog(PendingChoice pending)
        {
            var o = Overlay();
            string title = pending.PickIsLeave
                ? $"👑 {PhysicalCard.RankGlyph(pending.RoyalRank)} Gate cleared — choose the one to LEAVE behind"
                : $"👑 {PhysicalCard.RankGlyph(pending.RoyalRank)} Gate cleared — choose who follows you" +
                  (pending.PicksRemaining > 1 ? $" ({pending.PicksRemaining} picks left)" : "");
            var d = Dialog(title);
            if (pending.RoyalRank == Rank.King)
                d.Add(Text("The one you keep is your CROWN — this ends the campaign in victory."));
            var row = Row();
            foreach (Suit suit in pending.Eligible)
            {
                Suit captured = suit;
                row.Add(Btn(PhysicalCard.Pretty(new CardFace(suit, pending.RoyalRank)),
                    () => Dispatch(new ChooseRoyal(captured))));
            }
            d.Add(row);
            o.Add(d);
            return o;
        }

        private VisualElement RecoverSelectDialog(PendingChoice pending)
        {
            var o = Overlay();
            var d = Dialog($"⚚ Triage — pick up to {pending.RecoverMax} discard(s) to recover");
            d.Add(SelectableCards(pending.RecoverIds));
            d.Add(Btn($"Recover selected ({_sel.Count}/{pending.RecoverMax})",
                () => Dispatch(new ChooseRecover(_sel.ToList())), _sel.Count <= pending.RecoverMax));
            o.Add(d);
            return o;
        }

        private VisualElement RecoverToHandDialog(PendingChoice pending)
        {
            var o = Overlay();
            var d = Dialog("⚚ Last Rites — take one recovered card into hand?");
            var row = Row();
            foreach (int id in pending.RecoverIds)
            {
                int captured = id;
                row.Add(Btn(CardLabel(id), () => Dispatch(new ChooseRecover(captured))));
            }
            d.Add(row);
            d.Add(Btn("Take none", () => Dispatch(new ChooseRecover(new List<int>()))));
            o.Add(d);
            return o;
        }

        private VisualElement RelicSelectDialog(PendingChoice pending)
        {
            var o = Overlay();
            var d = Dialog("🐉 The raid pays off — claim one relic");
            foreach (string id in pending.RelicOptions)
            {
                string captured = id;
                var row = Row();
                row.Add(Btn($"{RelicTables.Get(id).Name} ({RelicTables.Get(id).Slot})",
                    () => Dispatch(new ChooseRelic(captured))));
                row.Add(Text(ContentText.RelicRules[id]));
                d.Add(row);
            }
            o.Add(d);
            return o;
        }

        private VisualElement DebtDialog()
        {
            var o = Overlay();
            var d = Dialog("The Debt comes due — discard exactly one card");
            var row = Row();
            foreach (int id in S.Deck.Hand.ToList())
            {
                int captured = id;
                row.Add(Btn(CardLabel(id), () => Dispatch(new DefendDiscard(captured))));
            }
            d.Add(row);
            o.Add(d);
            return o;
        }
    }
}
