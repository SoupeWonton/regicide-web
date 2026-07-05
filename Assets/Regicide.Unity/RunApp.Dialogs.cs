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

        /// <summary>Toggleable real cards over an id list, raising _sel picks.</summary>
        private VisualElement SelectableCards(IEnumerable<int> ids)
        {
            var row = Row();
            row.style.justifyContent = Justify.Center;
            row.style.paddingTop = 18; // headroom for the selection lift
            foreach (int id in ids)
            {
                int captured = id;
                row.Add(CardView.Card(S.Cards.Get(captured), CardView.Size.Hand,
                    onClick: () =>
                    {
                        if (!_sel.Remove(captured)) _sel.Add(captured);
                        Render();
                    },
                    selected: _sel.Contains(captured)));
            }
            return row;
        }

        /// <summary>A clickable plain face (royals on offer, hunt quarry …).</summary>
        private static VisualElement PickableFace(CardFace face, CardView.Size size, System.Action onPick)
        {
            var wrap = new VisualElement();
            wrap.style.alignItems = Align.Center;
            wrap.style.marginRight = 6;
            wrap.style.paddingTop = 14;
            wrap.Add(CardView.Face(face, size, onPick));
            return wrap;
        }

        private VisualElement DefendDialog(PendingChoice pending)
        {
            var o = Overlay();
            int covered = _sel.Sum(id => S.Cards.Get(id).EffectiveValue());
            bool enough = covered >= pending.RequiredValue;

            var d = Dialog("⚔ COUNTERATTACK");
            var sub = new Label($"discard cards worth {pending.RequiredValue} to survive");
            sub.style.color = Theme.ParchmentDim;
            sub.style.marginBottom = 8;
            d.Add(sub);

            var bar = Theme.Bar(
                pending.RequiredValue <= 0 ? 1f : Mathf.Min(1f, covered / (float)pending.RequiredValue),
                $"paid {covered} / need {pending.RequiredValue}",
                enough ? Theme.Green : Theme.RedBright, 320, 22);
            bar.style.alignSelf = Align.Center;
            bar.style.marginBottom = 8;
            d.Add(bar);

            d.Add(SelectableCards(S.Deck.Hand.ToList()));

            var actions = Row();
            actions.style.justifyContent = Justify.Center;
            actions.Add(BtnPrimary($"PAY ({covered})",
                () => Dispatch(new DefendDiscard(_sel.ToList())), enough));

            // Pay-step outs: Parry (staff) and Brace (♠ Half) live here too (§7, §10).
            if (S.Hero.StaffId == "parry")
                actions.Add(Btn("⚚ Parry with selected ♠",
                    () => Dispatch(new ActivateStaff(_sel.First())), _sel.Count == 1));
            if (S.GauntletTiers[(int)Suit.Spades] == SpellTables.TierHalf &&
                !S.Encounter.CastSuits.Contains(Suit.Spades))
                actions.Add(Theme.Button("Cast Brace ♠ (spend your highest card)",
                    () => Dispatch(new CastSpell(Suit.Spades)), Theme.ButtonKind.Danger));
            d.Add(actions);
            o.Add(d);
            return o;
        }

        private VisualElement GraftDialog(PendingChoice pending)
        {
            var o = Overlay();
            var d = Dialog("REDUNDANT KILL — THE GRAFT");

            var slain = new VisualElement();
            slain.style.alignItems = Align.Center;
            slain.style.marginBottom = 6;
            slain.Add(CardView.Face(pending.SlainFace, CardView.Size.Large));
            var cap = new Label($"the slain {PhysicalCard.Pretty(pending.SlainFace)} offers its rank or its suit");
            cap.style.color = Theme.ParchmentDim;
            cap.style.fontSize = 12;
            slain.Add(cap);
            d.Add(slain);

            var hint = new Label("pick ONE hand card, then a branch (§6):");
            hint.style.color = Theme.Parchment;
            hint.style.marginBottom = 4;
            d.Add(hint);
            d.Add(SelectableCards(S.Deck.Hand.ToList()));

            bool one = _sel.Count == 1;
            var row = Row();
            row.style.justifyContent = Justify.Center;
            row.Add(BtnPrimary($"Replace rank → {PhysicalCard.RankGlyph(pending.SlainFace.Rank)} (cap 10)",
                () => Dispatch(new ChooseGraft(_sel.First(), GraftBranch.ReplaceRank)), one));
            row.Add(BtnPrimary($"Add suit → +{PhysicalCard.SuitGlyph(pending.SlainFace.Suit)}",
                () => Dispatch(new ChooseGraft(_sel.First(), GraftBranch.AddSuit)), one));
            d.Add(row);
            o.Add(d);
            return o;
        }

        private VisualElement HuntDialog(PendingChoice pending)
        {
            var o = Overlay();
            var d = Dialog("🏹 THE HUNT");
            var sub = new Label("chase a recruit you are missing — the quarry becomes the fight");
            sub.style.color = Theme.ParchmentDim;
            sub.style.marginBottom = 8;
            d.Add(sub);

            var scroll = new ScrollView();
            scroll.style.maxHeight = 400;
            var row = Row();
            row.style.justifyContent = Justify.Center;
            foreach (var face in pending.HuntOptions)
            {
                var captured = face;
                row.Add(PickableFace(face, CardView.Size.Hand,
                    () => Dispatch(new ChooseHunt(captured.Suit, captured.Rank))));
            }
            scroll.Add(row);
            d.Add(scroll);
            o.Add(d);
            return o;
        }

        private VisualElement RoyalKeepDialog(PendingChoice pending)
        {
            var o = Overlay();
            string title = pending.RoyalRank == Rank.King ? "👑 CLAIM YOUR CROWN"
                : pending.PickIsLeave ? "👑 CHOOSE WHO IS LEFT BEHIND"
                : "👑 WHO FOLLOWS YOU?";
            var d = Dialog(title);

            var chips = Row();
            chips.style.justifyContent = Justify.Center;
            chips.style.marginBottom = 8;
            chips.Add(Theme.Chip($"{PhysicalCard.RankGlyph(pending.RoyalRank)} Gate cleared", Theme.Gold));
            if (pending.PicksRemaining > 1)
                chips.Add(Theme.Chip($"{pending.PicksRemaining} picks left", Theme.GoldBright));
            if (pending.PickIsLeave)
                chips.Add(Theme.Chip("the rest follow you", Theme.Green));
            d.Add(chips);

            if (pending.RoyalRank == Rank.King)
            {
                var warn = new Label("the one you keep is your CROWN — this ends the campaign in victory");
                warn.style.color = Theme.GoldBright;
                warn.style.unityFontStyleAndWeight = FontStyle.Bold;
                warn.style.unityTextAlign = TextAnchor.MiddleCenter;
                warn.style.marginBottom = 8;
                d.Add(warn);
            }

            var row = Row();
            row.style.justifyContent = Justify.Center;
            foreach (Suit suit in pending.Eligible)
            {
                Suit captured = suit;
                row.Add(PickableFace(new CardFace(suit, pending.RoyalRank), CardView.Size.Large,
                    () => Dispatch(new ChooseRoyal(captured))));
            }
            d.Add(row);
            o.Add(d);
            return o;
        }

        private VisualElement RecoverSelectDialog(PendingChoice pending)
        {
            var o = Overlay();
            var d = Dialog("⚚ TRIAGE");
            var sub = new Label($"pick up to {pending.RecoverMax} discard(s) to recover to the Tavern");
            sub.style.color = Theme.ParchmentDim;
            sub.style.marginBottom = 6;
            d.Add(sub);
            d.Add(SelectableCards(pending.RecoverIds));
            var go = BtnPrimary($"RECOVER SELECTED ({_sel.Count}/{pending.RecoverMax})",
                () => Dispatch(new ChooseRecover(_sel.ToList())), _sel.Count <= pending.RecoverMax);
            go.style.alignSelf = Align.Center;
            d.Add(go);
            o.Add(d);
            return o;
        }

        private VisualElement RecoverToHandDialog(PendingChoice pending)
        {
            var o = Overlay();
            var d = Dialog("⚚ LAST RITES");
            var sub = new Label("take one recovered card into hand?");
            sub.style.color = Theme.ParchmentDim;
            sub.style.marginBottom = 6;
            d.Add(sub);

            var row = Row();
            row.style.justifyContent = Justify.Center;
            row.style.paddingTop = 14;
            foreach (int id in pending.RecoverIds)
            {
                int captured = id;
                row.Add(CardView.Card(S.Cards.Get(captured), CardView.Size.Hand,
                    onClick: () => Dispatch(new ChooseRecover(captured))));
            }
            d.Add(row);
            var none = Theme.Button("Take none", () => Dispatch(new ChooseRecover(new List<int>())), Theme.ButtonKind.Ghost);
            none.style.alignSelf = Align.Center;
            d.Add(none);
            o.Add(d);
            return o;
        }

        private VisualElement RelicSelectDialog(PendingChoice pending)
        {
            var o = Overlay();
            var d = Dialog("🐉 THE RAID PAYS OFF");
            var sub = new Label("claim one relic — the other is lost to the hoard");
            sub.style.color = Theme.ParchmentDim;
            sub.style.marginBottom = 8;
            d.Add(sub);

            var row = Row();
            row.style.justifyContent = Justify.Center;
            row.style.alignItems = Align.Stretch;
            foreach (string id in pending.RelicOptions)
            {
                string captured = id;
                var info = RelicTables.Get(id);
                var panel = Theme.Frame();
                panel.style.width = 300;
                panel.style.marginRight = 8;
                Theme.SetBorder(panel, Theme.Gold, 1.5f);

                var name = new Label(info.Name.ToUpperInvariant());
                name.style.color = Theme.GoldBright;
                name.style.fontSize = 15;
                name.style.unityFontStyleAndWeight = FontStyle.Bold;
                panel.Add(name);
                panel.Add(Theme.Chip(info.Slot.ToString(), Theme.Blue));

                var rules = new Label(ContentText.RelicRules[id]);
                rules.style.whiteSpace = WhiteSpace.Normal;
                rules.style.fontSize = 12;
                rules.style.color = Theme.ParchmentDim;
                rules.style.marginTop = 4;
                rules.style.marginBottom = 8;
                rules.style.flexGrow = 1;
                panel.Add(rules);

                panel.Add(BtnPrimary("TAKE", () => Dispatch(new ChooseRelic(captured))));
                row.Add(panel);
            }
            d.Add(row);
            o.Add(d);
            return o;
        }

        private VisualElement DebtDialog()
        {
            var o = Overlay();
            var d = Dialog("THE DEBT COMES DUE");
            var sub = new Label("discard exactly one card");
            sub.style.color = Theme.ParchmentDim;
            sub.style.marginBottom = 6;
            d.Add(sub);

            var row = Row();
            row.style.justifyContent = Justify.Center;
            row.style.paddingTop = 14;
            foreach (int id in S.Deck.Hand.ToList())
            {
                int captured = id;
                row.Add(CardView.Card(S.Cards.Get(captured), CardView.Size.Hand,
                    onClick: () => Dispatch(new DefendDiscard(captured))));
            }
            d.Add(row);
            o.Add(d);
            return o;
        }
    }
}
