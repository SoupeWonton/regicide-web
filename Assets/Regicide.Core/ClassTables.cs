using System.Collections.Generic;

namespace Regicide.Core
{
    /// <summary>
    /// The four classes and their Staff/rung ids (BUILD-SPEC.md §10). The home C2
    /// rung effects are live (checked against <see cref="Hero.PathC2"/>); Staff
    /// effect handlers land in build step 6. Content display text lives in
    /// ScriptableObjects on the Unity side, keyed by these strings.
    /// </summary>
    public static class ClassTables
    {
        // Home C2 rung ids — one per class, lit on entering Continent 2 (§10).
        public const string RungBastion = "bastion";     // Sentinel ♠: shield carries to the next enemy
        public const string RungConscript = "conscript"; // Executioner ♣: recruits enter the hand
        public const string RungDepot = "depot";         // Quartermaster ♦: max hand size +2
        public const string RungRenewal = "renewal";     // Surgeon ♥: paying with 3+ cards recovers 1

        public sealed class ClassInfo
        {
            public string Id;
            public Suit HomeSuit;
            /// <summary>The home-suit C2 rung, lit on entering Continent 2.</summary>
            public string HomeRungId;
            public string[] StaffIds;
        }

        public static readonly IReadOnlyDictionary<string, ClassInfo> Classes =
            new Dictionary<string, ClassInfo>
            {
                ["sentinel"] = new ClassInfo
                {
                    Id = "sentinel",
                    HomeSuit = Suit.Spades,
                    HomeRungId = RungBastion,
                    StaffIds = new[] { "hold_the_line", "reinforce", "footwork", "parry" },
                },
                ["executioner"] = new ClassInfo
                {
                    Id = "executioner",
                    HomeSuit = Suit.Clubs,
                    HomeRungId = RungConscript,
                    StaffIds = new[] { "steady_hand", "whetstone", "bloodletting", "field_promotion" },
                },
                ["quartermaster"] = new ClassInfo
                {
                    Id = "quartermaster",
                    HomeSuit = Suit.Diamonds,
                    HomeRungId = RungDepot,
                    StaffIds = new[] { "dovetail", "ace_in_the_hole", "stockpile", "provisioner" },
                },
                ["surgeon"] = new ClassInfo
                {
                    Id = "surgeon",
                    HomeSuit = Suit.Hearts,
                    HomeRungId = RungRenewal,
                    StaffIds = new[] { "triage", "last_rites", "transfuse", "field_dressing" },
                },
            };

        public static bool IsValidPick(string classId, string staffId) =>
            classId != null && Classes.TryGetValue(classId, out var c) &&
            System.Array.IndexOf(c.StaffIds, staffId) >= 0;

        public static string HomeRungId(string classId) => Classes[classId].HomeRungId;
    }
}
