namespace Regicide.Core
{
    /// <summary>
    /// Centralized placeholder/tunable numbers (BUILD-SPEC.md: "where it says
    /// placeholder / tunable, keep the value but centralize it"). Playtesting tunes
    /// these without touching logic.
    /// </summary>
    public static class Tuning
    {
        /// <summary>Campaign max hand size (§3). Relics/staffs may raise it later.</summary>
        public const int BaseMaxHandSize = 5;

        /// <summary>Highest starting-deck rank: the run begins with A–5 × 4 suits (§4).</summary>
        public const int StartingDeckTopRank = 5;

        /// <summary>Same-rank combo total-value cap (§3 combos).</summary>
        public const int ComboValueCap = 10;

        /// <summary>Rank grafts can never push a card above 10 — the royal cap (§6).</summary>
        public const int GraftRankCap = 10;

        /// <summary>Chance a spell fragment drops after each won encounter (§7).</summary>
        public const double FragmentDropChance = 0.5;

        /// <summary>Forge conversion rate: fragments per Half (§7).</summary>
        public const int FragmentsPerHalf = 2;
    }
}
