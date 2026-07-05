namespace Regicide.Core
{
    /// <summary>
    /// The eight spells (§7): four suit identities × two castable tiers. Names here
    /// are the Core content table; display text lives Unity-side keyed by suit+tier.
    /// Spells sit ABOVE suit immunity — casting never checks the enemy's suit.
    /// </summary>
    public static class SpellTables
    {
        public const int TierEmpty = 0;
        public const int TierFragment = 1;
        public const int TierHalf = 2;

        public static string Name(Suit suit, int tier) => (suit, tier) switch
        {
            (Suit.Clubs, TierFragment) => "Keen Edge",
            (Suit.Clubs, TierHalf) => "Commit",
            (Suit.Diamonds, TierFragment) => "Quick Muster",
            (Suit.Diamonds, TierHalf) => "Rally",
            (Suit.Spades, TierFragment) => "Guard Up",
            (Suit.Spades, TierHalf) => "Brace",
            (Suit.Hearts, TierFragment) => "Refit",
            (Suit.Hearts, TierHalf) => "Full Recycle",
            _ => "?",
        };
    }
}
