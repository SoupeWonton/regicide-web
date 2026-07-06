using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;
using Regicide.Core;

namespace Regicide.Unity
{
    /// <summary>
    /// Composite widgets shared across screens: map node discs + drawn edges
    /// (Painter2D), enemy HP/intent readouts, crystal buttons. Paint only.
    /// </summary>
    public static class Widgets
    {
        // ── road map ────────────────────────────────────────────────────────────

        /// <summary>Category colour + short glyph for a node kind (fonts lack emoji — letters + colour).</summary>
        public static (string glyph, Color tint, string label) NodeStyle(RoadNodeKind kind) => kind switch
        {
            RoadNodeKind.Start => ("•", Theme.Grey, "Start"),
            RoadNodeKind.Skirmish => ("X", Theme.RedBright, "Skirmish"),
            RoadNodeKind.Veteran => ("XX", Theme.RedBright, "Veteran"),
            RoadNodeKind.Elite => ("!", Theme.RedDeep, "Elite"),
            RoadNodeKind.Boss => ("B", Theme.RedDeep, "Boss"),
            RoadNodeKind.Gate => ("G", Theme.GoldBright, "Royal Gate"),
            RoadNodeKind.Recruit => ("R", Theme.Green, "Recruit"),
            RoadNodeKind.Hunt => ("H", Theme.Green, "Hunt"),
            RoadNodeKind.Camp => ("C", Theme.Blue, "Camp"),
            RoadNodeKind.Forge => ("F", Theme.Gold, "Forge"),
            RoadNodeKind.Caravan => ("$", Theme.Gold, "Caravan"),
            RoadNodeKind.Lair => ("L", Theme.RedDeep, "Lair"),
            RoadNodeKind.Sanctum => ("S", Theme.Blue, "Sanctum"),
            RoadNodeKind.Shrine => ("+", Theme.Blue, "Shrine"),
            RoadNodeKind.Heroes => ("F", Theme.GoldBright, "Fallen Heroes"),
            _ => ("?", Theme.Grey, kind.ToString()),
        };

        /// <summary>
        /// One map node as a disc: coloured ring, glyph, states for current /
        /// reachable / visited / unknown ("?").
        /// </summary>
        public static VisualElement NodeDisc(RoadNode node, bool current, bool reachable, Action onClick)
        {
            var (glyph, tint, label) = node.Known ? NodeStyle(node.Kind) : ("?", Theme.Grey, "Unknown");
            float d = 62;

            var wrap = new VisualElement();
            wrap.style.alignItems = Align.Center;
            wrap.style.marginBottom = 10;

            var disc = new VisualElement();
            disc.style.width = d; disc.style.height = d;
            Theme.SetRadius(disc, d / 2f);
            disc.style.alignItems = Align.Center;
            disc.style.justifyContent = Justify.Center;
            disc.style.backgroundColor = node.Visited ? Theme.NightDeep : Theme.NightRaised;
            Theme.SetBorder(disc,
                current ? Theme.GoldBright : reachable ? tint : new Color(tint.r, tint.g, tint.b, 0.35f),
                current ? 3 : reachable ? 2.5f : 1.5f);

            var g = new Label(glyph);
            g.style.fontSize = 24;
            g.style.unityFontStyleAndWeight = FontStyle.Bold;
            g.style.color = node.Visited && !current
                ? Theme.Grey
                : reachable || current ? Color.Lerp(tint, Color.white, 0.35f) : new Color(tint.r, tint.g, tint.b, 0.5f);
            disc.Add(g);

            if (reachable && onClick != null)
            {
                disc.RegisterCallback<ClickEvent>(_ => onClick());
                disc.RegisterCallback<MouseEnterEvent>(_ =>
                {
                    Theme.SetBorder(disc, Theme.GoldBright, 3);
                    disc.style.scale = new Scale(new Vector3(1.15f, 1.15f, 1f));
                });
                disc.RegisterCallback<MouseLeaveEvent>(_ =>
                {
                    Theme.SetBorder(disc, tint, 2.5f);
                    disc.style.scale = new Scale(Vector3.one);
                });
            }

            wrap.Add(disc);
            var name = new Label(node.Known ? label : "?");
            name.style.fontSize = 11;
            name.style.color = reachable || current ? Theme.ParchmentDim : Theme.Grey;
            name.style.marginTop = 2;
            wrap.Add(name);

            Tips.Attach(wrap, () => node.Known
                ? (label, ContentText.NodeTip(node.Kind) + (reachable ? "\n\nclick to travel here" : ""))
                : ("unscouted", "the road ahead is unknown — stops reveal themselves as you approach"));
            return wrap;
        }

        /// <summary>
        /// An absolute-positioned canvas that draws road edges between node discs
        /// with Painter2D. Register pairs AFTER layout: pass functions resolving
        /// each node id to its disc element; lines connect element centres.
        /// </summary>
        public static VisualElement EdgeCanvas(List<(VisualElement from, VisualElement to, bool lit)> edges)
        {
            var canvas = new VisualElement();
            canvas.pickingMode = PickingMode.Ignore;
            canvas.style.position = Position.Absolute;
            canvas.style.left = 0; canvas.style.right = 0;
            canvas.style.top = 0; canvas.style.bottom = 0;
            canvas.generateVisualContent += ctx =>
            {
                var p = ctx.painter2D;
                foreach (var (from, to, lit) in edges)
                {
                    if (from.panel == null || to.panel == null) continue;
                    var a = canvas.WorldToLocal(from.worldBound.center);
                    var b = canvas.WorldToLocal(to.worldBound.center);
                    p.strokeColor = lit
                        ? new Color(Theme.Gold.r, Theme.Gold.g, Theme.Gold.b, 0.75f)
                        : new Color(Theme.Grey.r, Theme.Grey.g, Theme.Grey.b, 0.30f);
                    p.lineWidth = lit ? 2.5f : 1.5f;
                    p.BeginPath();
                    p.MoveTo(a);
                    // A soft dip between stops — reads as a road, not a wire.
                    var mid = (a + b) / 2f + new Vector2(0, 10f);
                    p.QuadraticCurveTo(mid, b);
                    p.Stroke();
                }
            };
            // Repaint once layout has settled so worldBounds are real.
            canvas.schedule.Execute(() => canvas.MarkDirtyRepaint()).ExecuteLater(50);
            return canvas;
        }

        // ── mini icons (Painter2D — the runtime font has no ⚔/⛨/⚙/👑 glyphs) ────

        public enum Icon { Sword, Shield, Gear, Crown }

        /// <summary>A small drawn icon in the relic-silhouette style. Pure strokes.</summary>
        public static VisualElement MiniIcon(Icon kind, Color color, float size = 18)
        {
            var v = new VisualElement();
            v.pickingMode = PickingMode.Ignore;
            v.style.width = size; v.style.height = size;
            v.style.flexShrink = 0;
            v.generateVisualContent += ctx =>
            {
                var p = ctx.painter2D;
                float w = v.contentRect.width, h = v.contentRect.height;
                if (w <= 0 || h <= 0) return;
                var c = new Vector2(w / 2f, h / 2f);
                p.strokeColor = color;
                p.fillColor = color;
                p.lineWidth = Mathf.Max(1.6f, size * 0.10f);
                p.lineCap = LineCap.Round;

                switch (kind)
                {
                    case Icon.Sword:
                        // Blade, crossguard, grip.
                        p.BeginPath();
                        p.MoveTo(c + new Vector2(-w * 0.30f, h * 0.30f));
                        p.LineTo(c + new Vector2(w * 0.28f, -h * 0.28f));
                        p.Stroke();
                        p.BeginPath();
                        p.MoveTo(c + new Vector2(-w * 0.28f, -h * 0.02f));
                        p.LineTo(c + new Vector2(w * 0.02f, h * 0.28f));
                        p.Stroke();
                        p.BeginPath();
                        p.Arc(c + new Vector2(-w * 0.32f, h * 0.32f), w * 0.06f,
                            new Angle(0, AngleUnit.Degree), new Angle(360, AngleUnit.Degree));
                        p.Fill();
                        break;

                    case Icon.Shield:
                        p.BeginPath();
                        p.MoveTo(c + new Vector2(-w * 0.30f, -h * 0.30f));
                        p.LineTo(c + new Vector2(w * 0.30f, -h * 0.30f));
                        p.LineTo(c + new Vector2(w * 0.30f, h * 0.05f));
                        p.LineTo(c + new Vector2(0, h * 0.38f));
                        p.LineTo(c + new Vector2(-w * 0.30f, h * 0.05f));
                        p.ClosePath();
                        p.Stroke();
                        break;

                    case Icon.Gear:
                        p.BeginPath();
                        p.Arc(c, w * 0.24f, new Angle(0, AngleUnit.Degree), new Angle(360, AngleUnit.Degree));
                        p.Stroke();
                        p.BeginPath();
                        p.Arc(c, w * 0.09f, new Angle(0, AngleUnit.Degree), new Angle(360, AngleUnit.Degree));
                        p.Stroke();
                        for (int i = 0; i < 6; i++)
                        {
                            float a = i * Mathf.PI / 3f;
                            var dir = new Vector2(Mathf.Cos(a), Mathf.Sin(a));
                            p.BeginPath();
                            p.MoveTo(c + dir * w * 0.26f);
                            p.LineTo(c + dir * w * 0.38f);
                            p.Stroke();
                        }
                        break;

                    case Icon.Crown:
                        p.BeginPath();
                        p.MoveTo(c + new Vector2(-w * 0.32f, h * 0.28f));
                        p.LineTo(c + new Vector2(-w * 0.32f, -h * 0.10f));
                        p.LineTo(c + new Vector2(-w * 0.14f, h * 0.06f));
                        p.LineTo(c + new Vector2(0, -h * 0.30f));
                        p.LineTo(c + new Vector2(w * 0.14f, h * 0.06f));
                        p.LineTo(c + new Vector2(w * 0.32f, -h * 0.10f));
                        p.LineTo(c + new Vector2(w * 0.32f, h * 0.28f));
                        p.ClosePath();
                        p.Stroke();
                        break;
                }
            };
            return v;
        }

        // ── relic paper-doll (§8) ───────────────────────────────────────────────

        /// <summary>
        /// A Diablo-style equipment socket: a dark inset square with a grey
        /// silhouette of what belongs there (a ring in the ring slot…), drawn with
        /// Painter2D. Gold when something is equipped.
        /// </summary>
        public static VisualElement RelicSlotIcon(RelicSlot slot, bool filled, float size = 56, string relicId = null)
        {
            var socket = new VisualElement();
            socket.style.width = size; socket.style.height = size;
            socket.style.backgroundColor = Theme.NightDeep;
            Theme.SetRadius(socket, 8);
            Theme.SetBorder(socket, filled ? Theme.Gold : new Color(Theme.Grey.r, Theme.Grey.g, Theme.Grey.b, 0.45f),
                filled ? 2f : 1.5f);

            var canvas = new VisualElement();
            canvas.pickingMode = PickingMode.Ignore;
            canvas.style.position = Position.Absolute;
            canvas.style.left = 0; canvas.style.right = 0; canvas.style.top = 0; canvas.style.bottom = 0;
            Color line = filled
                ? Theme.GoldBright
                : new Color(Theme.Grey.r, Theme.Grey.g, Theme.Grey.b, 0.55f);

            canvas.generateVisualContent += ctx =>
            {
                var p = ctx.painter2D;
                float w = canvas.contentRect.width, h = canvas.contentRect.height;
                if (w <= 0 || h <= 0) return;
                var c = new Vector2(w / 2f, h / 2f);
                p.strokeColor = line;
                p.lineWidth = 2.2f;
                p.lineCap = LineCap.Round;

                switch (slot)
                {
                    case RelicSlot.Hat:
                        // Brim + dome.
                        p.BeginPath();
                        p.MoveTo(c + new Vector2(-w * 0.32f, h * 0.14f));
                        p.LineTo(c + new Vector2(w * 0.32f, h * 0.14f));
                        p.Stroke();
                        p.BeginPath();
                        p.Arc(c + new Vector2(0, h * 0.14f), w * 0.18f,
                            new Angle(180, AngleUnit.Degree), new Angle(360, AngleUnit.Degree));
                        p.Stroke();
                        break;

                    case RelicSlot.Amulet:
                        // Chain V + pendant.
                        p.BeginPath();
                        p.MoveTo(c + new Vector2(-w * 0.26f, -h * 0.28f));
                        p.LineTo(c + new Vector2(0, -h * 0.02f));
                        p.LineTo(c + new Vector2(w * 0.26f, -h * 0.28f));
                        p.Stroke();
                        p.BeginPath();
                        p.Arc(c + new Vector2(0, h * 0.14f), w * 0.13f,
                            new Angle(0, AngleUnit.Degree), new Angle(360, AngleUnit.Degree));
                        p.Stroke();
                        break;

                    case RelicSlot.Ring:
                        // The band + a little gem arc on top.
                        p.BeginPath();
                        p.Arc(c + new Vector2(0, h * 0.05f), w * 0.19f,
                            new Angle(0, AngleUnit.Degree), new Angle(360, AngleUnit.Degree));
                        p.Stroke();
                        p.BeginPath();
                        p.Arc(c + new Vector2(0, -h * 0.20f), w * 0.07f,
                            new Angle(0, AngleUnit.Degree), new Angle(360, AngleUnit.Degree));
                        p.Stroke();
                        break;

                    case RelicSlot.Cloak:
                        // Shoulders draping to a hem.
                        p.BeginPath();
                        p.MoveTo(c + new Vector2(-w * 0.10f, -h * 0.30f));
                        p.LineTo(c + new Vector2(w * 0.10f, -h * 0.30f));
                        p.LineTo(c + new Vector2(w * 0.28f, h * 0.28f));
                        p.LineTo(c + new Vector2(-w * 0.28f, h * 0.28f));
                        p.ClosePath();
                        p.Stroke();
                        p.BeginPath();
                        p.MoveTo(c + new Vector2(0, -h * 0.30f));
                        p.LineTo(c + new Vector2(0, h * 0.28f));
                        p.Stroke();
                        break;
                }
            };
            socket.Add(canvas);

            Tips.Attach(socket, () =>
            {
                if (filled && relicId != null && RelicTables.Exists(relicId))
                    return (RelicTables.Get(relicId).Name,
                        ContentText.RelicRules.TryGetValue(relicId, out var rules) ? rules : "");
                string theme = slot switch
                {
                    RelicSlot.Hat => "recruitment relics live here",
                    RelicSlot.Amulet => "activated-button relics live here",
                    RelicSlot.Ring => "economy relics live here",
                    _ => "road relics live here",
                };
                return ($"{slot} slot — empty", theme + "\n\nrelics come from Lair raids and the Caravan; swaps are free outside combat");
            });
            return socket;
        }

        // ── battle readouts ─────────────────────────────────────────────────────

        /// <summary>Enemy status block: HP bar, attack intent, shield, immunity.</summary>
        public static VisualElement EnemyStatus(EnemyState enemy)
        {
            var v = new VisualElement();
            v.style.alignItems = Align.Center;

            v.Add(Theme.Bar(enemy.Hp / (float)enemy.MaxHp, $"{enemy.Hp} / {enemy.MaxHp}", Theme.RedBright, 200, 22));

            var row = new VisualElement();
            row.style.flexDirection = FlexDirection.Row;
            row.style.marginTop = 6;
            int net = Math.Max(0, enemy.Attack - enemy.Shield);
            row.Add(Theme.Chip($"atk {enemy.Attack}", Theme.RedBright));
            if (enemy.Shield > 0)
            {
                row.Add(Theme.Chip($"shield {enemy.Shield}", Theme.Shield));
                row.Add(Theme.Chip(net == 0 ? "counter blanked" : $"net {net}", net == 0 ? Theme.Green : Theme.RedDeep));
            }
            if (enemy.ImmuneSuit is Suit imm)
                row.Add(Theme.Chip($"immune {PhysicalCard.SuitGlyph(imm)}", Theme.Grey));
            v.Add(row);
            return v;
        }

        /// <summary>One gauntlet crystal (§7): suit-tinted socket, tier, cast state.</summary>
        public static VisualElement Crystal(Suit suit, int tier, bool castable, bool spent, Action onCast)
        {
            // Lift the suit colour toward white so ♠ ink stays visible on the night bg.
            var suitColor = Color.Lerp(CardView.SuitColor(suit), Color.white, 0.25f);
            var v = new VisualElement();
            v.style.alignItems = Align.Center;
            v.style.marginRight = 8;

            var socket = new VisualElement();
            socket.style.width = 44; socket.style.height = 44;
            Theme.SetRadius(socket, 22);
            socket.style.alignItems = Align.Center;
            socket.style.justifyContent = Justify.Center;
            socket.style.backgroundColor = tier > 0 ? new Color(suitColor.r, suitColor.g, suitColor.b, 0.30f) : Theme.NightDeep;
            Theme.SetBorder(socket,
                spent ? Theme.Grey : tier > 0 && castable ? Theme.GoldBright : Theme.GoldDim,
                tier > 0 ? 2.5f : 1);

            var glyph = new Label(PhysicalCard.SuitGlyph(suit));
            glyph.style.fontSize = 20 * CardView.GlyphScale(suit);
            glyph.style.color = tier > 0 ? Color.Lerp(suitColor, Color.white, 0.4f) : Theme.Grey;
            socket.Add(glyph);

            if (tier > 0 && castable && !spent && onCast != null)
            {
                socket.RegisterCallback<ClickEvent>(_ => onCast());
                socket.RegisterCallback<MouseEnterEvent>(_ => socket.style.scale = new Scale(new Vector3(1.15f, 1.15f, 1f)));
                socket.RegisterCallback<MouseLeaveEvent>(_ => socket.style.scale = new Scale(Vector3.one));
            }
            v.Add(socket);

            var caption = new Label(spent ? "cast" : tier == 0 ? "empty" : SpellTables.Name(suit, tier));
            caption.style.fontSize = 9;
            caption.style.color = spent || tier == 0 ? Theme.Grey : Theme.ParchmentDim;
            caption.style.marginTop = 2;
            v.Add(caption);

            string tipTitle = PhysicalCard.SuitGlyph(suit) + " " +
                (tier > 0 ? SpellTables.Name(suit, tier) : "crystal socket");
            string tipBody = spent
                ? "already cast — one spell per suit per fight, and casting empties the slot"
                : tier > 0
                    ? ContentText.SpellRules(suit, tier) + "\n\nspells ignore the enemy's immunity"
                    : "empty — arm a fragment or a Half here from the bracelet, between fights";
            Tips.Attach(v, tipTitle, tipBody);
            return v;
        }
    }
}
