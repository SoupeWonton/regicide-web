using System;
using UnityEngine;
using UnityEngine.UIElements;

namespace Regicide.Unity
{
    /// <summary>
    /// Runtime hover tooltips. UI Toolkit's <c>tooltip</c> property is editor-only,
    /// so this is the game's own: one tip at a time, spawned on a top layer that
    /// RunApp refreshes every render (stale tips die with the layer). Content is a
    /// lazy func so values are current at hover time. Paint only — no rules.
    /// </summary>
    public static class Tips
    {
        private const int ShowDelayMs = 350;

        private static VisualElement _layer;
        private static VisualElement _tip;

        /// <summary>RunApp hands over a fresh top layer each render.</summary>
        public static void SetLayer(VisualElement layer)
        {
            HideNow();
            _layer = layer;
        }

        public static void HideNow()
        {
            if (_tip != null) _tip.RemoveFromHierarchy();
            _tip = null;
        }

        /// <summary>Static-content convenience.</summary>
        public static void Attach(VisualElement target, string title, string body) =>
            Attach(target, () => (title, body));

        public static void Attach(VisualElement target, Func<(string title, string body)> content)
        {
            IVisualElementScheduledItem pending = null;

            target.RegisterCallback<MouseEnterEvent>(_ =>
            {
                pending?.Pause();
                pending = target.schedule.Execute(() => Show(target, content));
                pending.ExecuteLater(ShowDelayMs);
            });
            target.RegisterCallback<MouseLeaveEvent>(_ =>
            {
                pending?.Pause();
                HideNow();
            });
            target.RegisterCallback<DetachFromPanelEvent>(_ =>
            {
                pending?.Pause();
                HideNow();
            });
        }

        private static void Show(VisualElement target, Func<(string title, string body)> content)
        {
            if (_layer == null || _layer.panel == null || target.panel == null) return;
            HideNow();

            var (title, body) = content();
            if (string.IsNullOrEmpty(title) && string.IsNullOrEmpty(body)) return;

            _tip = new VisualElement();
            _tip.pickingMode = PickingMode.Ignore;
            _tip.style.position = Position.Absolute;
            _tip.style.maxWidth = 300;
            _tip.style.backgroundColor = new Color(Theme.NightDeep.r, Theme.NightDeep.g, Theme.NightDeep.b, 0.97f);
            Theme.SetBorder(_tip, Theme.Gold, 1.5f);
            Theme.SetRadius(_tip, 8);
            Theme.SetPadding(_tip, 8, 12);
            _tip.style.opacity = 0f;

            if (!string.IsNullOrEmpty(title))
            {
                var t = new Label(title.ToUpperInvariant());
                t.style.color = Theme.Gold;
                t.style.fontSize = 11;
                t.style.letterSpacing = 2;
                t.style.unityFontStyleAndWeight = FontStyle.Bold;
                if (!string.IsNullOrEmpty(body)) t.style.marginBottom = 4;
                _tip.Add(t);
            }
            if (!string.IsNullOrEmpty(body))
            {
                var b = new Label(body);
                b.style.color = Theme.ParchmentDim;
                b.style.fontSize = 12;
                b.style.whiteSpace = WhiteSpace.Normal;
                _tip.Add(b);
            }

            _layer.Add(_tip);
            Rect tb = _layer.WorldToLocal(target.worldBound);

            // Place once the tip has a size: under the target on the top half of the
            // screen, above it on the bottom half, clamped inside the layer.
            _tip.schedule.Execute(() =>
            {
                if (_tip == null || _layer == null) return;
                float w = _tip.resolvedStyle.width, h = _tip.resolvedStyle.height;
                float lw = _layer.resolvedStyle.width, lh = _layer.resolvedStyle.height;
                bool below = tb.center.y < lh * 0.5f;
                float x = Mathf.Clamp(tb.center.x - w / 2f, 8f, Mathf.Max(8f, lw - w - 8f));
                float y = below ? tb.yMax + 8f : tb.yMin - h - 8f;
                y = Mathf.Clamp(y, 8f, Mathf.Max(8f, lh - h - 8f));
                _tip.style.left = x;
                _tip.style.top = y;
                _tip.experimental.animation.Start(0f, 1f, 120, (el, t) => el.style.opacity = t);
            }).ExecuteLater(10);
        }
    }
}
