using System.Collections.Generic;

namespace Regicide.Core
{
    /// <summary>Top-level phase driving the UI state machine (BUILD-SPEC.md §4).</summary>
    public enum CampaignPhase
    {
        ClassSelect,
        Road,
        Landmark,
        Encounter,
        Camp,
        ChapterComplete,
        Death,
        CampaignWon,
        CampaignLost,
    }

    /// <summary>The solo hero (§4).</summary>
    public sealed class Hero
    {
        public string ClassId;
        public string StaffId;
        /// <summary>The home-suit C2 ladder rung, lit on entering C2. Null until then.</summary>
        public string PathC2;
        public bool Alive = true;
    }

    /// <summary>
    /// The persistent deck: Tavern (draw pile), discard, hand — lists of physicalIds.
    /// Tavern index 0 is the TOP (next draw); the end of the list is the bottom.
    /// Persists between road fights; only explicit rests reshuffle/redraw (§3, §9).
    /// </summary>
    public sealed class DeckState
    {
        public List<int> Tavern = new List<int>();
        public List<int> Discard = new List<int>();
        public List<int> Hand = new List<int>();
    }

    /// <summary>Enemy tier — drives rewards/UI, not combat math.</summary>
    public enum EnemyTier { Skirmish, Veteran, Elite, Boss, Gate }

    /// <summary>One enemy in an encounter (§3).</summary>
    public sealed class EnemyState
    {
        public Suit Suit;
        public Rank Rank;
        public int Hp;
        public int MaxHp;
        public int Attack;
        /// <summary>Cumulative shield from ♠ plays; reduces counterattacks while it lives.</summary>
        public int Shield;
        /// <summary>Rarely set (relics/spells): suit immunity cancelled for this fight.</summary>
        public bool ImmunityNullified;
        public EnemyTier Tier;
        public bool Alive = true;
        /// <summary>How this enemy died (null while alive). Gates banish overkills (§6).</summary>
        public KillKind? KillOutcome;
        /// <summary>♠-firing cards played against this enemy — feeds the Bastion rung (§10).</summary>
        public int SpadeCardsPlayed;

        public CardFace Face => new CardFace(Suit, Rank);

        /// <summary>Suit whose power is blocked when played against this enemy.</summary>
        public Suit? ImmuneSuit => ImmunityNullified ? (Suit?)null : Suit;

        public static EnemyState Royal(Suit suit, Rank rank, EnemyTier tier)
        {
            var (hp, atk) = CardRules.RoyalStats(rank);
            return new EnemyState { Suit = suit, Rank = rank, Hp = hp, MaxHp = hp, Attack = atk, Tier = tier };
        }

        public static EnemyState Number(Suit suit, Rank rank, EnemyTier tier)
        {
            var (hp, atk) = CardRules.NumberEnemyStats(rank);
            return new EnemyState { Suit = suit, Rank = rank, Hp = hp, MaxHp = hp, Attack = atk, Tier = tier };
        }

        public override string ToString() =>
            $"{PhysicalCard.Pretty(Face)} [{Hp}/{MaxHp} hp, atk {Attack}, shield {Shield}]";
    }

    /// <summary>
    /// A live fight. Enemies fight one at a time in order (gate fights are sequential
    /// duels); the fight is won when the last one dies. The persistent DeckState is
    /// used directly during the fight (attrition is canon, §3).
    /// </summary>
    public sealed class EncounterState
    {
        public List<EnemyState> Enemies = new List<EnemyState>();
        public int CurrentIndex;
        /// <summary>Camp bonus: the first attack of this fight deals double (§9). Consumed on first play.</summary>
        public bool FirstAttackDouble;
        /// <summary>Royal gate fight: kills give no mid-fight reward; keeps resolve after (§6).</summary>
        public bool IsGate;
        /// <summary>The gate's royal rank (Jack/Queen/King) when <see cref="IsGate"/>.</summary>
        public Rank GateRank;

        public EnemyState Current =>
            CurrentIndex < Enemies.Count ? Enemies[CurrentIndex] : null;

        public bool AllDead => CurrentIndex >= Enemies.Count;
    }

    public enum PendingChoiceKind
    {
        /// <summary>Player must discard cards totalling ≥ RequiredValue (counterattack).</summary>
        Defend,
        /// <summary>Redundant exact kill: pick one hand card + a graft branch (§6).</summary>
        GraftSelect,
        /// <summary>Hunt landmark: pick a missing recruit to chase (§4, C1 only).</summary>
        HuntSelect,
        /// <summary>Cleared royal gate: resolve the 3/2/1 keep pyramid (§6).</summary>
        RoyalKeep,
    }

    /// <summary>A decision blocking the game until the player answers (§4).</summary>
    public sealed class PendingChoice
    {
        public PendingChoiceKind Kind;
        /// <summary>Defend: total discard value required.</summary>
        public int RequiredValue;
        /// <summary>GraftSelect: the slain enemy's face (rank/suit source of the graft).</summary>
        public CardFace SlainFace;
        /// <summary>HuntSelect: the faces the player may legally chase.</summary>
        public List<CardFace> HuntOptions;
        /// <summary>RoyalKeep: the gate's royal rank.</summary>
        public Rank RoyalRank;
        /// <summary>RoyalKeep: suits still on offer (overkilled royals are banished, never here).</summary>
        public List<Suit> Eligible;
        /// <summary>RoyalKeep: picks left to make.</summary>
        public int PicksRemaining;
        /// <summary>RoyalKeep: true at the Jack Gate — the pick is the royal to LEAVE (§6).</summary>
        public bool PickIsLeave;
    }

    /// <summary>The root state. Core owns it; the UI is a pure view of it (§4).</summary>
    public sealed class CampaignState
    {
        public string Id;
        public string Seed;
        /// <summary>Serialized RNG cursor — kept in sync after every dispatch (§11).</summary>
        public uint RngState;
        public CampaignPhase Phase = CampaignPhase.ClassSelect;

        public int Continent = 1;
        public int Province = 1;
        public int Chapter = 1;

        public Hero Hero = new Hero();
        public RoadMapState Map;
        public EncounterState Encounter;
        /// <summary>Road node the live fight was entered from; null for ad-hoc fights.</summary>
        public int? EncounterNodeId;
        public DeckState Deck = new DeckState();

        /// <summary>Camp bonuses armed for the next fight (§9). Consumed at fight start.</summary>
        public bool NextFightFirstAttackDouble;
        public int NextFightStartShield;

        /// <summary>Every card the player owns (physicalIds). Cards live in Tavern/Discard/Hand.</summary>
        public List<int> OwnedCards = new List<int>();
        public CardRegistry Cards = new CardRegistry();

        /// <summary>Generic (suit-agnostic) spell-economy pools (§7).</summary>
        public int TokenFragments;
        public int TokenHalves;

        /// <summary>
        /// Queue of decisions awaiting input, resolved head-first (a gate keep can
        /// stack behind a graft, etc.). <see cref="PendingChoice"/> reads the head.
        /// </summary>
        public List<PendingChoice> PendingChoices = new List<PendingChoice>();
        public PendingChoice PendingChoice => PendingChoices.Count > 0 ? PendingChoices[0] : null;

        public List<string> Log = new List<string>();

        /// <summary>Current max hand size (base 5; relics/staffs adjust later).</summary>
        public int MaxHandSize = Tuning.BaseMaxHandSize;

        /// <summary>True if any owned card's *effective* face matches — the graft trigger test (§6).</summary>
        public bool OwnsFace(CardFace face)
        {
            foreach (int id in OwnedCards)
            {
                var eff = Cards.Get(id).EffectiveFace();
                if (eff.Suit == face.Suit && eff.Rank == face.Rank) return true;
            }
            return false;
        }

        public int HandTotalValue()
        {
            int total = 0;
            foreach (int id in Deck.Hand) total += Cards.Get(id).EffectiveValue();
            return total;
        }
    }
}
