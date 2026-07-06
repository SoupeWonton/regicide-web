using System.Collections.Generic;
using Regicide.Core;

namespace Regicide.Unity
{
    /// <summary>
    /// Display text for content ids (spec §16). The plain-C# stand-in the UI reads
    /// until ScriptableObject assets (Defs.cs) are authored in the editor — Core
    /// only ever speaks ids; every player-facing word lives on this side.
    /// </summary>
    public static class ContentText
    {
        public sealed class Entry
        {
            public string Name;
            public string Rules;
            public Entry(string name, string rules) { Name = name; Rules = rules; }
        }

        // ── classes (§10) ───────────────────────────────────────────────────────
        public static readonly Dictionary<string, Entry> Classes = new Dictionary<string, Entry>
        {
            ["sentinel"] = new Entry("Sentinel", "Block and defense. Home suit ♠.\nC2 rung — Bastion: on enemy death, excess shield carries to the next enemy (capped by ♠ cards played)."),
            ["executioner"] = new Entry("Executioner", "Kill and aggression. Home suit ♣.\nC2 rung — Conscript: exact-kill recruits enter your hand."),
            ["quartermaster"] = new Entry("Quartermaster", "Combine and tempo. Home suit ♦.\nC2 rung — Depot: max hand size +2."),
            ["surgeon"] = new Entry("Surgeon", "Persist and recovery. Home suit ♥.\nC2 rung — Renewal: paying a counter with 3+ cards recovers 1."),
        };

        /// <summary>Locked ladder names per class — future-teaser display only (§10).</summary>
        public static readonly Dictionary<string, string[]> LockedLadders = new Dictionary<string, string[]>
        {
            ["sentinel"] = new[] { "Vigil ♥", "Fortress ♦", "Thornline ♣" },
            ["executioner"] = new[] { "Bloodward ♠", "Harvest ♥", "Reaper ♦" },
            ["quartermaster"] = new[] { "Rationing ♠", "Requisition ♥", "Munitions ♣" },
            ["surgeon"] = new[] { "Convalescence ♠", "Lifeline ♦", "Sterilize ♣" },
        };

        // ── staffs (§10) ────────────────────────────────────────────────────────
        public static readonly Dictionary<string, Entry> Staffs = new Dictionary<string, Entry>
        {
            ["hold_the_line"] = new Entry("Hold the Line", "Activated, once/enemy — the highest ♠ in your discard adds its value to shield; the card stays in the discard."),
            ["reinforce"] = new Entry("Reinforce", "Passive — a same-rank combo may include ONE ♠ of any rank."),
            ["footwork"] = new Entry("Footwork", "Activated — bury a hand ♠ to the Tavern bottom, draw 1."),
            ["parry"] = new Entry("Parry", "Activated, pay step — spend a hand ♠: its value adds to shield and reduces the payment owed."),
            ["steady_hand"] = new Entry("Steady Hand", "Toggle — the next play skips the ♣ double (deal single damage on purpose)."),
            ["whetstone"] = new Entry("Whetstone", "Passive, once/enemy — a 1–2 point overshoot is shaved down to an exact kill."),
            ["bloodletting"] = new Entry("Bloodletting", "Activated — discard a card, add half its value (rounded down) to the next attack."),
            ["field_promotion"] = new Entry("Field Promotion", "Passive — exact-kill recruits enter your hand (not the Tavern)."),
            ["dovetail"] = new Entry("Dovetail", "Passive — a same-rank combo may include ONE adjacent-value card of any suit."),
            ["ace_in_the_hole"] = new Entry("Ace in the Hole", "Toggle — the next Ace pair plays the Ace at the partner's value."),
            ["stockpile"] = new Entry("Stockpile", "Once/enemy — keep one extra overdraw card; hand may exceed the cap by 1."),
            ["provisioner"] = new Entry("Provisioner", "Activated — discard 1, then draw 1."),
            ["triage"] = new Entry("Triage", "Passive — recovery pauses: pick which discards return, up to the recovered amount."),
            ["last_rites"] = new Entry("Last Rites", "Passive, once/enemy — pick one recovered card into your hand."),
            ["transfuse"] = new Entry("Transfuse", "Toggle, once/enemy — the next ♥ play skips recovery; its base value becomes shield instead."),
            ["field_dressing"] = new Entry("Field Dressing", "Passive, once/enemy — the first recovery each enemy recovers +1."),
        };

        /// <summary>Staffs whose activation targets a hand card.</summary>
        public static readonly HashSet<string> StaffNeedsHandTarget = new HashSet<string>
        {
            "footwork", "parry", "bloodletting", "provisioner",
        };

        /// <summary>Staffs with no activated use at all (pure passives).</summary>
        public static readonly HashSet<string> StaffPassive = new HashSet<string>
        {
            "reinforce", "whetstone", "field_promotion", "dovetail",
            "triage", "last_rites", "field_dressing",
        };

        // ── relics (§8) ─────────────────────────────────────────────────────────
        public static readonly Dictionary<string, string> RelicRules = new Dictionary<string, string>
        {
            ["forked_road"] = "At a road fork, see one layer further ahead before choosing.",
            ["forced_march"] = "Skip one ordinary fight per province (skirmish/veteran) — no recruit or graft from it.",
            ["bedroll"] = "Once per province, reshuffle the discard into the Tavern without a Camp.",
            ["vanguard"] = "The first enemy of each new road can't counterattack on its first turn.",
            ["slip_away"] = "Discard 5 card-value to retreat from a fight: keep your hand, enemy not defeated.",
            ["scout_ahead"] = "See the next enemy's immunity before you fight it.",
            ["hoard"] = "Max hand size +2.",
            ["interest"] = "If you paid no discards in the previous fight, start the next fight +1 card.",
            ["debt"] = "Once per fight, draw 2 now, then discard 1 at the start of each of your next two turns.",
            ["requisition_writ"] = "Once per province, convert your two lowest hand cards into one fragment.",
            ["liquidate"] = "Once per fight, discard one card to draw 2.",
            ["last_coin"] = "The first time you begin a turn empty-handed each fight, draw 3.",
            ["caravan_coin"] = "Caravan pay-from-hand cost reduced by 2.",
            ["double_or_nothing"] = "Once per fight, discard your whole hand (n cards) and draw n+1.",
            ["conscription"] = "An overkill still recruits the card, one value down (−1 token).",
            ["press_gang"] = "Recruited cards arrive rewritten to your class home suit.",
            ["rallying_cry"] = "When you recruit, one card returns from the discard to the Tavern.",
            ["battlefield_promotion"] = "The first card you recruit each fight enters +1 rank (cap 10).",
            ["black_standard"] = "A recruited card enters the top of the Tavern — your next draw.",
            ["apprentice"] = "On recruit, draw 1.",
            ["muster"] = "Gate-kept royals enter the Tavern top.",
            ["plunder"] = "On an exact kill, the recruit enters at the rank of your strongest same-suit discard.",
            ["sainted_scalpel"] = "Once/fight: shuffle up to 6 cards from the discard into the Tavern, draw 1.",
            ["unbinding"] = "Once/enemy: cancel the enemy's immunity for this play only.",
            ["second_wind"] = "Once/fight: take an extra turn before the enemy counterattacks.",
            ["aegis"] = "Once/enemy: reduce the enemy's next counterattack by 5.",
            ["bloodlust"] = "Once/enemy: your next play deals +3 damage.",
            ["echo"] = "Once/fight: replay a card from your discard for its value only (no suit power).",
            ["lodestone"] = "Once/fight: pull one specific card from the Tavern into your hand.",
        };

        /// <summary>Relics with an activated (clickable) use, and what they target.</summary>
        public enum RelicTarget { None, OneHandCard, HandCards, DiscardCard, TavernCard }

        public static readonly Dictionary<string, RelicTarget> RelicActives = new Dictionary<string, RelicTarget>
        {
            ["forced_march"] = RelicTarget.None,
            ["bedroll"] = RelicTarget.None,
            ["slip_away"] = RelicTarget.HandCards,
            ["debt"] = RelicTarget.None,
            ["requisition_writ"] = RelicTarget.None,
            ["liquidate"] = RelicTarget.OneHandCard,
            ["double_or_nothing"] = RelicTarget.None,
            ["sainted_scalpel"] = RelicTarget.None,
            ["unbinding"] = RelicTarget.None,
            ["second_wind"] = RelicTarget.None,
            ["aegis"] = RelicTarget.None,
            ["bloodlust"] = RelicTarget.None,
            ["echo"] = RelicTarget.DiscardCard,
            ["lodestone"] = RelicTarget.TavernCard,
        };

        // ── spells (§7) ─────────────────────────────────────────────────────────
        public static string SpellRules(Suit suit, int tier)
        {
            switch (suit)
            {
                case Suit.Clubs: return tier == SpellTables.TierHalf
                    ? "Commit — the next play may include ONE extra card of any rank (cap applies; not with an Ace pair)."
                    : "Keen Edge — the next attack deals ×2.";
                case Suit.Diamonds: return tier == SpellTables.TierHalf
                    ? "Rally — at the next counterattack, draw min(net, 5) before paying."
                    : "Quick Muster — draw 2.";
                case Suit.Spades: return tier == SpellTables.TierHalf
                    ? "Brace — during the pay step, spend your highest hand card: its value shields and cuts the payment."
                    : "Guard Up — enemy shield +3.";
                default: return tier == SpellTables.TierHalf
                    ? "Full Recycle — return the entire discard to the Tavern, draw 2."
                    : "Refit — return 3 discards to the Tavern, draw 1.";
            }
        }

        /// <summary>Hover explainer per node kind — what committing to this stop does.</summary>
        public static string NodeTip(RoadNodeKind kind) => kind switch
        {
            RoadNodeKind.Start => "where this road began",
            RoadNodeKind.Skirmish => "an ordinary fight — an exact kill recruits the card (or grafts, if you already own its face)",
            RoadNodeKind.Veteran => "a tougher fight — exact kills recruit (or graft)",
            RoadNodeKind.Elite => "a dangerous fight — in Continent 2, a lone royal duel",
            RoadNodeKind.Boss => "the province boss — clearing it ends the chapter with a free seam rest",
            RoadNodeKind.Gate => "all four royals of this rank, one duel at a time. Exact kills stay eligible for the keep; overkills are banished forever",
            RoadNodeKind.Recruit => "a recruiting fight — it prefers a card you are still missing",
            RoadNodeKind.Hunt => "chase a specific recruit you are missing from this province's ranks",
            RoadNodeKind.Camp => "rest: reshuffle the discard into the deck, refill your hand, and arm the next fight's double first strike + 10 block",
            RoadNodeKind.Forge => "convert 2 spell fragments into 1 Half — repeatable while you stand here",
            RoadNodeKind.Sanctum => "move one graft from one card to another, once per visit",
            RoadNodeKind.Lair => "a raid: an elite-grade fight, then pick 1 of 2 relics",
            RoadNodeKind.Caravan => "a relic for sale — pay with cards from your hand",
            RoadNodeKind.Shrine => "a small offering: +1 spell fragment",
            RoadNodeKind.Heroes => "the Fallen Heroes — swap your Staff freely while you stand here",
            _ => "",
        };

        /// <summary>The four suit powers (§3), one line each — tooltip fodder.</summary>
        public static string SuitPower(Suit suit) => suit switch
        {
            Suit.Clubs => "♣ doubles the whole play's damage",
            Suit.Diamonds => "♦ draws cards, up to the play's value",
            Suit.Hearts => "♥ recovers discards to the deck, up to the play's value",
            Suit.Spades => "♠ builds block equal to the play's value",
            _ => "",
        };

        public static string StaffName(string id) =>
            Staffs.TryGetValue(id, out var e) ? e.Name : id;

        public static string ClassName(string id) =>
            Classes.TryGetValue(id, out var e) ? e.Name : id;

        public static string NodeLabel(RoadNodeKind kind)
        {
            switch (kind)
            {
                case RoadNodeKind.Start: return "Start";
                case RoadNodeKind.Skirmish: return "Skirmish";
                case RoadNodeKind.Veteran: return "Veteran";
                case RoadNodeKind.Elite: return "Elite";
                case RoadNodeKind.Boss: return "Boss";
                case RoadNodeKind.Recruit: return "Recruit";
                case RoadNodeKind.Hunt: return "Hunt";
                case RoadNodeKind.Camp: return "Camp";
                case RoadNodeKind.Forge: return "Forge";
                case RoadNodeKind.Sanctum: return "Sanctum";
                case RoadNodeKind.Lair: return "Lair";
                case RoadNodeKind.Caravan: return "Caravan";
                case RoadNodeKind.Shrine: return "Shrine";
                case RoadNodeKind.Event: return "? Event";
                case RoadNodeKind.Heroes: return "Fallen Heroes";
                case RoadNodeKind.Gate: return "Royal Gate";
                default: return kind.ToString();
            }
        }
    }
}
