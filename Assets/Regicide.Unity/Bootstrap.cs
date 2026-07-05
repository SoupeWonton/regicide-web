using UnityEngine;
using Regicide.Core;

namespace Regicide.Unity
{
    /// <summary>
    /// Temporary entry point proving the Core ↔ Unity wiring: drives a real
    /// GameSession through class select and one fight turn via Dispatch. Will grow
    /// into the run state machine keyed on CampaignPhase (BUILD-SPEC.md §2, §4, §16)
    /// once the play surface lands (§15 step 11). Core stays authoritative; this
    /// layer re-renders from State and plays back events.
    /// </summary>
    public class Bootstrap : MonoBehaviour
    {
        private void Start()
        {
            var session = new GameSession("kingfall");

            var r = session.Dispatch(new SelectClass("sentinel", "hold_the_line"));
            Debug.Log($"[Regicide] SelectClass ok={r.Ok}; owned {session.State.OwnedCards.Count}, " +
                      $"hand {session.State.Deck.Hand.Count}, tavern {session.State.Deck.Tavern.Count}");

            r = session.Dispatch(new StartEncounter(EnemyState.Number(Suit.Hearts, Rank.Six, EnemyTier.Skirmish)));
            foreach (var e in r.Events) Debug.Log($"[Regicide] {e}");

            r = session.Dispatch(new PlayCards(session.State.Deck.Hand[0]));
            foreach (var e in r.Events) Debug.Log($"[Regicide] {e}");

            Debug.Log($"[Regicide] Phase={session.State.Phase}, pending={session.State.PendingChoice?.Kind.ToString() ?? "none"}, " +
                      $"rng cursor {session.State.RngState}");
        }
    }
}
