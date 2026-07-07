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

        /// <summary>True while a hand card is being dragged — hover effects stand down
        /// so they can't fight the drag translate (the rubber-band bug).</summary>
        public static bool DragLock;

        private static (float w, float h, float pip, float corner) Dim(Size s) => s switch
        {
            Size.Small => (72f, 100f, 34f, 13f),
            Size.Large => (150f, 210f, 76f, 24f),
            _ => (104f, 146f, 52f, 17f),
        };

        /// <summary>Four-colour deck: nothing shares a colour (user call).</summary>
        public static Color SuitColor(Suit suit) => suit switch
        {
            Suit.Hearts => Theme.RedSuit,
            Suit.Diamonds => Theme.Hex("#2e5fa3"), // ♦ blue
            Suit.Clubs => Theme.Hex("#3d7a34"),    // ♣ green
            _ => Theme.Hex("#26232b"),             // ♠ ink
        };

        /// <summary>The font draws ♥ noticeably larger than the other pips — compensate.
        /// (0.86 wasn't enough per playtest; 0.78 tuned by eye.)</summary>
        public static float GlyphScale(Suit suit) => suit == Suit.Hearts ? 0.78f : 1f;

        // ── faces ───────────────────────────────────────────────────────────────

        /// <summary>A plain face (enemy lineups, royal keeps, hunt quarry …).</summary>
        public static VisualElement Face(CardFace face, Size size = Size.Hand, Action onClick = null)
        {
            var card = Blank(size, onClick);
            PaintFace(card, face.Suit, PhysicalCard.RankGlyph(face.Rank), size);
            Tips.Attach(card,
                $"{PhysicalCard.Pretty(face)} — value {CardRules.AttackValue(face.Rank)}",
                ContentText.SuitPower(face.Suit) +
                "\nenemies of a suit BLOCK that suit's power (the value still counts)");
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

            Tips.Attach(card, () =>
            {
                var effNow = c.EffectiveFace();
                var body = new System.Text.StringBuilder();
                foreach (var s in c.EffectiveSuits())
                    body.AppendLine(ContentText.SuitPower(s));
                if (!effNow.Equals(c.Printed) || c.Grafts.Count > 0)
                {
                    body.AppendLine();
                    body.AppendLine($"printed {PhysicalCard.Pretty(c.Printed)} — conquest rewrote it:");
                    foreach (var g in c.Grafts)
                        body.AppendLine($"· {g.Kind} from {g.Source}");
                }
                if (c.ValueModifier != 0)
                    body.AppendLine($"value token {(c.ValueModifier > 0 ? "+" : "")}{c.ValueModifier}");
                return ($"{PhysicalCard.Pretty(effNow)} — value {c.EffectiveValue()}",
                        body.ToString().TrimEnd());
            });
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
            var pip = new Label("♠"); // a proven glyph — ❖ is tofu in the runtime font
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
                    if (DragLock) return;
                    card.style.translate = new Translate(0, -10);
                    Theme.SetBorder(card, Theme.GoldBright, 2.5f);
                });
                card.RegisterCallback<MouseLeaveEvent>(_ =>
                {
                    if (DragLock) return;
                    card.style.translate = new Translate(0, 0);
                    // Re-render restores the true border; a light reset is enough here.
                    Theme.SetBorder(card, Theme.Ink, 2);
                });
            }
            return card;
        }

        /// <summary>
        /// The face reads from the centre only (user call — no corner indices):
        /// the rank big, the suit pip right under it, both in the suit's colour.
        /// </summary>
        private static void PaintFace(VisualElement card, Suit suit, string rank, Size size)
        {
            var (w, h, pipSize, _) = Dim(size);
            var color = SuitColor(suit);

            var col = new VisualElement();
            col.pickingMode = PickingMode.Ignore;
            col.style.position = Position.Absolute;
            col.style.left = 0; col.style.right = 0; col.style.top = 0; col.style.bottom = 0;
            col.style.alignItems = Align.Center;
            col.style.justifyContent = Justify.Center;

            var r = new Label(rank);
            r.style.fontSize = pipSize * (rank.Length > 1 ? 0.74f : 0.92f); // "10" still fits
            r.style.color = color;
            r.style.unityFontStyleAndWeight = FontStyle.Bold;
            r.style.unityTextAlign = TextAnchor.MiddleCenter;
            col.Add(r);

            var pip = new Label(PhysicalCard.SuitGlyph(suit));
            pip.style.fontSize = pipSize * 0.55f * GlyphScale(suit);
            pip.style.color = new Color(color.r, color.g, color.b, 0.9f);
            pip.style.unityTextAlign = TextAnchor.MiddleCenter;
            pip.style.marginTop = -pipSize * 0.10f;
            col.Add(pip);

            card.Add(col);
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

        /// <summary>
        /// Kill forecast on a hand card: gold pulse = playing it is an EXACT kill,
        /// dim red = it would overkill (reward lost). Purely presentational.
        /// </summary>
        public static void MarkKillGlow(VisualElement card, bool exact)
        {
            var color = exact ? Theme.GoldBright : new Color(Theme.RedDeep.r, Theme.RedDeep.g, Theme.RedDeep.b, 0.9f);
            Theme.SetBorder(card, color, 3);
            if (exact)
            {
                // A soft breathing pulse — the invitation, not a alarm.
                card.experimental.animation.Start(0f, 1f, 1200, (el, t) =>
                {
                    float breathe = 0.5f + 0.5f * Mathf.Sin(t * Mathf.PI * 2f);
                    Theme.SetBorder(el, Color.Lerp(Theme.Gold, Theme.GoldPale, breathe), 3);
                });
            }
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
