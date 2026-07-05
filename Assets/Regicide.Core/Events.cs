using System.Collections.Generic;
using System.Linq;

namespace Regicide.Core
{
    /// <summary>
    /// Something that happened during a dispatch, for the UI to play back as
    /// animations/popups (§2, §10). Events describe — they never carry rules.
    /// </summary>
    public abstract class GameEvent
    {
        public abstract override string ToString();
    }

    public sealed class RunStarted : GameEvent
    {
        public string ClassId; public string StaffId;
        public override string ToString() => $"Run started: {ClassId} / {StaffId}";
    }

    public sealed class HandDealt : GameEvent
    {
        public List<int> PhysicalIds = new List<int>();
        public override string ToString() => $"Dealt {PhysicalIds.Count} cards";
    }

    public sealed class EncounterStarted : GameEvent
    {
        public int EnemyCount;
        public override string ToString() => $"Encounter started ({EnemyCount} enemies)";
    }

    public sealed class CardsPlayed : GameEvent
    {
        public List<int> PhysicalIds = new List<int>();
        public int BaseAttack;
        public List<Suit> ActiveSuits = new List<Suit>();
        public Suit? BlockedSuit;
        public override string ToString() =>
            $"Played {PhysicalIds.Count} card(s) for base {BaseAttack}" +
            (BlockedSuit != null ? $" ({PhysicalCard.SuitGlyph(BlockedSuit.Value)} blocked by immunity)" : "");
    }

    public sealed class DamageDealt : GameEvent
    {
        public int Amount; public bool Doubled;
        public override string ToString() => $"Dealt {Amount} damage" + (Doubled ? " (♣ doubled)" : "");
    }

    public sealed class ShieldGained : GameEvent
    {
        public int Amount; public int Total;
        public override string ToString() => $"♠ shield +{Amount} (total {Total})";
    }

    public sealed class CardsRecovered : GameEvent
    {
        public int Count;
        public override string ToString() => $"♥ recovered {Count} card(s) to Tavern bottom";
    }

    public sealed class CardsDrawn : GameEvent
    {
        public List<int> PhysicalIds = new List<int>();
        public override string ToString() => $"♦ drew {PhysicalIds.Count} card(s)";
    }

    public enum KillKind { Exact, Overkill }

    public sealed class EnemyKilled : GameEvent
    {
        public CardFace Face; public KillKind Kind;
        public override string ToString() =>
            $"{PhysicalCard.Pretty(Face)} defeated ({(Kind == KillKind.Exact ? "EXACT KILL" : "overkill")})";
    }

    public sealed class Recruited : GameEvent
    {
        public int PhysicalId; public CardFace Face;
        /// <summary>Conscript rung (§10): the recruit entered the hand instead of the Tavern.</summary>
        public bool ToHand;
        public override string ToString() =>
            $"Recruited {PhysicalCard.Pretty(Face)} (#{PhysicalId}) into the {(ToHand ? "hand" : "Tavern")}";
    }

    public sealed class GraftOffered : GameEvent
    {
        public CardFace SlainFace;
        public override string ToString() => $"Redundant kill of {PhysicalCard.Pretty(SlainFace)} — choose a graft";
    }

    public sealed class GraftApplied : GameEvent
    {
        public int PhysicalId; public GraftBranch Branch; public CardFace SlainFace; public CardFace NewEffective;
        public override string ToString() =>
            $"Grafted #{PhysicalId} ({Branch}) from {PhysicalCard.Pretty(SlainFace)} → now {PhysicalCard.Pretty(NewEffective)}";
    }

    public sealed class CounterattackIncoming : GameEvent
    {
        public int NetAttack;
        public override string ToString() => $"Counterattack: must cover {NetAttack}";
    }

    public sealed class CounterattackBlocked : GameEvent
    {
        public override string ToString() => "Counterattack fully shielded";
    }

    public sealed class Defended : GameEvent
    {
        public int Paid; public int Required;
        public override string ToString() => $"Defended: paid {Paid} (needed {Required})";
    }

    public sealed class PlayerDied : GameEvent
    {
        public int Unpayable;
        public override string ToString() => $"DIED — could not cover {Unpayable}";
    }

    public sealed class NextEnemy : GameEvent
    {
        public CardFace Face;
        public override string ToString() => $"Next enemy: {PhysicalCard.Pretty(Face)}";
    }

    public sealed class EncounterWon : GameEvent
    {
        public override string ToString() => "Encounter won";
    }

    public sealed class FragmentDropped : GameEvent
    {
        public int Total;
        public override string ToString() => $"Spell fragment dropped (pool: {Total})";
    }

    public sealed class MapGenerated : GameEvent
    {
        public int Chapter; public int NodeCount;
        public override string ToString() => $"Chapter {Chapter} road revealed ({NodeCount} nodes)";
    }

    public sealed class MovedToNode : GameEvent
    {
        public int NodeId; public RoadNodeKind Kind;
        public override string ToString() => $"Travelled to {Kind} (node {NodeId})";
    }

    public sealed class LandmarkVisited : GameEvent
    {
        public RoadNodeKind Kind; public string Note;
        public override string ToString() => $"{Kind}: {Note}";
    }

    public sealed class CampRested : GameEvent
    {
        public override string ToString() =>
            "Camped: deck reshuffled, hand refilled; next fight opens doubled with 10 shield";
    }

    public sealed class HuntOffered : GameEvent
    {
        public List<CardFace> Options = new List<CardFace>();
        public override string ToString() =>
            $"Hunt: choose quarry ({string.Join(" ", Options.Select(PhysicalCard.Pretty))})";
    }

    public sealed class SeamRestApplied : GameEvent
    {
        public override string ToString() => "Seam rest: discard reshuffled into the Tavern, hand drawn to full";
    }

    public sealed class ChapterCompleted : GameEvent
    {
        public int Chapter;
        public override string ToString() => $"Chapter {Chapter} complete";
    }

    public sealed class RunAdvanced : GameEvent
    {
        public int Chapter; public int Continent; public int Province;
        public override string ToString() => $"Onward: chapter {Chapter} (continent {Continent}, province {Province})";
    }

    public sealed class ContinentEntered : GameEvent
    {
        public int Continent; public string LitRungId;
        public override string ToString() => $"Continent {Continent} — path rung '{LitRungId}' lights up";
    }

    public sealed class RoyalKeepOffered : GameEvent
    {
        public Rank Rank; public List<Suit> Eligible = new List<Suit>(); public int KeepCount; public bool PickIsLeave;
        public override string ToString() =>
            $"{PhysicalCard.RankGlyph(Rank)} Gate cleared — keep {KeepCount} of " +
            $"[{string.Join(" ", Eligible.Select(s => PhysicalCard.SuitGlyph(s)))}]" +
            (PickIsLeave ? " (choose the one to leave)" : "");
    }

    public sealed class RoyalKept : GameEvent
    {
        public int PhysicalId; public CardFace Face;
        public override string ToString() => $"{PhysicalCard.Pretty(Face)} joins your deck (#{PhysicalId})";
    }

    public sealed class RoyalLeft : GameEvent
    {
        public CardFace Face;
        public override string ToString() => $"{PhysicalCard.Pretty(Face)} is left behind";
    }

    public sealed class StaffTriggered : GameEvent
    {
        public string StaffId; public string Note;
        public override string ToString() => $"Staff [{StaffId}]: {Note}";
    }

    public sealed class StaffSwapOffered : GameEvent
    {
        public List<string> Offer = new List<string>();
        public override string ToString() => $"Fallen Heroes: swap your Staff — {string.Join(" / ", Offer)}";
    }

    public sealed class StaffSwapped : GameEvent
    {
        public string From; public string To;
        public override string ToString() => $"Staff swapped: {From} → {To}";
    }

    public sealed class RecoverChoiceOffered : GameEvent
    {
        public PendingChoiceKind Kind; public List<int> Options = new List<int>(); public int Max;
        public override string ToString() =>
            Kind == PendingChoiceKind.RecoverSelect
                ? $"Triage: pick up to {Max} discard(s) to recover"
                : "Last Rites: pick one recovered card into hand (or none)";
    }

    public sealed class RecoveredToHand : GameEvent
    {
        public int PhysicalId;
        public override string ToString() => $"Recovered card #{PhysicalId} taken into hand";
    }

    public sealed class CampaignWonEvent : GameEvent
    {
        public CardFace? Crown;
        public override string ToString() =>
            Crown != null ? $"CROWNED — {PhysicalCard.Pretty(Crown.Value)} is your crown. Victory!" : "CROWNED — Victory!";
    }
}
