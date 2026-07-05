using System.Collections.Generic;

namespace Regicide.Core
{
    /// <summary>The four named relic slots (§8). A relic fits ONLY its own slot.</summary>
    public enum RelicSlot { Hat, Amulet, Ring, Cloak }

    /// <summary>
    /// The 29 relics (§8) — Core's plain-C# content table (names/slots; display
    /// text lives Unity-side). Slot themes are locked: Cloak = roads/between-fight ·
    /// Ring = economy/cards-as-resource · Hat = recruitment · Amulet = activated.
    /// </summary>
    public static class RelicTables
    {
        public sealed class RelicInfo
        {
            public string Id;
            public RelicSlot Slot;
            public string Name;
            public RelicInfo(string id, RelicSlot slot, string name) { Id = id; Slot = slot; Name = name; }
        }

        /// <summary>All 29, in a fixed order (§11 determinism — offers roll over this list).</summary>
        public static readonly RelicInfo[] All =
        {
            // Cloak (roads) — 6
            new RelicInfo("forked_road", RelicSlot.Cloak, "Forked Road"),
            new RelicInfo("forced_march", RelicSlot.Cloak, "Forced March"),
            new RelicInfo("bedroll", RelicSlot.Cloak, "Bedroll"),
            new RelicInfo("vanguard", RelicSlot.Cloak, "Vanguard"),
            new RelicInfo("slip_away", RelicSlot.Cloak, "Slip Away"),
            new RelicInfo("scout_ahead", RelicSlot.Cloak, "Scout Ahead"),
            // Ring (economy) — 8
            new RelicInfo("hoard", RelicSlot.Ring, "Hoard"),
            new RelicInfo("interest", RelicSlot.Ring, "Interest"),
            new RelicInfo("debt", RelicSlot.Ring, "Debt"),
            new RelicInfo("requisition_writ", RelicSlot.Ring, "Requisition Writ"),
            new RelicInfo("liquidate", RelicSlot.Ring, "Liquidate"),
            new RelicInfo("last_coin", RelicSlot.Ring, "Last Coin"),
            new RelicInfo("caravan_coin", RelicSlot.Ring, "Caravan Coin"),
            new RelicInfo("double_or_nothing", RelicSlot.Ring, "Double or Nothing"),
            // Hat (recruitment) — 8
            new RelicInfo("conscription", RelicSlot.Hat, "Conscription"),
            new RelicInfo("press_gang", RelicSlot.Hat, "Press-gang"),
            new RelicInfo("rallying_cry", RelicSlot.Hat, "Rallying Cry"),
            new RelicInfo("battlefield_promotion", RelicSlot.Hat, "Battlefield Promotion"),
            new RelicInfo("black_standard", RelicSlot.Hat, "Black Standard"),
            new RelicInfo("apprentice", RelicSlot.Hat, "Apprentice"),
            new RelicInfo("muster", RelicSlot.Hat, "Muster"),
            new RelicInfo("plunder", RelicSlot.Hat, "Plunder"),
            // Amulet (activated buttons) — 7
            new RelicInfo("sainted_scalpel", RelicSlot.Amulet, "Sainted Scalpel"),
            new RelicInfo("unbinding", RelicSlot.Amulet, "Unbinding"),
            new RelicInfo("second_wind", RelicSlot.Amulet, "Second Wind"),
            new RelicInfo("aegis", RelicSlot.Amulet, "Aegis"),
            new RelicInfo("bloodlust", RelicSlot.Amulet, "Bloodlust"),
            new RelicInfo("echo", RelicSlot.Amulet, "Echo"),
            new RelicInfo("lodestone", RelicSlot.Amulet, "Lodestone"),
        };

        private static readonly Dictionary<string, RelicInfo> _byId = Build();

        private static Dictionary<string, RelicInfo> Build()
        {
            var d = new Dictionary<string, RelicInfo>();
            foreach (var r in All) d[r.Id] = r;
            return d;
        }

        public static bool Exists(string id) => id != null && _byId.ContainsKey(id);
        public static RelicInfo Get(string id) => _byId[id];
    }
}
