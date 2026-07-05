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
    /// Deterministic per-chapter map generation (§12): a fixed template shape per
    /// continent, with the seeded RNG deciding which side of each fork holds what.
    /// Every C1 province guarantees a fight, a bonus fork and a lair-vs-safe fork,
    /// ramping skirmish → veteran → elite into the boss; C2 mirrors the shape with
    /// the royal gate as the boss. Template shapes are plain-C# content tables for
    /// now — RoadTemplate ScriptableObjects can replace them later (§12).
    /// </summary>
    public static class RoadGen
    {
        public static RoadMapState Generate(int chapter, Rng rng)
        {
            // Each entry is one layer; a layer is 1–2 slots of node kinds.
            // Two-slot layers are forks — the rng may swap which side is which.
            var layers = chapter <= 3
                ? new[]
                {
                    new[] { RoadNodeKind.Start },
                    new[] { RoadNodeKind.Skirmish },
                    new[] { RoadNodeKind.Recruit, RoadNodeKind.Camp },   // bonus fork
                    new[] { RoadNodeKind.Veteran, RoadNodeKind.Hunt },
                    new[] { RoadNodeKind.Lair, RoadNodeKind.Camp },      // lair vs safe
                    new[] { RoadNodeKind.Elite },
                    new[] { RoadNodeKind.Boss },
                }
                : new[]
                {
                    new[] { RoadNodeKind.Start },
                    new[] { RoadNodeKind.Skirmish },
                    new[] { RoadNodeKind.Veteran, RoadNodeKind.Camp },
                    // Elite on a C2 road is a royal duel; ch5 P2 opens with Fallen Heroes (§10).
                    new[] { RoadNodeKind.Elite, chapter == 5 ? RoadNodeKind.Heroes : RoadNodeKind.Event },
                    new[] { RoadNodeKind.Lair, RoadNodeKind.Camp },
                    new[] { RoadNodeKind.Veteran },
                    new[] { RoadNodeKind.Gate },
                };

            var map = new RoadMapState { Chapter = chapter };
            int id = 0;
            var built = new List<List<RoadNode>>();

            for (int layer = 0; layer < layers.Length; layer++)
            {
                var kinds = layers[layer].ToArray();
                if (kinds.Length == 2 && rng.Int(2) == 1)
                    (kinds[0], kinds[1]) = (kinds[1], kinds[0]);

                var row = kinds.Select(k => new RoadNode { Id = id++, Kind = k, Layer = layer }).ToList();
                built.Add(row);
                map.Nodes.AddRange(row);
            }

            // Every node connects to every node of the next layer: forks are a choice
            // of destination, and no branch can dead-end (pillar 6, no soft-locks).
            for (int layer = 0; layer + 1 < built.Count; layer++)
                foreach (var node in built[layer])
                    node.Next.AddRange(built[layer + 1].Select(n => n.Id));

            var start = built[0][0];
            start.Known = start.Visited = true;
            map.CurrentNodeId = start.Id;
            foreach (int next in start.Next) map.Get(next).Known = true;

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
