using System.Collections.Generic;
using UnityEngine;

namespace Regicide.Unity
{
    /// <summary>
    /// Procedural audio — every clip synthesized at runtime (sine partials, noise
    /// bursts, little arpeggios), cached, played through one AudioSource. No audio
    /// assets in the repo, same rule as the textures. Short and subtle by design.
    /// </summary>
    public static class Sfx
    {
        public enum Sound
        {
            Tick,      // card select
            Whoosh,    // cards fly
            Impact,    // damage lands
            Exact,     // the exact-kill chime
            Overkill,  // dull slide down
            Draw,      // card draw chirp
            Shield,    // metallic block
            Counter,   // low double pulse
            Death,     // long fall
            Crown,     // victory fanfare
            Coin,      // fragments, relics, forges
            Spell,     // crystal cast
            Error,     // rejected action
        }

        private const int Rate = 22050;
        private const float Master = 0.42f;

        private static AudioSource _src;
        private static readonly Dictionary<Sound, AudioClip> _clips = new Dictionary<Sound, AudioClip>();

        /// <summary>Call once from the entry MonoBehaviour.</summary>
        public static void Init(GameObject host)
        {
            if (_src != null) return;
            _src = host.AddComponent<AudioSource>();
            _src.playOnAwake = false;
            _src.spatialBlend = 0f;
            if (Object.FindFirstObjectByType<AudioListener>() == null)
                host.AddComponent<AudioListener>();
        }

        public static void Play(Sound s, float volume = 1f)
        {
            if (_src == null) return;
            if (!_clips.TryGetValue(s, out var clip))
            {
                clip = Synth(s);
                _clips[s] = clip;
            }
            _src.PlayOneShot(clip, volume * Master);
        }

        // ── synthesis ───────────────────────────────────────────────────────────

        private static AudioClip Synth(Sound s)
        {
            float[] data = s switch
            {
                Sound.Tick => Tone(880, 0.035f, 18f, 0.5f),
                Sound.Whoosh => NoiseSweep(0.13f, 1400, 300),
                Sound.Impact => Mix(NoiseSweep(0.10f, 900, 120), Tone(110, 0.14f, 10f, 1f)),
                Sound.Exact => Arp(new[] { 660f, 880f, 1320f }, 0.09f, 8f),
                Sound.Overkill => Slide(220, 150, 0.22f, 7f),
                Sound.Draw => Slide(320, 720, 0.08f, 12f, 0.5f),
                Sound.Shield => Mix(Tone(520, 0.12f, 9f, 0.7f), Tone(780, 0.12f, 11f, 0.4f)),
                Sound.Counter => Pulses(180, 2, 0.09f, 0.05f),
                Sound.Death => Slide(220, 70, 0.75f, 2.5f),
                Sound.Crown => Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.13f, 4f),
                Sound.Coin => Mix(Tone(1180, 0.09f, 12f, 0.6f), Tone(1770, 0.11f, 10f, 0.35f)),
                Sound.Spell => Mix(Tone(990, 0.16f, 6f, 0.5f), Tone(1485, 0.16f, 7f, 0.3f)),
                Sound.Error => Buzz(140, 0.13f),
                _ => Tone(440, 0.05f, 15f, 0.5f),
            };
            var clip = AudioClip.Create(s.ToString(), data.Length, 1, Rate, false);
            clip.SetData(data, 0);
            return clip;
        }

        private static float[] Tone(float freq, float dur, float decay, float amp)
        {
            int n = (int)(Rate * dur);
            var d = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)Rate;
                d[i] = Mathf.Sin(2f * Mathf.PI * freq * t) * amp * Mathf.Exp(-decay * t);
            }
            return Soften(d);
        }

        private static float[] Slide(float from, float to, float dur, float decay, float amp = 1f)
        {
            int n = (int)(Rate * dur);
            var d = new float[n];
            float phase = 0f;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)(n - 1);
                float freq = Mathf.Lerp(from, to, t);
                phase += 2f * Mathf.PI * freq / Rate;
                d[i] = Mathf.Sin(phase) * amp * Mathf.Exp(-decay * (i / (float)Rate));
            }
            return Soften(d);
        }

        private static float[] Arp(float[] notes, float step, float decay)
        {
            int stepN = (int)(Rate * step);
            int n = stepN * notes.Length + (int)(Rate * 0.25f);
            var d = new float[n];
            for (int k = 0; k < notes.Length; k++)
                for (int i = 0; i < n - k * stepN; i++)
                {
                    float t = i / (float)Rate;
                    d[k * stepN + i] += Mathf.Sin(2f * Mathf.PI * notes[k] * t) * 0.55f * Mathf.Exp(-decay * t);
                }
            return Soften(d);
        }

        private static float[] NoiseSweep(float dur, float startCut, float endCut)
        {
            int n = (int)(Rate * dur);
            var d = new float[n];
            var rng = new System.Random(31);
            float last = 0f;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)(n - 1);
                // Crude one-pole low-pass whose cutoff sweeps down: wind → thud.
                float cut = Mathf.Lerp(startCut, endCut, t);
                float alpha = Mathf.Clamp01(cut / (cut + Rate / (2f * Mathf.PI)));
                float white = (float)(rng.NextDouble() * 2.0 - 1.0);
                last += alpha * (white - last);
                d[i] = last * (1f - t) * 1.6f;
            }
            return Soften(d);
        }

        private static float[] Pulses(float freq, int count, float on, float gap)
        {
            int onN = (int)(Rate * on), gapN = (int)(Rate * gap);
            int n = count * (onN + gapN);
            var d = new float[n];
            for (int k = 0; k < count; k++)
                for (int i = 0; i < onN; i++)
                {
                    float t = i / (float)Rate;
                    d[k * (onN + gapN) + i] = Mathf.Sin(2f * Mathf.PI * freq * t) * 0.9f * (1f - i / (float)onN);
                }
            return Soften(d);
        }

        private static float[] Buzz(float freq, float dur)
        {
            int n = (int)(Rate * dur);
            var d = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)Rate;
                float square = Mathf.Sign(Mathf.Sin(2f * Mathf.PI * freq * t));
                d[i] = square * 0.28f * (1f - i / (float)n);
            }
            return Soften(d);
        }

        private static float[] Mix(float[] a, float[] b)
        {
            var d = new float[Mathf.Max(a.Length, b.Length)];
            for (int i = 0; i < d.Length; i++)
                d[i] = Mathf.Clamp((i < a.Length ? a[i] : 0f) + (i < b.Length ? b[i] : 0f), -1f, 1f);
            return d;
        }

        /// <summary>2ms fade at both ends — kills clicks from abrupt cuts.</summary>
        private static float[] Soften(float[] d)
        {
            int f = Rate / 500;
            for (int i = 0; i < f && i < d.Length; i++)
            {
                float g = i / (float)f;
                d[i] *= g;
                d[d.Length - 1 - i] *= g;
            }
            return d;
        }
    }
}
