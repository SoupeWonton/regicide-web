using System.Collections.Generic;
using System.Linq;

namespace Regicide.Core
{
    /// <summary>Road node kinds (BUILD-SPEC.md §12).</summary>
    public enum RoadNodeKind
    {
        Start, Skirmish, Veteran, Elite, Boss, Recruit,
        Hunt, Camp, Forge, Sanctum, Lair, Caravan, Shrine, Event, Heroes, Gate,
    }

    /// <summary>One node of a chapter's branching, one-way road graph.</summary>
    public sealed class RoadNode
    {
        public int Id;
        public RoadNodeKind Kind;
        public int Layer;
        /// <summary>Forward edges (node ids in the next layer). One-way; no backtracking.</summary>
        public List<int> Next = new List<int>();
        /// <summary>Unknown nodes show '?' until adjacent/visited (§12).</summary>
        public bool Known;
        public bool Visited;
    }

    /// <summary>The generated map for the current chapter.</summary>
    public sealed class RoadMapState
    {
        public int Chapter;
        public List<RoadNode> Nodes = new List<RoadNode>();
        public int CurrentNodeId;

        public RoadNode Get(int id) => Nodes.First(n => n.Id == id);
        public RoadNode Current => Get(CurrentNodeId);
    }

    /// <summary>
    /// Deterministic per-chapter map generation (§12): singleton anchor stops
    /// (start, elite, boss, gate) with WIDE bands of 3–4 nodes between them, so a
    /// province reads as 3–4 distinct winding roads instead of a woven pair. The
    /// seeded RNG shuffles which column holds what inside each band. Guarantees per
    /// C1 province: a skirmish ramp, a Recruit, a Hunt, ≥2 camps, a Lair, a Forge
    /// and a Caravan somewhere on the map; C2 mirrors with royal duels, Sanctum and
    /// Shrine (Fallen Heroes replaces Shrine on ch5, §10). The whole map is KNOWN
    /// from the first step — with sparse lanes the player plans a route, no fog.
    /// </summary>
    public static class RoadGen
    {
        public static RoadMapState Generate(int chapter, Rng rng)
        {
            // Each entry is one layer of node kinds; wide layers are shuffled in
            // place by the seeded rng, singletons are the anchors lanes merge into.
            var layers = chapter <= 3
                ? new[]
                {
                    new[] { RoadNodeKind.Start },
                    new[] { RoadNodeKind.Skirmish, RoadNodeKind.Skirmish, RoadNodeKind.Recruit },
                    new[] { RoadNodeKind.Camp, RoadNodeKind.Veteran, RoadNodeKind.Hunt, RoadNodeKind.Recruit },
                    new[] { RoadNodeKind.Forge, RoadNodeKind.Caravan, RoadNodeKind.Camp },   // economy band (§7, §8)
                    new[] { RoadNodeKind.Lair, RoadNodeKind.Veteran, RoadNodeKind.Camp, RoadNodeKind.Skirmish },
                    new[] { RoadNodeKind.Veteran, RoadNodeKind.Veteran, RoadNodeKind.Recruit },
                    new[] { RoadNodeKind.Elite },
                    new[] { RoadNodeKind.Boss },
                }
                : new[]
                {
                    new[] { RoadNodeKind.Start },
                    new[] { RoadNodeKind.Skirmish, RoadNodeKind.Veteran, RoadNodeKind.Camp },
                    // Elite on a C2 road is a royal duel; ch5 P2 opens with Fallen Heroes (§10).
                    new[] { RoadNodeKind.Elite, chapter == 5 ? RoadNodeKind.Heroes : RoadNodeKind.Shrine, RoadNodeKind.Veteran, RoadNodeKind.Camp },
                    new[] { RoadNodeKind.Forge, RoadNodeKind.Sanctum, RoadNodeKind.Caravan },// utility band (§7, §9)
                    new[] { RoadNodeKind.Lair, RoadNodeKind.Camp, RoadNodeKind.Veteran, RoadNodeKind.Skirmish },
                    new[] { RoadNodeKind.Veteran, RoadNodeKind.Elite, RoadNodeKind.Camp },
                    new[] { RoadNodeKind.Gate },
                };

            var map = new RoadMapState { Chapter = chapter };
            int id = 0;
            var built = new List<List<RoadNode>>();

            for (int layer = 0; layer < layers.Length; layer++)
            {
                var kinds = layers[layer].ToList();
                if (kinds.Count > 1) rng.Shuffle(kinds);
                var row = kinds.Select(k => new RoadNode { Id = id++, Kind = k, Layer = layer }).ToList();
                built.Add(row);
                map.Nodes.AddRange(row);
            }

            // Proportional-adjacency edges: each node exits to the next layer's
            // NEAREST column (by relative position), sometimes also one neighbour —
            // never further, so lanes wind but don't weave. Anchors spread to /
            // merge from a whole band. Invariants (pillar 6, no soft-locks): every
            // node keeps ≥1 exit and every next-layer node gains ≥1 entrance.
            for (int layer = 0; layer + 1 < built.Count; layer++)
            {
                var from = built[layer];
                var to = built[layer + 1];

                if (from.Count == 1)
                {
                    from[0].Next.AddRange(to.Select(n => n.Id)); // the band opens
                    continue;
                }
                if (to.Count == 1)
                {
                    foreach (var node in from) node.Next.Add(to[0].Id); // lanes merge
                    continue;
                }

                // Pass 1 — every node exits to its nearest column.
                var lane = new int[from.Count];
                for (int i = 0; i < from.Count; i++)
                {
                    float c = i * (to.Count - 1) / (float)(from.Count - 1);
                    lane[i] = (int)System.Math.Round(c, System.MidpointRounding.AwayFromZero);
                    from[i].Next.Add(to[lane[i]].Id);
                }

                // Pass 2 — orphan patch: an uncovered column gets an edge from its
                // own nearest source (for these band widths that's at most one
                // rescue per source, so nothing ever exceeds two exits).
                for (int j = 0; j < to.Count; j++)
                {
                    if (from.Any(n => n.Next.Contains(to[j].Id))) continue;
                    int i0 = (int)System.Math.Round(j * (from.Count - 1) / (float)(to.Count - 1),
                        System.MidpointRounding.AwayFromZero);
                    from[i0].Next.Add(to[j].Id);
                }

                // Pass 3 — a 35% second exit to the adjacent column keeps some
                // choice alive without weaving the lanes back into a mesh.
                for (int i = 0; i < from.Count; i++)
                {
                    if (from[i].Next.Count >= 2 || rng.Int(100) >= 35) continue;
                    float c = i * (to.Count - 1) / (float)(from.Count - 1);
                    int side = c > lane[i] ? 1 : c < lane[i] ? -1 : (rng.Int(2) == 0 ? -1 : 1);
                    int j1 = lane[i] + side;
                    if (j1 >= 0 && j1 < to.Count && !from[i].Next.Contains(to[j1].Id))
                        from[i].Next.Add(to[j1].Id);
                }
            }

            // No fog: the road is a plan, not a reveal — every node reads from turn one.
            foreach (var n in map.Nodes) n.Known = true;

            var start = built[0][0];
            start.Visited = true;
            map.CurrentNodeId = start.Id;

            return map;
        }
    }

    /// <summary>
    /// Enemy lineup construction per node kind and chapter (§4, §12). Province rank
    /// bands: ch1 fields 6s–7s, ch2 8s–9s, ch3 10s; C2 roads field the full 6–10
    /// (every exact kill there is redundant → grafts). All rolls go through the
    /// seeded RNG at fight entry.
    /// </summary>
    public static class Lineups
    {
        private static readonly Suit[] AllSuits = { Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades };

        public static (int lo, int hi) Band(int chapter) => chapter switch
        {
            1 => (6, 7),
            2 => (8, 9),
            3 => (10, 10),
            _ => (6, 10), // C2 roads
        };

        /// <summary>Which royal rank duels/gates on a C2 chapter (ch4 J, ch5 Q, ch6 K).</summary>
        public static Rank RoyalRank(int chapter) => chapter switch
        {
            4 => Rank.Jack,
            5 => Rank.Queen,
            _ => Rank.King,
        };

        public static List<EnemyState> For(RoadNodeKind kind, int chapter, CampaignState state, Rng rng)
        {
            var (lo, hi) = Band(chapter);
            switch (kind)
            {
                case RoadNodeKind.Skirmish:
                    return new List<EnemyState> { Number(chapter <= 3 ? lo : RollRank(rng, lo, hi), EnemyTier.Skirmish, rng) };

                case RoadNodeKind.Veteran:
                    return new List<EnemyState> { Number(chapter <= 3 ? hi : RollRank(rng, lo, hi), EnemyTier.Veteran, rng) };

                case RoadNodeKind.Recruit:
                    // A dedicated recruiting fight: prefer a face the player is missing.
                    return new List<EnemyState> { RecruitTarget(lo, hi, state, rng) };

                case RoadNodeKind.Elite:
                    if (chapter > 3) // C2 road duel: a lone royal of the province's rank
                        return new List<EnemyState>
                            { EnemyState.Royal(rng.Pick(AllSuits), RoyalRank(chapter), EnemyTier.Elite) };
                    return new List<EnemyState>
                        { Number(lo, EnemyTier.Elite, rng), Number(hi, EnemyTier.Elite, rng) };

                case RoadNodeKind.Boss:
                    // ch1/ch2: a pair of the band's top rank; ch3: the Council of three 10s.
                    int n = chapter >= 3 ? 3 : 2;
                    var boss = new List<EnemyState>();
                    for (int i = 0; i < n; i++) boss.Add(Number(hi, EnemyTier.Boss, rng));
                    return boss;

                case RoadNodeKind.Gate:
                    // The royal gate: all four royals of the province's rank, as
                    // sequential duels in a seeded order (§4).
                    var suits = new List<Suit>(AllSuits);
                    rng.Shuffle(suits);
                    return suits.Select(s => EnemyState.Royal(s, RoyalRank(chapter), EnemyTier.Gate)).ToList();

                default:
                    throw new System.InvalidOperationException($"{kind} is not a fight node");
            }
        }

        /// <summary>A single hunted number enemy (the C1 Hunt landmark, §4).</summary>
        public static List<EnemyState> Hunted(Suit suit, Rank rank) =>
            new List<EnemyState> { EnemyState.Number(suit, rank, EnemyTier.Veteran) };

        /// <summary>Faces in 6..bandHi the player does not own — legal Hunt quarry (§4).</summary>
        public static List<CardFace> MissingFaces(int chapter, CampaignState state)
        {
            var missing = new List<CardFace>();
            int hi = Band(chapter).hi;
            for (int r = 6; r <= hi; r++)
                foreach (var s in AllSuits)
                {
                    var face = new CardFace(s, (Rank)r);
                    if (!state.OwnsFace(face)) missing.Add(face);
                }
            return missing;
        }

        private static EnemyState Number(int rank, EnemyTier tier, Rng rng) =>
            EnemyState.Number(rng.Pick(AllSuits), (Rank)rank, tier);

        private static int RollRank(Rng rng, int lo, int hi) => lo + rng.Int(hi - lo + 1);

        private static EnemyState RecruitTarget(int lo, int hi, CampaignState state, Rng rng)
        {
            var missing = new List<CardFace>();
            for (int r = lo; r <= hi; r++)
                foreach (var s in AllSuits)
                {
                    var face = new CardFace(s, (Rank)r);
                    if (!state.OwnsFace(face)) missing.Add(face);
                }

            var pick = missing.Count > 0
                ? rng.Pick(missing)
                : new CardFace(rng.Pick(AllSuits), (Rank)RollRank(rng, lo, hi));
            return EnemyState.Number(pick.Suit, pick.Rank, EnemyTier.Skirmish);
        }
    }
}
