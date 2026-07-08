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
            // Defend and DebtDiscard resolve INLINE on the battle screen (the hand
            // fan is the selector) — they never reach this overlay.
            switch (pending.Kind)
            {
                case PendingChoiceKind.GraftSelect: return GraftDialog(pending);
                case PendingChoiceKind.HuntSelect: return HuntDialog(pending);
                case PendingChoiceKind.RoyalKeep: return RoyalKeepDialog(pending);
                case PendingChoiceKind.RecoverSelect: return RecoverSelectDialog(pending);
                case PendingChoiceKind.OverdrawPick: return OverdrawDialog(pending);
                case PendingChoiceKind.RecoverToHand: return RecoverToHandDialog(pending);
                case PendingChoiceKind.RelicSelect: return RelicSelectDialog(pending);
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
            var d = Dialog("THE HUNT");
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

        // Playtest: the blocking overlay hides the hand and board mid-pick, so the
        // dialog can fold away into a floating chip. The flag is tracked against
        // the choice INSTANCE so it can never leak into a later overdraw. (Fields
        // live in THIS partial — RunApp.cs is owned elsewhere.)
        private bool _hideOverdraw;
        private PendingChoice _hideOverdrawFor;

        private VisualElement OverdrawDialog(PendingChoice pending)
        {
            // A hide left over from an EARLIER pick must not swallow this one.
            if (_hideOverdrawFor != pending)
            {
                _hideOverdraw = false;
                _hideOverdrawFor = null;
            }
            if (_hideOverdraw) return OverdrawHiddenChip();

            var o = Overlay();
            var d = Dialog("OVERDRAW — THE LAST SLOT");

            // Peek-at-the-board escape hatch — input stays gated by the pending
            // choice in Core, so view-only is safe.
            var hide = Theme.Button("HIDE", () =>
            {
                _hideOverdraw = true;
                _hideOverdrawFor = pending;
                Render();
            }, Theme.ButtonKind.Ghost);
            hide.style.position = Position.Absolute;
            hide.style.top = 10;
            hide.style.right = 10;
            d.Add(hide);

            var sub = new Label("your hand holds ONE more — take your pick; the rest shuffle back into the deck");
            sub.style.color = Theme.ParchmentDim;
            sub.style.marginBottom = 8;
            d.Add(sub);

            // A counter waits behind this pick — the picked card is pay too.
            var next = S.PendingChoices.Count > 1 ? S.PendingChoices[1] : null;
            if (next != null && next.Kind == PendingChoiceKind.Defend)
            {
                var warn = new Label($"a counterattack of {next.RequiredValue} follows — your pick helps pay it");
                warn.style.color = Theme.RedBright;
                warn.style.fontSize = 12;
                warn.style.marginBottom = 6;
                d.Add(warn);
            }

            var scroll = new ScrollView();
            scroll.style.maxHeight = 400;
            var row = Row();
            row.style.justifyContent = Justify.Center;
            row.style.paddingTop = 14;
            foreach (int id in pending.OverdrawIds)
            {
                int captured = id;
                row.Add(CardView.Card(S.Cards.Get(captured), CardView.Size.Hand,
                    onClick: () => Dispatch(new ChooseOverdraw(captured))));
            }
            scroll.Add(row);
            d.Add(scroll);
            o.Add(d);
            return o;
        }

        /// <summary>The folded overdraw: a top-center chip over a fully live board.</summary>
        private VisualElement OverdrawHiddenChip()
        {
            // NOT an overlay — the board and hand stay visible and readable beneath.
            var wrap = new VisualElement();
            wrap.style.position = Position.Absolute;
            wrap.style.top = 8;
            wrap.style.left = 0; wrap.style.right = 0;
            wrap.style.alignItems = Align.Center;
            wrap.pickingMode = PickingMode.Ignore; // only the chip itself eats clicks

            var chip = new Label("SHOW OVERDRAW");
            chip.style.backgroundColor = Theme.Night;
            Theme.SetBorder(chip, Theme.Gold, 1.5f);
            Theme.SetRadius(chip, 6);
            Theme.SetPadding(chip, 6, 14);
            chip.style.color = Theme.GoldBright;
            chip.style.fontSize = 12;
            chip.style.letterSpacing = 2;
            chip.style.unityFontStyleAndWeight = FontStyle.Bold;
            chip.RegisterCallback<ClickEvent>(_ => { _hideOverdraw = false; Render(); });
            chip.RegisterCallback<MouseEnterEvent>(_ => Theme.SetBorder(chip, Theme.GoldBright, 1.5f));
            chip.RegisterCallback<MouseLeaveEvent>(_ => Theme.SetBorder(chip, Theme.Gold, 1.5f));
            wrap.Add(chip);
            return wrap;
        }

        private VisualElement RoyalKeepDialog(PendingChoice pending)
        {
            var o = Overlay();
            string title = pending.RoyalRank == Rank.King ? "CLAIM YOUR CROWN"
                : pending.PickIsLeave ? "CHOOSE WHO IS LEFT BEHIND"
                : "WHO FOLLOWS YOU?";
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

            // Leave-mode is the ONE dialog where clicking a royal is a rejection —
            // it must be impossible to misread (audit J2: same click, opposite
            // stakes at different gates).
            if (pending.PickIsLeave)
            {
                var strip = new VisualElement();
                strip.style.backgroundColor = new Color(Theme.RedDeep.r, Theme.RedDeep.g, Theme.RedDeep.b, 0.35f);
                Theme.SetBorder(strip, Theme.RedBright, 1);
                Theme.SetRadius(strip, 6);
                Theme.SetPadding(strip, 6, 12);
                strip.style.marginBottom = 8;
                var stripText = new Label("you are choosing who is LEFT BEHIND — the click BANISHES");
                stripText.style.color = Theme.RedBright;
                stripText.style.unityFontStyleAndWeight = FontStyle.Bold;
                stripText.style.unityTextAlign = TextAnchor.MiddleCenter;
                strip.Add(stripText);
                d.Add(strip);
            }

            var row = Row();
            row.style.justifyContent = Justify.Center;
            foreach (Suit suit in pending.Eligible)
            {
                Suit captured = suit;
                bool leaveMode = pending.PickIsLeave;

                var wrap = new VisualElement();
                wrap.style.alignItems = Align.Center;
                wrap.style.marginRight = 8;
                wrap.style.paddingTop = 14;
                Theme.SetPadding(wrap, 6, 6);
                Theme.SetRadius(wrap, 10);
                Theme.SetBorder(wrap, Color.clear, 2);

                wrap.Add(CardView.Face(new CardFace(suit, pending.RoyalRank), CardView.Size.Large,
                    () => Dispatch(new ChooseRoyal(captured))));

                // The click's ACTION, written under every face.
                var action = new Label(leaveMode ? "LEAVE THIS ONE"
                    : pending.RoyalRank == Rank.King ? "CLAIM AS CROWN" : "KEEPS THIS ONE");
                action.style.fontSize = 11;
                action.style.letterSpacing = 2;
                action.style.unityFontStyleAndWeight = FontStyle.Bold;
                action.style.color = leaveMode ? Theme.RedBright : Theme.GoldBright;
                action.style.marginTop = 4;
                wrap.Add(action);

                // Leave-mode hover frames the whole face in red — the wrapper owns
                // the tint so CardView stays untouched.
                wrap.RegisterCallback<MouseEnterEvent>(_ =>
                    Theme.SetBorder(wrap, leaveMode ? Theme.RedBright : Theme.GoldBright, 2));
                wrap.RegisterCallback<MouseLeaveEvent>(_ =>
                    Theme.SetBorder(wrap, Color.clear, 2));

                row.Add(wrap);
            }
            d.Add(row);
            o.Add(d);
            return o;
        }

        private VisualElement RecoverSelectDialog(PendingChoice pending)
        {
            var o = Overlay();
            var d = Dialog("TRIAGE");
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
            var d = Dialog("LAST RITES");
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
            bool chapter = pending.RelicSource == "chapter clear";
            var d = Dialog(chapter ? "SPOILS OF CONQUEST" : "THE RAID PAYS OFF");
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

    }
}
