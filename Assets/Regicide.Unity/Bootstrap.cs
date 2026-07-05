using UnityEngine;
using Regicide.Core;

namespace Regicide.Unity
{
    /// <summary>
    /// Temporary entry point that proves the Core ↔ Unity wiring compiles and runs.
    /// Replace with the real run state machine driven by CampaignPhase (BUILD-SPEC.md
    /// §2, §4, §16). Golden rule: Regicide.Core is authoritative; this layer is a pure
    /// view over it — after each Dispatch, re-render from state and play back events.
    /// </summary>
    public class Bootstrap : MonoBehaviour
    {
        private void Start()
        {
            var rng = new Rng("kingfall");
            Debug.Log($"[Regicide] Core reachable. Rng(\"kingfall\") → {rng.Int(1000)}, {rng.Int(1000)}, {rng.Int(1000)}");
            Debug.Log($"[Regicide] King attack value = {CardRules.AttackValue(Rank.King)} (expect 20).");
        }
    }
}
