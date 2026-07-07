using System;
using UnityEngine;
using UnityEngine.UIElements;
using UnityEngine.UIElements.Experimental;

namespace Regicide.Unity
{
    /// <summary>
    /// One-shot juice (§10 "Balatro-style trigger feedback"): floating combat
    /// numbers, toasts, shakes, pop-ins and fades — all driven by the events a
    /// Dispatch returns, layered on an absolute FX element above the screen.
    /// Purely visual; nothing here reads or writes rules state.
    /// </summary>
    public static class Fx
    {
        /// <summary>Smooth style transitions (hover lift, colour eases) on an element.</summary>
        public static void Transition(VisualElement e, int ms = 110)
        {
            e.style.transitionProperty = new System.Collections.Generic.List<StylePropertyName>
            {
                new StylePropertyName("translate"),
                new StylePropertyName("scale"),
                new StylePropertyName("opacity"),
            };
            e.style.transitionDuration = new System.Collections.Generic.List<TimeValue>
            {
                new TimeValue(ms, TimeUnit.Millisecond),
            };
            e.style.transitionTimingFunction = new System.Collections.Generic.List<EasingFunction>
            {
                new EasingFunction(EasingMode.EaseOutCubic),
            };
        }

        /// <summary>A number/word that rises from an anchor and fades (damage, shield…).</summary>
        public static void Float(VisualElement layer, VisualElement anchor, string text, Color color, int fontSize = 26, float dx = 0, float dy = 0)
        {
            if (layer == null || layer.panel == null) return;
            var l = new Label(text);
            l.pickingMode = PickingMode.Ignore;
            l.style.position = Position.Absolute;
            l.style.fontSize = fontSize;
            l.style.color = color;
            l.style.unityFontStyleAndWeight = FontStyle.Bold;
            // Faux outline for readability over anything.
            l.style.textShadow = new TextShadow { offset = new Vector2(1.5f, 1.5f), blurRadius = 2f, color = new Color(0, 0, 0, 0.9f) };
            layer.Add(l);

            Vector2 p = anchor != null && anchor.panel != null
                ? layer.WorldToLocal(anchor.worldBound.center)
                : layer.WorldToLocal(layer.worldBound.center);
            l.style.left = p.x - 40 + dx;
            l.style.top = p.y - fontSize + dy;
            l.style.minWidth = 80;
            l.style.unityTextAlign = TextAnchor.MiddleCenter;

            l.experimental.animation.Start(0f, 1f, 950, (el, t) =>
            {
                el.style.translate = new Translate(0, -55f * EaseOut(t));
                el.style.opacity = 1f - t * t;
                el.style.scale = new Scale(Vector3.one * (1f + 0.25f * (1f - t)));
            });
            layer.schedule.Execute(() => l.RemoveFromHierarchy()).ExecuteLater(1000);
        }

        /// <summary>A banner that drops in top-centre and fades — kills, recruits, spells.</summary>
        public static void Toast(VisualElement layer, string text, Color tint, int slot = 0)
        {
            if (layer == null || layer.panel == null) return;
            var box = new VisualElement();
            box.pickingMode = PickingMode.Ignore;
            box.style.position = Position.Absolute;
            box.style.top = 64 + slot * 40;
            box.style.left = 0; box.style.right = 0;
            box.style.alignItems = Align.Center;
            layer.Add(box);

            var chip = new VisualElement();
            chip.style.backgroundColor = new Color(Theme.NightDeep.r, Theme.NightDeep.g, Theme.NightDeep.b, 0.92f);
            Theme.SetBorder(chip, tint, 1.5f);
            Theme.SetRadius(chip, 16);
            Theme.SetPadding(chip, 5, 16);
            var l = new Label(text);
            l.style.color = Color.Lerp(tint, Color.white, 0.45f);
            l.style.fontSize = 15;
            l.style.unityFontStyleAndWeight = FontStyle.Bold;
            chip.Add(l);
            box.Add(chip);

            box.experimental.animation.Start(0f, 1f, 260, (el, t) =>
            {
                el.style.opacity = t;
                el.style.translate = new Translate(0, -14f * (1f - EaseOut(t)));
            });
            layer.schedule.Execute(() =>
                box.experimental.animation.Start(0f, 1f, 350, (el, t) =>
                {
                    el.style.opacity = 1f - t;
                    el.style.translate = new Translate(0, -10f * t);
                })).ExecuteLater(1500 + slot * 220);
            layer.schedule.Execute(() => box.RemoveFromHierarchy()).ExecuteLater(2000 + slot * 220);
        }

        /// <summary>
        /// An attack lunge: dart out (fast) toward the target, recover (slow).
        /// The enemy card striking the player, mostly.
        /// </summary>
        public static void Lunge(VisualElement e, float dx, float dy, int ms = 380)
        {
            if (e == null || e.panel == null) return;
            e.experimental.animation.Start(0f, 1f, ms, (el, t) =>
            {
                float phase = t < 0.35f ? t / 0.35f : 1f - (t - 0.35f) / 0.65f;
                float ease = phase * phase * (3f - 2f * phase); // smoothstep both ways
                el.style.translate = new Translate(dx * ease, dy * ease);
                el.style.scale = new Scale(Vector3.one * (1f + 0.12f * ease));
            });
        }

        /// <summary>Impact wiggle — hit enemies, rejected actions.</summary>
        public static void Shake(VisualElement e, float strength = 7f)
        {
            if (e == null || e.panel == null) return;
            e.experimental.animation.Start(0f, 1f, 320, (el, t) =>
            {
                float damp = 1f - t;
                el.style.translate = new Translate(Mathf.Sin(t * 28f) * strength * damp, 0);
            });
        }

        /// <summary>Scale/opacity entrance for freshly drawn cards etc.</summary>
        public static void PopIn(VisualElement e, int delayMs = 0)
        {
            // Never dim an element whose animation can't run — an invisible card
            // reads as "the draw never happened".
            if (e == null || e.panel == null) return;
            e.style.opacity = 0f;
            e.schedule.Execute(() =>
                e.experimental.animation.Start(0f, 1f, 240, (el, t) =>
                {
                    el.style.opacity = t;
                    el.style.scale = new Scale(Vector3.one * (0.82f + 0.18f * EaseOut(t)));
                })).ExecuteLater(delayMs);
        }

        /// <summary>
        /// Pile-to-pile card stream (the shuffle cue): little card-backs arc from
        /// one pile icon to the other while both piles pulse.
        /// </summary>
        public static void FlyPile(VisualElement layer, VisualElement from, VisualElement to, int count)
        {
            if (layer == null || layer.panel == null ||
                from == null || from.panel == null || to == null || to.panel == null) return;

            Vector2 a = layer.WorldToLocal(from.worldBound.center);
            Vector2 b = layer.WorldToLocal(to.worldBound.center);

            void Pulse(VisualElement pile, int delay)
            {
                layer.schedule.Execute(() =>
                    pile.experimental.animation.Start(0f, 1f, 300, (el, t) =>
                    {
                        float bump = Mathf.Sin(t * Mathf.PI);
                        el.style.scale = new Scale(Vector3.one * (1f + 0.16f * bump));
                    })).ExecuteLater(delay);
            }
            Pulse(from, 0);
            Pulse(to, 260);

            for (int i = 0; i < count; i++)
            {
                var ghost = CardView.Back(CardView.Size.Small);
                ghost.pickingMode = PickingMode.Ignore;
                ghost.style.position = Position.Absolute;
                ghost.style.left = a.x - 20;
                ghost.style.top = a.y - 28;
                ghost.style.scale = new Scale(Vector3.one * 0.5f);
                ghost.style.opacity = 0f;
                layer.Add(ghost);

                var g = ghost;
                Vector2 delta = b - a;
                float arcLift = 26f + (i % 3) * 10f;
                layer.schedule.Execute(() =>
                    g.experimental.animation.Start(0f, 1f, 260, (el, t) =>
                    {
                        float e = 1f - (1f - t) * (1f - t);
                        el.style.opacity = t < 0.15f ? t / 0.15f : 1f - Mathf.Max(0f, (t - 0.8f) / 0.2f);
                        el.style.translate = new Translate(delta.x * e, delta.y * e - arcLift * Mathf.Sin(Mathf.PI * e));
                    })).ExecuteLater(i * 55);
                layer.schedule.Execute(() => g.RemoveFromHierarchy()).ExecuteLater(330 + i * 55);
            }
        }

        /// <summary>Fade a whole screen in on phase changes.</summary>
        public static void FadeIn(VisualElement screen, int ms = 240)
        {
            if (screen == null) return;
            screen.style.opacity = 0f;
            screen.experimental.animation.Start(0f, 1f, ms, (el, t) => el.style.opacity = t);
        }

        /// <summary>Full-screen colour flash (death, crowning).</summary>
        public static void Flash(VisualElement layer, Color color, int ms = 500)
        {
            if (layer == null || layer.panel == null) return;
            var v = new VisualElement();
            v.pickingMode = PickingMode.Ignore;
            v.style.position = Position.Absolute;
            v.style.left = 0; v.style.right = 0; v.style.top = 0; v.style.bottom = 0;
            v.style.backgroundColor = color;
            layer.Add(v);
            v.experimental.animation.Start(0f, 1f, ms, (el, t) => el.style.opacity = 0.55f * (1f - t));
            layer.schedule.Execute(() => v.RemoveFromHierarchy()).ExecuteLater(ms + 40);
        }

        private static float EaseOut(float t) => 1f - (1f - t) * (1f - t) * (1f - t);
    }
}
