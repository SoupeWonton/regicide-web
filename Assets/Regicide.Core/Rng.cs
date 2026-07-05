using System.Collections.Generic;

namespace Regicide.Core
{
    /// <summary>
    /// Deterministic seeded RNG (mulberry32), ported from the web prototype's rng.ts.
    ///
    /// ALL randomness in Regicide.Core MUST flow through an instance of this type —
    /// never <c>System.Random</c> and never <c>UnityEngine.Random</c>. The <see cref="State"/>
    /// cursor is serialized into the save so a given seed reproduces a run exactly.
    /// (The web prototype had a bug where deck shuffles used unseeded Math.random(); do
    /// NOT reproduce that — route deck build, map gen, Hearts recovery, the fragment
    /// 50/50 drop, and reward offers all through one Rng instance.) See BUILD-SPEC.md §11.
    /// </summary>
    public sealed class Rng
    {
        private uint _a;

        /// <summary>Seed from a human-readable string (run seed).</summary>
        public Rng(string seed) => _a = HashSeed(seed);

        /// <summary>Restore from a serialized cursor (loading a run in progress).</summary>
        public Rng(uint state) => _a = state;

        /// <summary>FNV-like string → uint32 hash. Matches rng.ts hashSeed exactly.</summary>
        public static uint HashSeed(string seed)
        {
            unchecked
            {
                uint h = 1779033703u ^ (uint)seed.Length;
                for (int i = 0; i < seed.Length; i++)
                {
                    h = (h ^ seed[i]) * 3432918353u;   // JS Math.imul, low 32 bits
                    h = (h << 13) | (h >> 19);
                }
                return h;
            }
        }

        /// <summary>Next double in [0, 1).</summary>
        public double NextDouble()
        {
            unchecked
            {
                _a += 0x6D2B79F5u;
                uint a = _a;
                uint t = (a ^ (a >> 15)) * (1u | a);
                t = (t + ((t ^ (t >> 7)) * (61u | t))) ^ t;
                return (t ^ (t >> 14)) / 4294967296.0;
            }
        }

        /// <summary>Integer in [0, maxExclusive).</summary>
        public int Int(int maxExclusive) => (int)(NextDouble() * maxExclusive);

        /// <summary>Pick a uniformly random element.</summary>
        public T Pick<T>(IReadOnlyList<T> list) => list[Int(list.Count)];

        /// <summary>In-place Fisher–Yates shuffle.</summary>
        public void Shuffle<T>(IList<T> list)
        {
            for (int i = list.Count - 1; i > 0; i--)
            {
                int j = Int(i + 1);
                (list[i], list[j]) = (list[j], list[i]);
            }
        }

        /// <summary>Serializable cursor. Store in the save; restore with <c>new Rng(state)</c>.</summary>
        public uint State => _a;
    }
}
