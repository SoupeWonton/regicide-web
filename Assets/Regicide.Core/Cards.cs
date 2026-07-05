namespace Regicide.Core
{
    /// <summary>Card suits. Glyphs: Clubs ♣, Diamonds ♦, Hearts ♥, Spades ♠.</summary>
    public enum Suit { Clubs, Diamonds, Hearts, Spades }

    /// <summary>
    /// Card ranks. Ace..King. Attack values (see <see cref="CardRules.AttackValue"/>):
    /// A=1, 2–10 = face value, J=10, Q=15, K=20. (No Jesters — solo has zero.)
    /// </summary>
    public enum Rank { Ace = 1, Two, Three, Four, Five, Six, Seven, Eight, Nine, Ten, Jack, Queen, King }

    public static class CardRules
    {
        /// <summary>Combat attack value of a rank (BUILD-SPEC.md §3).</summary>
        public static int AttackValue(Rank r) => r switch
        {
            Rank.Jack => 10,
            Rank.Queen => 15,
            Rank.King => 20,
            _ => (int)r,   // Ace = 1 … Ten = 10
        };

        public static bool IsRoyal(Rank r) => r is Rank.Jack or Rank.Queen or Rank.King;

        /// <summary>Enemy stats for a royal (Jack 20/10, Queen 30/15, King 40/20).</summary>
        public static (int hp, int attack) RoyalStats(Rank r) => r switch
        {
            Rank.Jack => (20, 10),
            Rank.Queen => (30, 15),
            Rank.King => (40, 20),
            _ => (0, 0),
        };

        /// <summary>C1 number-enemy stats (ranks 6–10): HP = rank×3, ATK = max(2, round(rank×0.55)).</summary>
        public static (int hp, int attack) NumberEnemyStats(Rank r)
        {
            int v = (int)r;
            int atk = System.Math.Max(2, (int)System.Math.Round(v * 0.55));
            return (v * 3, atk);
        }
    }

    /// <summary>An immutable printed or effective card face.</summary>
    public readonly struct CardFace
    {
        public readonly Suit Suit;
        public readonly Rank Rank;
        public CardFace(Suit suit, Rank rank) { Suit = suit; Rank = rank; }
        public override string ToString() => $"{Rank} of {Suit}";
    }

    // NOTE for the implementer: the PhysicalCard registry + GraftRecord model
    // (stable physicalId, printed vs derived-effective face, rank/suit/suit-add
    // grafts, royal cap at 10) lives here too — see BUILD-SPEC.md §5–§6. Kept out
    // of this seed so you can shape it as you build the acquisition engine.
}
