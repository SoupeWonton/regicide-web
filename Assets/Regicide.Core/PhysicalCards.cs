using System.Collections.Generic;

namespace Regicide.Core
{
    /// <summary>Kinds of graft (BUILD-SPEC.md §5).</summary>
    public enum GraftKind
    {
        /// <summary>Replace the effective rank (A–10 only; royal cap: never above 10).</summary>
        Rank,
        /// <summary>Replace the primary suit (transmute; Consecrate / Press-gang).</summary>
        Suit,
        /// <summary>Add a second active suit (the exact-kill graft). Keeps the primary suit.</summary>
        SuitAdd,
    }

    /// <summary>
    /// One permanent rewrite applied to a PhysicalCard. Grafts are applied in
    /// <see cref="Seq"/> order to derive the effective face — never stored as a face.
    /// </summary>
    public sealed class GraftRecord
    {
        public int Seq;
        public GraftKind Kind;
        /// <summary>For Rank grafts: the new rank. Ignored otherwise.</summary>
        public Rank ToRank;
        /// <summary>For Suit / SuitAdd grafts: the new/added suit. Ignored otherwise.</summary>
        public Suit ToSuit;
        /// <summary>Provenance, e.g. "exact-kill 7♠ (ch2)".</summary>
        public string Source;

        public GraftRecord(int seq, GraftKind kind, Rank toRank, Suit toSuit, string source)
        {
            Seq = seq; Kind = kind; ToRank = toRank; ToSuit = toSuit; Source = source;
        }
    }

    /// <summary>
    /// A card the player owns. Stable <see cref="PhysicalId"/> survives reshuffles and
    /// grafts; the printed face never changes; the effective face is always derived
    /// (BUILD-SPEC.md §5).
    /// </summary>
    public sealed class PhysicalCard
    {
        public int PhysicalId;
        public CardFace Printed;
        public List<GraftRecord> Grafts = new List<GraftRecord>();
        /// <summary>
        /// Small per-card attack-value adjustment (e.g. Conscription's −1 token, §8).
        /// Unrelated to spell fragments. 0 for almost every card.
        /// </summary>
        public int ValueModifier;

        public PhysicalCard(int physicalId, CardFace printed)
        {
            PhysicalId = physicalId;
            Printed = printed;
        }

        /// <summary>Effective primary face after applying grafts in order.</summary>
        public CardFace EffectiveFace()
        {
            Suit suit = Printed.Suit;
            Rank rank = Printed.Rank;
            foreach (var g in Grafts)
            {
                if (g.Kind == GraftKind.Rank) rank = g.ToRank;
                else if (g.Kind == GraftKind.Suit) suit = g.ToSuit;
            }
            return new CardFace(suit, rank);
        }

        /// <summary>
        /// All suits this card fires: primary effective suit ∪ every suit-add graft.
        /// </summary>
        public List<Suit> EffectiveSuits()
        {
            var suits = new List<Suit> { EffectiveFace().Suit };
            foreach (var g in Grafts)
                if (g.Kind == GraftKind.SuitAdd && !suits.Contains(g.ToSuit))
                    suits.Add(g.ToSuit);
            return suits;
        }

        /// <summary>Combat attack value of the effective rank, plus any value modifier (min 0).</summary>
        public int EffectiveValue()
        {
            int v = CardRules.AttackValue(EffectiveFace().Rank) + ValueModifier;
            return v < 0 ? 0 : v;
        }

        /// <summary>Whether this card fires the given suit's power when played.</summary>
        public bool FiresSuit(Suit s) => EffectiveSuits().Contains(s);

        public override string ToString()
        {
            var eff = EffectiveFace();
            string s = $"#{PhysicalId} {Pretty(eff)}";
            foreach (var g in Grafts)
                if (g.Kind == GraftKind.SuitAdd) s += $"+{SuitGlyph(g.ToSuit)}";
            if (!eff.Equals(Printed) || Grafts.Count > 0) s += $" (printed {Pretty(Printed)})";
            return s;
        }

        public static string Pretty(CardFace f) => $"{RankGlyph(f.Rank)}{SuitGlyph(f.Suit)}";

        public static string RankGlyph(Rank r) => r switch
        {
            Rank.Ace => "A",
            Rank.Jack => "J",
            Rank.Queen => "Q",
            Rank.King => "K",
            _ => ((int)r).ToString(),
        };

        public static string SuitGlyph(Suit s) => s switch
        {
            Suit.Clubs => "♣",
            Suit.Diamonds => "♦",
            Suit.Hearts => "♥",
            _ => "♠",
        };
    }

    /// <summary>
    /// Registry of every PhysicalCard minted this run, keyed by physicalId. Ids come
    /// from a per-run counter and are never reused (§5).
    /// </summary>
    public sealed class CardRegistry
    {
        private readonly Dictionary<int, PhysicalCard> _cards = new Dictionary<int, PhysicalCard>();
        private int _nextId = 1;
        private int _nextGraftSeq = 1;

        public IReadOnlyDictionary<int, PhysicalCard> All => _cards;

        public PhysicalCard Mint(Suit suit, Rank rank)
        {
            var card = new PhysicalCard(_nextId++, new CardFace(suit, rank));
            _cards[card.PhysicalId] = card;
            return card;
        }

        public PhysicalCard Get(int physicalId) => _cards[physicalId];

        public bool TryGet(int physicalId, out PhysicalCard card) => _cards.TryGetValue(physicalId, out card);

        public int NextGraftSeq() => _nextGraftSeq++;
    }
}
