using System;
using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;
using Regicide.Core;

namespace Regicide.Unity
{
    /// <summary>
    /// Renders standard-52 cards as actual cards (§16): parchment face, suit-coloured
    /// rank corners, a big centre pip, gold trim on grafted cards, badges for added
    /// suits / rank rewrites / value tokens. Printed-vs-effective is readable at a
    /// glance; internal balance numbers never appear. Pure paint — no rules.
    /// </summary>
    public static class CardView
    {
        public enum Size { Small, Hand, Large }

        private static (float w, float h, float pip, float corner) Dim(Size s) => s switch
        {
            Size.Small => (72f, 100f, 34f, 13f),
            Size.Large => (150f, 210f, 76f, 24f),
            _ => (104f, 146f, 52f, 17f),
        };

        public static Color SuitColor(Suit suit) =>
            suit == Suit.Hearts || suit == Suit.Diamonds ? Theme.RedSuit : Theme.Hex("#26232b");

        // ── faces ───────────────────────────────────────────────────────────────

        /// <summary>A plain face (enemy lineups, royal keeps, hunt quarry …).</summary>
        public static VisualElement Face(CardFace face, Size size = Size.Hand, Action onClick = null)
        {
            var card = Blank(size, onClick);
            PaintFace(card, face.Suit, PhysicalCard.RankGlyph(face.Rank), size);
            return card;
        }

        /// <summary>
        /// An owned PhysicalCard: effective face front and centre, plus graft badges
        /// and a small printed-face footnote when conquest has rewritten it.
        /// </summary>
        public static VisualElement Card(PhysicalCard c, Size size = Size.Hand, Action onClick = null, bool selected = false)
        {
            var eff = c.EffectiveFace();
            var card = Blank(size, onClick);
            bool rewritten = !eff.Equals(c.Printed) || c.Grafts.Count > 0 || c.ValueModifier != 0;

            PaintFace(card, eff.Suit, PhysicalCard.RankGlyph(eff.Rank), size);

            // Suit-add badges: every extra suit this card fires (§5).
            var extraSuits = c.EffectiveSuits().Where(s => s != eff.Suit).ToList();
            if (extraSuits.Count > 0 || c.ValueModifier != 0)
            {
                var row = new VisualElement();
                row.style.position = Position.Absolute;
                row.style.left = 4; row.style.bottom = size == Size.Small ? 3 : 20;
                row.style.flexDirection = FlexDirection.Row;
                foreach (var s in extraSuits)
                    row.Add(Badge("+" + PhysicalCard.SuitGlyph(s), SuitColor(s)));
                if (c.ValueModifier != 0)
                    row.Add(Badge(c.ValueModifier > 0 ? "+" + c.ValueModifier : c.ValueModifier.ToString(), Theme.RedDeep));
                card.Add(row);
            }

            if (rewritten)
            {
                Theme.SetBorder(card, Theme.Gold, size == Size.Small ? 1.5f : 2f);
                if (size != Size.Small && !eff.Equals(c.Printed))
                {
                    var printed = new Label($"printed {PhysicalCard.Pretty(c.Printed)}");
                    printed.style.position = Position.Absolute;
                    printed.style.left = 0; printed.style.right = 0; printed.style.bottom = 3;
                    printed.style.unityTextAlign = TextAnchor.MiddleCenter;
                    printed.style.fontSize = 9;
                    printed.style.color = Theme.Hex("#8a7d5c");
                    printed.style.unityFontStyleAndWeight = FontStyle.Italic;
                    card.Add(printed);
                }
            }

            if (selected) MarkSelected(card);
            return card;
        }

        /// <summary>A face-down card back (deck stacks, unknowns).</summary>
        public static VisualElement Back(Size size = Size.Small)
        {
            var (w, h, _, _) = Dim(size);
            var card = new VisualElement();
            card.style.width = w; card.style.height = h;
            card.style.backgroundColor = Theme.NightRaised;
            card.style.backgroundImage = new StyleBackground(Textures.Lattice());
            card.style.backgroundRepeat = new BackgroundRepeat(Repeat.Repeat, Repeat.Repeat);
            card.style.backgroundSize = new BackgroundSize(24, 24);
            Theme.SetBorder(card, Theme.GoldDim, 2);
            Theme.SetRadius(card, 8);
            card.style.overflow = Overflow.Hidden;
            card.style.alignItems = Align.Center;
            card.style.justifyContent = Justify.Center;
            var pip = new Label("❖");
            pip.style.color = Theme.GoldDim;
            pip.style.fontSize = Dim(size).pip * 0.6f;
            card.Add(pip);
            return card;
        }

        private static VisualElement Blank(Size size, Action onClick)
        {
            var (w, h, _, _) = Dim(size);
            var card = new VisualElement();
            card.style.width = w; card.style.height = h;
            card.style.backgroundColor = Theme.Parchment;
            card.style.backgroundImage = new StyleBackground(Textures.Parchment());
            card.style.backgroundRepeat = new BackgroundRepeat(Repeat.Repeat, Repeat.Repeat);
            card.style.backgroundSize = new BackgroundSize(96, 96);
            Theme.SetBorder(card, Theme.Ink, size == Size.Small ? 1.5f : 2f);
            Theme.SetRadius(card, size == Size.Large ? 12 : 8);
            card.style.marginRight = 4;
            card.style.marginBottom = 4;
            card.style.flexShrink = 0;

            if (onClick != null)
            {
                Fx.Transition(card, 120);
                card.RegisterCallback<ClickEvent>(_ => onClick());
                card.RegisterCallback<MouseEnterEvent>(_ =>
                {
                    card.style.translate = new Translate(0, -10);
                    Theme.SetBorder(card, Theme.GoldBright, 2.5f);
                });
                card.RegisterCallback<MouseLeaveEvent>(_ =>
                {
                    card.style.translate = new Translate(0, 0);
                    // Re-render restores the true border; a light reset is enough here.
                    Theme.SetBorder(card, Theme.Ink, 2);
                });
            }
            return card;
        }

        private static void PaintFace(VisualElement card, Suit suit, string rank, Size size)
        {
            var (w, h, pipSize, cornerSize) = Dim(size);
            var color = SuitColor(suit);
            string glyph = PhysicalCard.SuitGlyph(suit);

            var pip = new Label(glyph);
            pip.style.position = Position.Absolute;
            pip.style.left = 0; pip.style.right = 0; pip.style.top = 0; pip.style.bottom = 0;
            pip.style.unityTextAlign = TextAnchor.MiddleCenter;
            pip.style.fontSize = pipSize;
            pip.style.color = new Color(color.r, color.g, color.b, 0.85f);
            pip.pickingMode = PickingMode.Ignore;
            card.Add(pip);

            card.Add(Corner(rank, glyph, color, cornerSize, false, size));
            if (size != Size.Small) card.Add(Corner(rank, glyph, color, cornerSize, true, size));
        }

        private static VisualElement Corner(string rank, string glyph, Color color, float fontSize, bool flipped, Size size)
        {
            var v = new VisualElement();
            v.style.position = Position.Absolute;
            v.pickingMode = PickingMode.Ignore;
            if (!flipped) { v.style.left = 5; v.style.top = 2; }
            else
            {
                v.style.right = 5; v.style.bottom = 2;
                v.style.rotate = new Rotate(180);
            }
            var r = new Label(rank + glyph);
            r.style.fontSize = fontSize;
            r.style.color = color;
            r.style.unityFontStyleAndWeight = FontStyle.Bold;
            v.Add(r);
            return v;
        }

        private static VisualElement Badge(string text, Color tint)
        {
            var b = new VisualElement();
            b.style.backgroundColor = tint;
            Theme.SetRadius(b, 7);
            Theme.SetPadding(b, 0, 4);
            b.style.marginRight = 2;
            var l = new Label(text);
            l.style.fontSize = 11;
            l.style.color = Color.white;
            l.style.unityFontStyleAndWeight = FontStyle.Bold;
            b.Add(l);
            return b;
        }

        public static void MarkSelected(VisualElement card)
        {
            card.style.translate = new Translate(0, -16);
            Theme.SetBorder(card, Theme.GoldBright, 3);
            card.style.backgroundColor = Theme.GoldPale;
        }

        /// <summary>Slay-the-Spire hand fan: overlap + slight rotation, centred.</summary>
        public static void Fan(VisualElement handRow, int index, int count)
        {
            if (count <= 1) return;
            float mid = (count - 1) / 2f;
            float off = index - mid;
            handRow.style.rotate = new Rotate(off * Mathf.Min(4f, 24f / count));
            handRow.style.translate = new Translate(0, Mathf.Abs(off) * Mathf.Min(6f, 30f / count));
            if (index > 0) handRow.style.marginLeft = count > 7 ? -30 : -12;
        }
    }
}
