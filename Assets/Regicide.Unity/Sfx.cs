using System.Collections.Generic;
using UnityEngine;

namespace Regicide.Unity
{
    /// <summary>
    /// The web version's voice, ported. Every clip is synthesized offline at init
    /// from the exact recipes in the web prototype's <c>client/src/sound.ts</c>
    /// (WebAudio): enveloped oscillators (<c>tone</c>), RBJ-biquad-filtered noise
    /// bursts (<c>hiss</c>), and the trumpet <c>brass</c> stack. No audio assets
    /// in the repo — same rule as the textures.
    /// </summary>
    public static class Sfx
    {
        public enum Sound
        {
            // Existing members (RunApp.cs callsites) — remapped to the web recipes.
            Tick,      // web cardSnap — picking a card up off the fan
            Whoosh,    // web cardPlay — cards hitting the table
            Impact,    // web damage(false)
            Exact,     // web exactKill — the four-note rise
            Overkill,  // web kill
            Draw,      // web draw — paper slide
            Shield,    // web shield — spades clink
            Counter,   // web counter
            Death,     // web death
            Crown,     // web TRIUMPH — a boss falls, the whole brass section
            Coin,      // web proc — ability/item sparkle
            Spell,     // web arcane — shimmer
            Error,     // no web equivalent — a soft buzz
            // New members (wired by the parent afterwards).
            DamageBig, // web damage(true)
            Kill,      // alias of Overkill (same clip)
            Reveal,    // web reveal — a new royal steps forward
            Victory,   // web victory — encounter cleared, trumpets
            Triumph,   // web triumph (same clip as Crown)
            Footsteps, // web footsteps — committing to a road node
            Click,     // web click — generic UI tick
        }

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

        /// <summary>Mute switch (the web version's toggle). Host persists it (PlayerPrefs).</summary>
        public static bool Muted;

        public static void Play(Sound s, float volume = 1f)
        {
            if (_src == null || Muted) return;
            // Kill and Overkill are the same web recipe; Crown and Triumph likewise.
            Sound key = s == Sound.Kill ? Sound.Overkill : s == Sound.Triumph ? Sound.Crown : s;
            if (!_clips.TryGetValue(key, out var clip))
            {
                clip = Bake(key);
                _clips[key] = clip;
            }
            _src.PlayOneShot(clip, volume);
        }

        // ── the recipes (numbers verbatim from sound.ts) ────────────────────────

        private static AudioClip Bake(Sound s)
        {
            var sy = new Synth(137 + (int)s);
            switch (s)
            {
                case Sound.Tick: // cardSnap
                    sy.Hiss(0.05f, 0.12f, Filt.Highpass, 3500f);
                    sy.Tone(Osc.Triangle, 2200f, 0.04f, 0.05f, to: 1600f);
                    break;

                case Sound.Whoosh: // cardPlay
                    sy.Hiss(0.14f, 0.2f, Filt.Bandpass, 700f, freqTo: 2600f);
                    sy.Tone(Osc.Sine, 150f, 0.12f, 0.18f, to: 70f);
                    break;

                case Sound.Impact: // damage(false)
                    sy.Tone(Osc.Sine, 160f, 0.15f, 0.26f, to: 60f);
                    sy.Hiss(0.1f, 0.13f, Filt.Lowpass, 900f);
                    break;

                case Sound.DamageBig: // damage(true)
                    sy.Tone(Osc.Sine, 200f, 0.22f, 0.4f, to: 48f);
                    sy.Hiss(0.1f, 0.22f, Filt.Lowpass, 900f);
                    break;

                case Sound.Shield:
                    sy.Tone(Osc.Triangle, 880f, 0.12f, 0.1f);
                    sy.Tone(Osc.Triangle, 1318f, 0.16f, 0.07f, delay: 0.02f);
                    break;

                case Sound.Draw:
                    sy.Hiss(0.08f, 0.09f, Filt.Highpass, 2400f);
                    break;

                case Sound.Overkill: // kill (also aliased by Sound.Kill)
                    sy.Tone(Osc.Sine, 120f, 0.2f, 0.3f, to: 50f);
                    sy.Tone(Osc.Triangle, 784f, 0.18f, 0.12f, delay: 0.08f);
                    sy.Tone(Osc.Triangle, 1046f, 0.22f, 0.1f, delay: 0.16f);
                    break;

                case Sound.Exact: // exactKill
                {
                    float[] notes = { 659f, 784f, 988f, 1318f };
                    for (int i = 0; i < notes.Length; i++)
                        sy.Tone(Osc.Triangle, notes[i], 0.25f, 0.11f, delay: i * 0.07f);
                    break;
                }

                case Sound.Counter:
                    sy.Tone(Osc.Saw, 110f, 0.22f, 0.16f, to: 70f);
                    sy.Hiss(0.18f, 0.12f, Filt.Bandpass, 300f, freqTo: 150f);
                    break;

                case Sound.Death:
                    sy.Tone(Osc.Sine, 90f, 1.1f, 0.35f, to: 38f);
                    sy.Hiss(0.7f, 0.1f, Filt.Lowpass, 500f, freqTo: 120f);
                    break;

                case Sound.Coin: // proc
                    sy.Tone(Osc.Triangle, 1568f, 0.09f, 0.07f);
                    sy.Tone(Osc.Triangle, 2093f, 0.12f, 0.05f, delay: 0.05f);
                    break;

                case Sound.Reveal:
                    sy.Hiss(0.2f, 0.14f, Filt.Bandpass, 500f, freqTo: 1800f);
                    sy.Tone(Osc.Sine, 70f, 0.18f, 0.12f, to: 110f, lin: true);
                    break;

                case Sound.Spell: // arcane
                {
                    float[] notes = { 523f, 740f, 1047f };
                    for (int i = 0; i < notes.Length; i++)
                        sy.Tone(Osc.Sine, notes[i], 0.3f, 0.07f, to: notes[i] * 1.06f, delay: i * 0.05f);
                    break;
                }

                case Sound.Victory: // victory — bam bam bam baaaam, bam bam baaam
                {
                    const float C5 = 523.25f, Ab4 = 415.3f, Bb4 = 466.16f;
                    sy.Brass(C5, 0.11f, 0f);
                    sy.Brass(C5, 0.11f, 0.15f);
                    sy.Brass(C5, 0.11f, 0.30f);
                    sy.Brass(C5, 0.5f, 0.45f, 0.15f);
                    sy.Brass(Ab4, 0.3f, 1.0f);
                    sy.Brass(Bb4, 0.3f, 1.3f);
                    sy.Brass(C5, 0.75f, 1.6f, 0.16f);
                    break;
                }

                case Sound.Crown: // triumph — the whole brass section (also Sound.Triumph)
                {
                    const float C5 = 523.25f, Ab4 = 415.3f, Bb4 = 466.16f, E5 = 659.25f, G5 = 783.99f;
                    sy.Brass(C5, 0.11f, 0f);
                    sy.Brass(C5, 0.11f, 0.15f);
                    sy.Brass(C5, 0.11f, 0.30f);
                    sy.Brass(C5, 0.5f, 0.45f, 0.16f);
                    sy.Brass(Ab4, 0.3f, 1.0f);
                    sy.Brass(Bb4, 0.3f, 1.3f);
                    sy.Brass(C5, 1.2f, 1.6f, 0.15f);
                    sy.Brass(E5, 1.2f, 1.66f, 0.1f);
                    sy.Brass(G5, 1.2f, 1.72f, 0.09f);
                    sy.Tone(Osc.Saw, 130.8f, 1.4f, 0.07f);
                    sy.Tone(Osc.Saw, 130.8f, 1.5f, 0.08f, delay: 1.6f);
                    sy.Hiss(1.1f, 0.05f, Filt.Highpass, 5000f, delay: 1.7f);
                    break;
                }

                case Sound.Footsteps:
                    for (int i = 0; i < 3; i++)
                        sy.Hiss(0.07f, 0.1f - i * 0.02f, Filt.Lowpass, 700f, delay: i * 0.14f);
                    break;

                case Sound.Click:
                    sy.Tone(Osc.Triangle, 1200f, 0.05f, 0.06f, to: 900f);
                    break;

                case Sound.Error: // no web recipe — a deliberately soft buzz
                    sy.Tone(Osc.Square, 140f, 0.13f, 0.15f);
                    break;
            }

            float[] data = sy.Bake();
            var clip = AudioClip.Create(s.ToString(), data.Length, 1, Synth.Rate, false);
            clip.SetData(data, 0);
            return clip;
        }

        // ── the synth (WebAudio semantics, rendered offline) ────────────────────

        private enum Osc { Sine, Triangle, Saw, Square }
        private enum Filt { Lowpass, Highpass, Bandpass }

        private sealed class Synth
        {
            public const int Rate = 22050;
            private const float MasterGain = 0.55f; // the web master GainNode

            private sealed class Op
            {
                public bool IsHiss;
                public Osc Type;
                public Filt Filter;
                public float From, To, Dur, Vol, Delay, Q;
                public bool Lin;
                public float NoiseOffset; // web: src.start(t0, random()*0.2)
            }

            private readonly List<Op> _ops = new List<Op>();
            private readonly System.Random _rng;
            private float[] _noise; // the web's shared 0.5s noise buffer

            public Synth(int seed) { _rng = new System.Random(seed); }

            public void Tone(Osc type, float from, float dur, float vol,
                             float delay = 0f, float to = float.NaN, bool lin = false)
            {
                _ops.Add(new Op { IsHiss = false, Type = type, From = from, To = to, Dur = dur, Vol = vol, Delay = delay, Lin = lin });
            }

            public void Hiss(float dur, float vol, Filt filter, float freq,
                             float freqTo = float.NaN, float delay = 0f, float q = 0.9f)
            {
                _ops.Add(new Op
                {
                    IsHiss = true, Filter = filter, From = freq, To = freqTo, Dur = dur,
                    Vol = vol, Delay = delay, Q = q,
                    NoiseOffset = (float)(_rng.NextDouble() * 0.2),
                });
            }

            /// <summary>Trumpet "bam": detuned sawtooth pair + a quiet sub-octave square.</summary>
            public void Brass(float freq, float dur, float delay, float vol = 0.12f)
            {
                Tone(Osc.Saw, freq, dur, vol, delay);
                Tone(Osc.Saw, freq * 1.006f, dur, vol * 0.55f, delay);
                Tone(Osc.Square, freq / 2f, dur, vol * 0.3f, delay);
            }

            public float[] Bake()
            {
                float total = 0.05f;
                foreach (var op in _ops) total = Mathf.Max(total, op.Delay + op.Dur + 0.03f);
                var buf = new float[(int)(total * Rate)];

                foreach (var op in _ops)
                {
                    if (op.IsHiss) RenderHiss(op, buf);
                    else RenderTone(op, buf);
                }

                for (int i = 0; i < buf.Length; i++)
                    buf[i] = Mathf.Clamp(buf[i] * MasterGain, -1f, 1f);
                return Soften(buf);
            }

            private void RenderTone(Op op, float[] buf)
            {
                int start = (int)(op.Delay * Rate);
                int n = Mathf.Min((int)(op.Dur * Rate), buf.Length - start);
                bool ramp = !float.IsNaN(op.To);
                float expDenom = Mathf.Max(op.Dur - 0.008f, 0.001f);
                double phase = 0;

                for (int i = 0; i < n; i++)
                {
                    float t = i / (float)Rate;
                    float f = !ramp ? op.From
                        : op.Lin ? op.From + (op.To - op.From) * (t / op.Dur)
                        : op.From * Mathf.Pow(Mathf.Max(1f, op.To) / op.From, t / op.Dur);
                    phase += 2.0 * System.Math.PI * f / Rate;

                    // Envelope: 8ms linear attack, exponential decay to 0.0001 (WebAudio ramps).
                    float env = t < 0.008f
                        ? op.Vol * (t / 0.008f)
                        : op.Vol * Mathf.Pow(0.0001f / op.Vol, (t - 0.008f) / expDenom);

                    buf[start + i] += Wave(op.Type, phase) * env;
                }
            }

            private void RenderHiss(Op op, float[] buf)
            {
                if (_noise == null)
                {
                    _noise = new float[Rate / 2]; // the web's 0.5s noise buffer
                    for (int i = 0; i < _noise.Length; i++)
                        _noise[i] = (float)(_rng.NextDouble() * 2.0 - 1.0);
                }

                int start = (int)(op.Delay * Rate);
                int n = Mathf.Min((int)(op.Dur * Rate), buf.Length - start);
                int noiseStart = (int)(op.NoiseOffset * Rate);
                bool sweep = !float.IsNaN(op.To);
                float expDenom = Mathf.Max(op.Dur - 0.006f, 0.001f);
                var bq = new Biquad();

                for (int i = 0; i < n; i++)
                {
                    float t = i / (float)Rate;
                    if (i % 64 == 0)
                    {
                        float f = sweep ? op.From * Mathf.Pow(op.To / op.From, t / op.Dur) : op.From;
                        bq.Set(op.Filter, f, op.Q);
                    }

                    // Faithful to the web: the noise SOURCE is a 0.5s one-shot started at
                    // a random offset — long hisses run out of buffer and go quiet.
                    int ni = noiseStart + i;
                    float x = ni < _noise.Length ? _noise[ni] : 0f;
                    float y = bq.Process(x);

                    float env = t < 0.006f
                        ? op.Vol * (t / 0.006f)
                        : op.Vol * Mathf.Pow(0.0001f / op.Vol, (t - 0.006f) / expDenom);

                    buf[start + i] += y * env;
                }
            }

            private static float Wave(Osc type, double phase)
            {
                switch (type)
                {
                    case Osc.Triangle:
                        return (float)(2.0 / System.Math.PI * System.Math.Asin(System.Math.Sin(phase)));
                    case Osc.Saw:
                    {
                        double frac = phase / (2.0 * System.Math.PI);
                        return (float)(2.0 * (frac - System.Math.Floor(frac)) - 1.0);
                    }
                    case Osc.Square:
                        return System.Math.Sin(phase) >= 0 ? 1f : -1f;
                    default:
                        return (float)System.Math.Sin(phase);
                }
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

        /// <summary>RBJ audio-EQ-cookbook biquad (matches WebAudio's BiquadFilterNode).</summary>
        private struct Biquad
        {
            private float _b0, _b1, _b2, _a1, _a2;
            private float _x1, _x2, _y1, _y2;

            public void Set(Filt type, float freq, float q)
            {
                float w = 2f * Mathf.PI * Mathf.Clamp(freq, 10f, Synth.Rate * 0.45f) / Synth.Rate;
                float cosW = Mathf.Cos(w);
                float alpha = Mathf.Sin(w) / (2f * Mathf.Max(0.0001f, q));
                float b0, b1, b2, a0, a1, a2;

                switch (type)
                {
                    case Filt.Lowpass:
                        b0 = (1f - cosW) / 2f; b1 = 1f - cosW; b2 = (1f - cosW) / 2f;
                        break;
                    case Filt.Highpass:
                        b0 = (1f + cosW) / 2f; b1 = -(1f + cosW); b2 = (1f + cosW) / 2f;
                        break;
                    default: // bandpass, constant 0 dB peak gain
                        b0 = alpha; b1 = 0f; b2 = -alpha;
                        break;
                }
                a0 = 1f + alpha; a1 = -2f * cosW; a2 = 1f - alpha;

                _b0 = b0 / a0; _b1 = b1 / a0; _b2 = b2 / a0;
                _a1 = a1 / a0; _a2 = a2 / a0;
            }

            public float Process(float x)
            {
                float y = _b0 * x + _b1 * _x1 + _b2 * _x2 - _a1 * _y1 - _a2 * _y2;
                _x2 = _x1; _x1 = x;
                _y2 = _y1; _y1 = y;
                return y;
            }
        }
    }
}
