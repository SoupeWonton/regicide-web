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
        /// <summary>Royal gate fight: the keep pyramid resolves after the gate clears (§6).</summary>
        public bool IsGate;
        /// <summary>The gate's royal rank (Jack/Queen/King) when <see cref="IsGate"/>.</summary>
        public Rank GateRank;

        /// <summary>Once-per-enemy ability ids already used (staffs/amulets §8, §10). Cleared per enemy.</summary>
        public HashSet<string> UsedThisEnemy = new HashSet<string>();
        /// <summary>Once-per-fight ability ids already used.</summary>
        public HashSet<string> UsedThisFight = new HashSet<string>();

        // Armed staff toggles (§10) — consumed by the play they modify.
        /// <summary>Steady Hand: the next play skips the ♣ double.</summary>
        public bool SteadyHandArmed;
        /// <summary>Transfuse (once/enemy): the next ♥ play converts recovery to shield.</summary>
        public bool TransfuseArmed;
        /// <summary>Ace in the Hole: the next Ace pair plays the Ace at the partner's value.</summary>
        public bool AceInHoleArmed;
        /// <summary>Stockpile (once/enemy): hand may exceed the cap by 1 while this enemy lives.</summary>
        public bool StockpileArmed;
        /// <summary>Banked bonus damage for the next play (Bloodletting ⌊v/2⌋ etc.). Consumed on play.</summary>
        public int AttackBank;

        /// <summary>Suits already cast this combat — at most one spell per suit per fight (§7).</summary>
        public HashSet<Suit> CastSuits = new HashSet<Suit>();
        /// <summary>Keen Edge (♣ Fragment): the next attack deals ×2 (§7).</summary>
        public bool KeenEdgeArmed;
        /// <summary>Commit (♣ Half): the next play may include ONE extra card of any rank (§7).</summary>
        public bool CommitArmed;
        /// <summary>Rally (♦ Half): at the next counterattack, draw min(net, 5) before paying (§7).</summary>
        public bool RallyArmed;

        // Relic combat state (§8).
        /// <summary>Vanguard (Cloak): the fight's first counterattack is suppressed.</summary>
        public bool VanguardArmed;
        /// <summary>Second Wind (Amulet, once/fight): the next counterattack is skipped entirely.</summary>
        public bool SecondWindArmed;
        /// <summary>Aegis (Amulet, once/enemy): the next counterattack is reduced by 5.</summary>
        public bool AegisArmed;
        /// <summary>Unbinding (Amulet, once/enemy): the next play ignores the enemy's immunity.</summary>
        public bool UnbindingArmed;
        /// <summary>Debt (Ring): turns still owing a start-of-turn discard.</summary>
        public int DebtTurnsRemaining;
        /// <summary>True once any counterattack was paid with discards this fight (Interest, §8).</summary>
        public bool PaidThisFight;

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
        /// <summary>Triage staff (§10): pick which discards recover instead of random ones.</summary>
        RecoverSelect,
        /// <summary>Last Rites staff (§10): optionally pick one recovered card into hand.</summary>
        RecoverToHand,
        /// <summary>Lair raid won (§8): pick 1 of the offered relics.</summary>
        RelicSelect,
        /// <summary>Debt relic (§8): a start-of-turn discard of exactly one card is owed.</summary>
        DebtDiscard,
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
        /// <summary>RecoverSelect/RecoverToHand: the physicalIds the player may pick from.</summary>
        public List<int> RecoverIds;
        /// <summary>RecoverSelect: max cards the player may pick (the recovered amount).</summary>
        public int RecoverMax;
        /// <summary>RelicSelect: the relic ids on offer (§8 Lair).</summary>
        public List<string> RelicOptions;
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
        /// The gauntlet (§7): one crystal slot per suit, indexed by (int)Suit.
        /// Tier 0 = empty · 1 = Fragment · 2 = Half. (Full is post-alpha — never 3.)
        /// </summary>
        public int[] GauntletTiers = new int[4];

        /// <summary>Unequipped relics collect here (§8). Bag relics are inert.</summary>
        public List<string> RelicBag = new List<string>();
        /// <summary>The four named slots, indexed by (int)RelicSlot. Null = empty.</summary>
        public string[] EquippedRelics = new string[4];
        /// <summary>Caravan offer (§8): the relic buyable while standing there. Null elsewhere.</summary>
        public string CaravanOffer;

        /// <summary>Once-per-province ability ids used (Forced March, Bedroll, Requisition Writ §8).</summary>
        public HashSet<string> UsedThisProvince = new HashSet<string>();
        /// <summary>Interest (§8): true if the previous fight ended without paying any discards.</summary>
        public bool LastFightPaidNothing;
        /// <summary>Vanguard (§8): set once any fight starts on the current road.</summary>
        public bool RoadFirstFightDone;

        /// <summary>Whether a relic is live (equipped in its slot — bag relics do nothing).</summary>
        public bool HasRelic(string id)
        {
            foreach (var r in EquippedRelics)
                if (r == id) return true;
            return false;
        }

        /// <summary>
        /// Queue of decisions awaiting input, resolved head-first (a gate keep can
        /// stack behind a graft, etc.). <see cref="PendingChoice"/> reads the head.
        /// </summary>
        public List<PendingChoice> PendingChoices = new List<PendingChoice>();
        public PendingChoice PendingChoice => PendingChoices.Count > 0 ? PendingChoices[0] : null;

        public List<string> Log = new List<string>();

        /// <summary>
        /// Fallen Heroes offer (§10): one random Staff per class, live while standing
        /// on the Heroes node (swap is free and repeatable there). Null elsewhere.
        /// </summary>
        public List<string> StaffOffer;

        /// <summary>
        /// Current max hand size — derived, never stored (§3 base 5; Depot rung +2;
        /// Stockpile staff +1 while armed; relics add more in step 8).
        /// </summary>
        public int MaxHandSize =>
            Tuning.BaseMaxHandSize
            + (Hero.PathC2 == ClassTables.RungDepot ? Tuning.DepotHandBonus : 0)
            + (HasRelic("hoard") ? Tuning.HoardHandBonus : 0)
            + (Encounter != null && Encounter.StockpileArmed ? 1 : 0);

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
