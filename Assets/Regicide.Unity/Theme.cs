using System;
using UnityEngine;
using UnityEngine.UIElements;

namespace Regicide.Unity
{
    /// <summary>
    /// The Kingfall look (Slay-the-Spire-inspired, palette lifted from the web
    /// prototype): deep indigo night, gold trim, parchment text, deep-red accents.
    /// Every screen builds from these helpers so the game reads as one artifact.
    /// All procedural — no image assets; shapes come from borders, radii and
    /// Painter2D. Keep rules OUT of here: this file is only paint.
    /// </summary>
    public static class Theme
    {
        // ── palette (web prototype style.css) ───────────────────────────────────
        public static readonly Color Night = Hex("#171228");
        public static readonly Color NightDeep = Hex("#0f0b1c");
        public static readonly Color NightPanel = Hex("#221a38");
        public static readonly Color NightRaised = Hex("#2c2547");
        public static readonly Color Gold = Hex("#c9a227");
        public static readonly Color GoldDim = Hex("#8a6d1c");
        public static readonly Color GoldBright = Hex("#e8cd6f");
        public static readonly Color GoldPale = Hex("#fff3c4");
        public static readonly Color Parchment = Hex("#f2ead9");
        public static readonly Color ParchmentDim = Hex("#d9bf84");
        public static readonly Color Ink = Hex("#221c14");
        public static readonly Color RedSuit = Hex("#a8332f");
        public static readonly Color RedDeep = Hex("#7d2a2a");
        public static readonly Color RedBright = Hex("#c14444");
        public static readonly Color Green = Hex("#538f48");
        public static readonly Color Blue = Hex("#4a7ac4");
        public static readonly Color Shield = Hex("#6f9fe3");
        public static readonly Color Grey = Hex("#6b6478");

        public static Color Hex(string hex)
        {
            ColorUtility.TryParseHtmlString(hex, out var c);
            return c;
        }

        private static Color Fade(Color c, float a) => new Color(c.r, c.g, c.b, a);

        // ── root chrome ─────────────────────────────────────────────────────────

        /// <summary>
        /// Night background: gold breath up top, red below, film-grain noise and a
        /// radial vignette (the web prototype's exact recipe, textures generated
        /// at runtime — see <see cref="Textures"/>).
        /// </summary>
        public static void Background(VisualElement root)
        {
            root.style.backgroundColor = Night;
            root.style.color = Parchment;

            var glowTop = new VisualElement();
            glowTop.pickingMode = PickingMode.Ignore;
            glowTop.style.position = Position.Absolute;
            glowTop.style.left = 0; glowTop.style.right = 0; glowTop.style.top = 0;
            glowTop.style.height = Length.Percent(28);
            glowTop.style.backgroundColor = Fade(Gold, 0.05f);
            root.Add(glowTop);

            var glowBottom = new VisualElement();
            glowBottom.pickingMode = PickingMode.Ignore;
            glowBottom.style.position = Position.Absolute;
            glowBottom.style.left = 0; glowBottom.style.right = 0; glowBottom.style.bottom = 0;
            glowBottom.style.height = Length.Percent(24);
            glowBottom.style.backgroundColor = Fade(RedDeep, 0.08f);
            root.Add(glowBottom);

            var grain = new VisualElement();
            grain.pickingMode = PickingMode.Ignore;
            grain.style.position = Position.Absolute;
            grain.style.left = 0; grain.style.right = 0; grain.style.top = 0; grain.style.bottom = 0;
            grain.style.backgroundImage = new StyleBackground(Textures.Noise());
            grain.style.backgroundRepeat = new BackgroundRepeat(Repeat.Repeat, Repeat.Repeat);
            grain.style.backgroundSize = new BackgroundSize(128, 128);
            root.Add(grain);

            var vignette = new VisualElement();
            vignette.pickingMode = PickingMode.Ignore;
            vignette.style.position = Position.Absolute;
            vignette.style.left = 0; vignette.style.right = 0; vignette.style.top = 0; vignette.style.bottom = 0;
            vignette.style.backgroundImage = new StyleBackground(Textures.Vignette());
            root.Add(vignette);
        }

        // ── framed panel ────────────────────────────────────────────────────────

        public static VisualElement Frame(string title = null)
        {
            var v = new VisualElement();
            v.style.backgroundColor = NightPanel;
            SetBorder(v, GoldDim, 1);
            SetRadius(v, 8);
            SetPadding(v, 10);
            v.style.marginBottom = 8;
            if (title != null) v.Add(FrameTitle(title));
            return v;
        }

        public static Label FrameTitle(string title)
        {
            var t = new Label(title.ToUpperInvariant());
            t.style.color = Gold;
            t.style.fontSize = 12;
            t.style.letterSpacing = 2;
            t.style.unityFontStyleAndWeight = FontStyle.Bold;
            t.style.marginBottom = 6;
            return t;
        }

        /// <summary>Quiet single-line info text — the minimalist alternative to chip rows.</summary>
        public static Label Subtle(string text)
        {
            var l = new Label(text);
            l.style.fontSize = 11;
            l.style.color = ParchmentDim;
            l.style.letterSpacing = 1;
            return l;
        }

        public static Label Title(string text, int size = 30)
        {
            var l = new Label(text);
            l.style.color = GoldBright;
            l.style.fontSize = size;
            l.style.unityFontStyleAndWeight = FontStyle.Bold;
            l.style.unityTextAlign = TextAnchor.MiddleCenter;
            l.style.marginBottom = 8;
            return l;
        }

        // ── buttons ─────────────────────────────────────────────────────────────

        public enum ButtonKind { Normal, Primary, Danger, Ghost }

        public static Button Button(string text, Action onClick, ButtonKind kind = ButtonKind.Normal, bool enabled = true)
        {
            var b = new Button(() => { Sfx.Play(Sfx.Sound.Click, 0.7f); onClick?.Invoke(); }) { text = text };
            b.SetEnabled(enabled);
            SetRadius(b, 6);
            SetPadding(b, 6, 12);
            b.style.marginRight = 4;
            b.style.marginBottom = 4;
            b.style.unityFontStyleAndWeight = FontStyle.Bold;

            Color bg, border, fg;
            switch (kind)
            {
                case ButtonKind.Primary: bg = Hex("#3d3113"); border = Gold; fg = GoldPale; break;
                case ButtonKind.Danger: bg = Hex("#3a1815"); border = RedBright; fg = Hex("#f3d7d2"); break;
                case ButtonKind.Ghost: bg = Fade(NightRaised, 0.4f); border = Fade(Grey, 0.6f); fg = ParchmentDim; break;
                default: bg = NightRaised; border = GoldDim; fg = Parchment; break;
            }
            b.style.backgroundColor = enabled ? bg : Fade(bg, 0.4f);
            if (enabled)
                b.style.backgroundImage = new StyleBackground(
                    Textures.Gradient(Lighten(bg, 0.10f), Color.Lerp(bg, Color.black, 0.25f)));
            SetBorder(b, enabled ? border : Fade(border, 0.35f), 1);
            b.style.color = enabled ? fg : Fade(fg, 0.45f);

            if (enabled)
            {
                Fx.Transition(b, 90);
                b.RegisterCallback<MouseEnterEvent>(_ =>
                {
                    SetBorder(b, kind == ButtonKind.Danger ? RedBright : GoldBright, 1);
                    b.style.scale = new Scale(new Vector3(1.04f, 1.04f, 1f));
                });
                b.RegisterCallback<MouseLeaveEvent>(_ =>
                {
                    SetBorder(b, border, 1);
                    b.style.scale = new Scale(Vector3.one);
                });
                b.RegisterCallback<MouseDownEvent>(_ => b.style.scale = new Scale(new Vector3(0.97f, 0.97f, 1f)), TrickleDown.TrickleDown);
                b.RegisterCallback<MouseUpEvent>(_ => b.style.scale = new Scale(Vector3.one), TrickleDown.TrickleDown);
            }
            return b;
        }

        // ── chips & bars ────────────────────────────────────────────────────────

        /// <summary>A small stat chip: "♦ 3", "shield 12", "ch4 · P1" …</summary>
        public static VisualElement Chip(string text, Color? tint = null)
        {
            var v = new VisualElement();
            v.style.flexDirection = FlexDirection.Row;
            v.style.backgroundColor = Fade(tint ?? NightRaised, tint == null ? 1f : 0.25f);
            SetBorder(v, Fade(tint ?? Grey, 0.8f), 1);
            SetRadius(v, 10);
            SetPadding(v, 2, 8);
            v.style.marginRight = 4;
            v.style.marginBottom = 2;
            var l = new Label(text);
            l.style.fontSize = 12;
            l.style.color = tint == null ? Parchment : Color.Lerp(tint.Value, Color.white, 0.55f);
            v.Add(l);
            return v;
        }

        /// <summary>Horizontal bar with a centred label — HP, payment progress, etc.</summary>
        public static VisualElement Bar(float fraction, string label, Color fill, float width = 220, float height = 20)
        {
            var track = new VisualElement();
            track.style.width = width;
            track.style.height = height;
            track.style.backgroundColor = NightDeep;
            SetBorder(track, Ink, 1);
            SetRadius(track, height / 2f);
            track.style.overflow = Overflow.Hidden;

            var f = new VisualElement();
            f.style.position = Position.Absolute;
            f.style.left = 0; f.style.top = 0; f.style.bottom = 0;
            f.style.width = Length.Percent(Mathf.Clamp01(fraction) * 100f);
            f.style.backgroundColor = fill;
            track.Add(f);

            var l = new Label(label);
            l.style.position = Position.Absolute;
            l.style.left = 0; l.style.right = 0; l.style.top = 0; l.style.bottom = 0;
            l.style.unityTextAlign = TextAnchor.MiddleCenter;
            l.style.fontSize = 12;
            l.style.unityFontStyleAndWeight = FontStyle.Bold;
            l.style.color = Color.white;
            track.Add(l);
            return track;
        }

        // ── style utilities ─────────────────────────────────────────────────────

        public static Color Lighten(Color c, float amount) => Color.Lerp(c, Color.white, amount);

        public static void SetBorder(VisualElement v, Color color, float width)
        {
            v.style.borderLeftColor = color; v.style.borderRightColor = color;
            v.style.borderTopColor = color; v.style.borderBottomColor = color;
            v.style.borderLeftWidth = width; v.style.borderRightWidth = width;
            v.style.borderTopWidth = width; v.style.borderBottomWidth = width;
        }

        public static void SetRadius(VisualElement v, float r)
        {
            v.style.borderTopLeftRadius = r; v.style.borderTopRightRadius = r;
            v.style.borderBottomLeftRadius = r; v.style.borderBottomRightRadius = r;
        }

        public static void SetPadding(VisualElement v, float all) => SetPadding(v, all, all);

        public static void SetPadding(VisualElement v, float vertical, float horizontal)
        {
            v.style.paddingTop = vertical; v.style.paddingBottom = vertical;
            v.style.paddingLeft = horizontal; v.style.paddingRight = horizontal;
        }
    }
}
