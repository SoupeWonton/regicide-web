using System.Collections.Generic;
using UnityEngine;

namespace Regicide.Unity
{
    /// <summary>
    /// Procedural textures, generated once at runtime and cached — no image assets
    /// anywhere in the repo (the web prototype did the same with SVG turbulence).
    /// Everything here is decoration: noise grain, a radial vignette, vertical
    /// gradients for buttons/panels, parchment mottling and a card-back lattice.
    /// </summary>
    public static class Textures
    {
        private static Texture2D _noise, _vignette, _parchment, _lattice;
        private static readonly Dictionary<(Color, Color), Texture2D> _gradients =
            new Dictionary<(Color, Color), Texture2D>();

        /// <summary>Tiling film-grain: transparent black speckle, ~5% alpha.</summary>
        public static Texture2D Noise()
        {
            if (_noise != null) return _noise;
            const int s = 128;
            _noise = NewTex(s, s);
            var px = new Color[s * s];
            var rng = new System.Random(1177);
            for (int i = 0; i < px.Length; i++)
            {
                float v = (float)rng.NextDouble();
                px[i] = new Color(0f, 0f, 0f, v * 0.09f);
            }
            _noise.SetPixels(px);
            _noise.Apply();
            return _noise;
        }

        /// <summary>Radial vignette: clear centre, darkening to the corners.</summary>
        public static Texture2D Vignette()
        {
            if (_vignette != null) return _vignette;
            const int s = 256;
            _vignette = NewTex(s, s);
            var px = new Color[s * s];
            var c = new Vector2(s / 2f, s / 2f * 0.9f); // pulled slightly up — light from above
            float max = c.magnitude;
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    float d = Vector2.Distance(new Vector2(x, y), c) / max;
                    float a = Mathf.SmoothStep(0f, 0.55f, Mathf.Clamp01(d - 0.45f) / 0.55f);
                    px[y * s + x] = new Color(0.02f, 0.01f, 0.05f, a);
                }
            _vignette.SetPixels(px);
            _vignette.Apply();
            return _vignette;
        }

        /// <summary>Soft mottling for card faces: warm low-alpha blotches over parchment.</summary>
        public static Texture2D Parchment()
        {
            if (_parchment != null) return _parchment;
            const int s = 96;
            _parchment = NewTex(s, s);
            var px = new Color[s * s];
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    float n = Mathf.PerlinNoise(x * 0.11f + 7.3f, y * 0.11f + 2.9f);
                    float edge = Mathf.PerlinNoise(x * 0.45f, y * 0.45f) * 0.35f;
                    float a = (n * 0.65f + edge) * 0.10f;
                    px[y * s + x] = new Color(0.35f, 0.24f, 0.10f, a);
                }
            _parchment.SetPixels(px);
            _parchment.Apply();
            return _parchment;
        }

        /// <summary>Card-back diamond lattice tile, gold-dim on transparent.</summary>
        public static Texture2D Lattice()
        {
            if (_lattice != null) return _lattice;
            const int s = 24;
            _lattice = NewTex(s, s);
            var px = new Color[s * s];
            var gold = Theme.GoldDim;
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    // Two diagonal line families → diamonds.
                    bool a = (x + y) % s < 2;
                    bool b = (x - y + s * 4) % s < 2;
                    px[y * s + x] = a || b
                        ? new Color(gold.r, gold.g, gold.b, 0.45f)
                        : Color.clear;
                }
            _lattice.SetPixels(px);
            _lattice.Apply();
            return _lattice;
        }

        /// <summary>Vertical gradient (top → bottom), cached per colour pair.</summary>
        public static Texture2D Gradient(Color top, Color bottom)
        {
            if (_gradients.TryGetValue((top, bottom), out var cached)) return cached;
            const int h = 48;
            var tex = NewTex(2, h);
            var px = new Color[2 * h];
            for (int y = 0; y < h; y++)
            {
                // Texture rows go bottom-up; row 0 is the visual bottom.
                var c = Color.Lerp(bottom, top, y / (float)(h - 1));
                px[y * 2] = c;
                px[y * 2 + 1] = c;
            }
            tex.SetPixels(px);
            tex.Apply();
            _gradients[(top, bottom)] = tex;
            return tex;
        }

        private static Texture2D NewTex(int w, int h) =>
            new Texture2D(w, h, TextureFormat.RGBA32, false)
            {
                wrapMode = TextureWrapMode.Repeat,
                filterMode = FilterMode.Bilinear,
                hideFlags = HideFlags.HideAndDontSave,
            };
    }
}
