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

        // Spell effect numbers (§7 — placeholders, centralized for tuning).
        /// <summary>Quick Muster (♦ Fragment): cards drawn.</summary>
        public const int QuickMusterDraw = 2;
        /// <summary>Rally (♦ Half): draw min(net, this) before paying a counterattack.</summary>
        public const int RallyDrawCap = 5;
        /// <summary>Guard Up (♠ Fragment): flat shield added.</summary>
        public const int GuardUpShield = 3;
        /// <summary>Refit (♥ Fragment): discards returned to the Tavern / cards drawn.</summary>
        public const int RefitReturn = 3;
        public const int RefitDraw = 1;
        /// <summary>Full Recycle (♥ Half): cards drawn after recycling the whole discard.</summary>
        public const int RecycleDraw = 2;

        // Relic numbers (§8 — placeholders, centralized for tuning).
        /// <summary>Hoard (Ring): max hand size bonus.</summary>
        public const int HoardHandBonus = 2;
        /// <summary>Interest (Ring): cards drawn at fight start after a no-pay fight.</summary>
        public const int InterestDraw = 1;
        /// <summary>Debt (Ring): cards drawn now / turns owing a discard.</summary>
        public const int DebtDraw = 2;
        public const int DebtTurns = 2;
        /// <summary>Requisition Writ (Ring): hand cards converted per fragment.</summary>
        public const int RequisitionCards = 2;
        /// <summary>Liquidate (Ring): cards drawn for the discarded one.</summary>
        public const int LiquidateDraw = 2;
        /// <summary>Last Coin (Ring): cards drawn on the first empty-handed turn each fight.</summary>
        public const int LastCoinDraw = 3;
        /// <summary>Caravan: pay-from-hand relic cost (card value) / Caravan Coin discount.</summary>
        public const int CaravanCost = 8;
        public const int CaravanCoinDiscount = 2;
        /// <summary>Slip Away (Cloak): card value paid to retreat from a fight.</summary>
        public const int SlipAwayCost = 5;
        /// <summary>Sainted Scalpel (Amulet): max discards shuffled back.</summary>
        public const int ScalpelMax = 6;
        /// <summary>Aegis (Amulet): counterattack reduction.</summary>
        public const int AegisReduction = 5;
        /// <summary>Bloodlust (Amulet): bonus damage on the next play.</summary>
        public const int BloodlustBonus = 3;
        /// <summary>Lair: relics offered after the raid (pick 1).</summary>
        public const int LairOffers = 2;

        /// <summary>Camp bonus: shield already on the first enemy of the next fight (§9).</summary>
        public const int CampStartShield = 10;

        /// <summary>Depot rung (Quartermaster ♦): max hand size bonus while lit (§10).</summary>
        public const int DepotHandBonus = 2;

        /// <summary>Renewal rung (Surgeon ♥): min cards paid to a counter to recover 1 (§10).</summary>
        public const int RenewalMinPayCards = 3;

        /// <summary>Whetstone staff (§10): max overshoot auto-shaved down to an exact kill.</summary>
        public const int WhetstoneShaveMax = 2;

        /// <summary>Field Dressing staff (§10): bonus to the first recovery each enemy.</summary>
        public const int FieldDressingBonus = 1;

        /// <summary>Chapters per continent — provinces are chapters within a continent (§4).</summary>
        public const int ChaptersPerContinent = 3;

        /// <summary>Final chapter of this alpha build (ch6 = the King Gate, §4).</summary>
        public const int FinalChapter = 6;
    }
}
