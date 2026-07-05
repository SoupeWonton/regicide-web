using UnityEngine;
using Regicide.Core;

namespace Regicide.Unity
{
    // ScriptableObject shells (spec §12) for designer-authored content, keyed by the
    // same string ids Core speaks. The alpha UI reads ContentText; these exist so
    // assets can be authored in the editor later without touching code.

    [CreateAssetMenu(menuName = "Kingfall/Class Def", fileName = "ClassDef")]
    public class ClassDef : ScriptableObject
    {
        public string id;
        public string displayName;
        public string role;
        public Suit homeSuit;
        [TextArea] public string homeRungText;
        public string[] staffIds;
        [Tooltip("Locked ladder rung names, greyed-out teasers (§10)")]
        public string[] lockedLadderNames;
    }

    [CreateAssetMenu(menuName = "Kingfall/Staff Def", fileName = "StaffDef")]
    public class StaffDef : ScriptableObject
    {
        public string id;
        public string classId;
        public string displayName;
        [Tooltip("passive / activated / toggle")]
        public string kind;
        [TextArea] public string rulesText;
    }

    [CreateAssetMenu(menuName = "Kingfall/Relic Def", fileName = "RelicDef")]
    public class RelicDef : ScriptableObject
    {
        public string id;
        public RelicSlot slot;
        public string displayName;
        [TextArea] public string rulesText;
    }

    [CreateAssetMenu(menuName = "Kingfall/Spell Def", fileName = "SpellDef")]
    public class SpellDef : ScriptableObject
    {
        public Suit suit;
        [Tooltip("1 = Fragment, 2 = Half")]
        public int tier;
        public string displayName;
        [TextArea] public string effectText;
    }
}
