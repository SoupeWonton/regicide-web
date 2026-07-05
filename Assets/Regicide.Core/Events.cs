using System.Collections.Generic;

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
        public override string ToString() => $"Recruited {PhysicalCard.Pretty(Face)} (#{PhysicalId}) into the Tavern";
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
}
