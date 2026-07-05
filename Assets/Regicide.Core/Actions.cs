using System.Collections.Generic;

namespace Regicide.Core
{
    /// <summary>
    /// A player intent submitted to <see cref="GameSession.Dispatch"/>. Core validates,
    /// then mutates, then returns events — an invalid action mutates nothing (§2).
    /// </summary>
    public interface IAction { }

    /// <summary>Class select: pick a class and one of its Staffs, receive the A–5×4 deck (§4).</summary>
    public sealed class SelectClass : IAction
    {
        public string ClassId;
        public string StaffId;
        public SelectClass(string classId, string staffId) { ClassId = classId; StaffId = staffId; }
    }

    /// <summary>
    /// Enter a fight from the road. Until road-map generation lands (§15 step 4) the
    /// caller supplies the lineup; later the road node will do this.
    /// </summary>
    public sealed class StartEncounter : IAction
    {
        public List<EnemyState> Enemies;
        public StartEncounter(List<EnemyState> enemies) { Enemies = enemies; }
        public StartEncounter(params EnemyState[] enemies) { Enemies = new List<EnemyState>(enemies); }
    }

    /// <summary>Play a legal set of cards from hand (§3 combos).</summary>
    public sealed class PlayCards : IAction
    {
        public List<int> PhysicalIds;
        public PlayCards(List<int> physicalIds) { PhysicalIds = physicalIds; }
        public PlayCards(params int[] physicalIds) { PhysicalIds = new List<int>(physicalIds); }
    }

    /// <summary>Play nothing; skip straight to the counterattack (§3).</summary>
    public sealed class Yield : IAction { }

    /// <summary>Answer a Defend pending choice: discard these cards to cover the counterattack.</summary>
    public sealed class DefendDiscard : IAction
    {
        public List<int> PhysicalIds;
        public DefendDiscard(List<int> physicalIds) { PhysicalIds = physicalIds; }
        public DefendDiscard(params int[] physicalIds) { PhysicalIds = new List<int>(physicalIds); }
    }

    /// <summary>Which branch of a graft to apply (§6).</summary>
    public enum GraftBranch { ReplaceRank, AddSuit }

    /// <summary>Answer a GraftSelect pending choice: apply the slain enemy's rank or suit to a hand card.</summary>
    public sealed class ChooseGraft : IAction
    {
        public int TargetPhysicalId;
        public GraftBranch Branch;
        public ChooseGraft(int targetPhysicalId, GraftBranch branch)
        {
            TargetPhysicalId = targetPhysicalId; Branch = branch;
        }
    }

    /// <summary>Travel to an adjacent road node; entering resolves what lives there (§12).</summary>
    public sealed class MoveToNode : IAction
    {
        public int NodeId;
        public MoveToNode(int nodeId) { NodeId = nodeId; }
    }

    /// <summary>Answer a HuntSelect pending choice: chase this missing recruit (§4).</summary>
    public sealed class ChooseHunt : IAction
    {
        public Suit Suit;
        public Rank Rank;
        public ChooseHunt(Suit suit, Rank rank) { Suit = suit; Rank = rank; }
    }

    /// <summary>Leave the chapter-complete recap and start the next chapter's road (§4).</summary>
    public sealed class ContinueRun : IAction { }

    /// <summary>
    /// Answer a RoyalKeep pending choice (§6). At the Jack Gate the pick is the royal
    /// to LEAVE; at the Queen/King Gates each pick is a royal that follows you.
    /// </summary>
    public sealed class ChooseRoyal : IAction
    {
        public Suit Suit;
        public ChooseRoyal(Suit suit) { Suit = suit; }
    }

    /// <summary>
    /// Use the hero's Staff (§10) in combat. Toggles arm/disarm themselves; targeted
    /// staffs (Footwork, Parry, Bloodletting, Provisioner) name a hand card. Parry is
    /// the only staff usable while a Defend is pending — that's its whole point.
    /// </summary>
    public sealed class ActivateStaff : IAction
    {
        /// <summary>Hand card the staff acts on; 0 for untargeted staffs.</summary>
        public int TargetPhysicalId;
        public ActivateStaff(int targetPhysicalId = 0) { TargetPhysicalId = targetPhysicalId; }
    }

    /// <summary>Fallen Heroes (§10): swap to one of the four offered Staffs (free, repeatable there).</summary>
    public sealed class SwapStaff : IAction
    {
        public string StaffId;
        public SwapStaff(string staffId) { StaffId = staffId; }
    }

    /// <summary>
    /// Bracelet (§7): arm a pool token into an EMPTY gauntlet slot between encounters.
    /// Tier 1 spends a fragment, tier 2 a Half. Occupied slots are refused.
    /// </summary>
    public sealed class ArmCrystal : IAction
    {
        public Suit Suit;
        public int Tier;
        public ArmCrystal(Suit suit, int tier) { Suit = suit; Tier = tier; }
    }

    /// <summary>Forge (§7): convert 2 fragments → 1 Half. Repeatable while standing at a Forge.</summary>
    public sealed class ForgeConvert : IAction { }

    /// <summary>
    /// Cast the crystal armed in a suit's slot (§7). One cast per suit per combat;
    /// the slot empties to tier 0. Brace (♠ Half) is castable during the pay step.
    /// </summary>
    public sealed class CastSpell : IAction
    {
        public Suit Suit;
        public CastSpell(Suit suit) { Suit = suit; }
    }

    /// <summary>
    /// Sanctum (§9, §12): move one graft from one owned card to another — the
    /// graft-rearrange verb. Once per visit, while standing at the Sanctum.
    /// </summary>
    public sealed class RearrangeGraft : IAction
    {
        public int FromPhysicalId;
        public int GraftSeq;
        public int ToPhysicalId;
        public RearrangeGraft(int fromPhysicalId, int graftSeq, int toPhysicalId)
        {
            FromPhysicalId = fromPhysicalId; GraftSeq = graftSeq; ToPhysicalId = toPhysicalId;
        }
    }

    /// <summary>Answer a RelicSelect pending choice (§8 Lair): claim one offered relic into the bag.</summary>
    public sealed class ChooseRelic : IAction
    {
        public string RelicId;
        public ChooseRelic(string relicId) { RelicId = relicId; }
    }

    /// <summary>
    /// Equip a bag relic into its slot (§8). Free at any between-encounter screen,
    /// locked during combat; equipping over an occupied slot swaps the old one to the bag.
    /// </summary>
    public sealed class EquipRelic : IAction
    {
        public string RelicId;
        public EquipRelic(string relicId) { RelicId = relicId; }
    }

    /// <summary>Caravan (§8): buy the offered relic by discarding hand cards totalling ≥ the cost.</summary>
    public sealed class BuyRelic : IAction
    {
        public List<int> PayPhysicalIds;
        public BuyRelic(List<int> payPhysicalIds) { PayPhysicalIds = payPhysicalIds; }
        public BuyRelic(params int[] payPhysicalIds) { PayPhysicalIds = new List<int>(payPhysicalIds); }
    }

    /// <summary>
    /// Use an equipped activated relic (§8): the Amulet buttons plus the activated
    /// Cloak/Ring verbs. Targets name hand cards (Liquidate, Slip Away pay), a
    /// discard card (Echo) or a Tavern card (Lodestone); empty for untargeted uses.
    /// </summary>
    public sealed class UseRelic : IAction
    {
        public string RelicId;
        public List<int> PhysicalIds;
        public UseRelic(string relicId, params int[] physicalIds)
        {
            RelicId = relicId;
            PhysicalIds = new List<int>(physicalIds);
        }
    }

    /// <summary>
    /// Answer a RecoverSelect (Triage: pick up to Max discards to recover) or
    /// RecoverToHand (Last Rites: pick ≤1 recovered card into hand) pending choice.
    /// An empty list is a legal "none" answer for both (§10).
    /// </summary>
    public sealed class ChooseRecover : IAction
    {
        public List<int> PhysicalIds;
        public ChooseRecover(List<int> physicalIds) { PhysicalIds = physicalIds; }
        public ChooseRecover(params int[] physicalIds) { PhysicalIds = new List<int>(physicalIds); }
    }
}
