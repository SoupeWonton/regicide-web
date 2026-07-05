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
}
