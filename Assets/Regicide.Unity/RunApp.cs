using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;
using Regicide.Core;

namespace Regicide.Unity
{
    /// <summary>
    /// The single presentation entry point (spec §2, §15 step 11, §16): one
    /// MonoBehaviour driving the whole run as a state machine keyed on
    /// CampaignPhase, with every screen built from code via UI Toolkit.
    ///
    /// Presentation is a PURE VIEW of Core state: every interaction submits an
    /// IAction through <see cref="Dispatch"/>; after each dispatch the whole UI
    /// re-renders from <c>_session.State</c> and the returned events append to a
    /// scrolling log (alpha playback — §10 popups can layer on later). No rules
    /// live on this side.
    /// </summary>
    public partial class RunApp : MonoBehaviour
    {
        [Tooltip("Optional PanelSettings asset (assign one with a theme for proper fonts). " +
                 "If left null, a bare one is created at runtime.")]
        public PanelSettings panelSettings;

        private GameSession _session;
        private MetaState _meta;
        private string _metaPath;
        private bool _outcomeRecorded;

        private VisualElement _root;
        private readonly List<string> _log = new List<string>();

        // Transient view-side selection state (never rules — just what's highlighted).
        private readonly HashSet<int> _sel = new HashSet<int>(); // selected hand cards
        private string _menuSeed = "";
        private string _classPick;

        // Generic picker overlay: title + (id, label) options + a callback.
        private string _pickerTitle;
        private List<int> _pickerIds;
        private Func<int, string> _pickerLabel;
        private Action<int> _pickerDone;
        private bool _pickerViewOnly;

        private CampaignState S => _session != null ? _session.State : null;

        private void Start()
        {
            _metaPath = System.IO.Path.Combine(Application.persistentDataPath, "lineage.json");
            _meta = MetaState.LoadFrom(_metaPath);

            var doc = GetComponent<UIDocument>();
            if (doc == null) doc = gameObject.AddComponent<UIDocument>();
            if (doc.panelSettings == null)
            {
                if (panelSettings != null) doc.panelSettings = panelSettings;
                else doc.panelSettings = ScriptableObject.CreateInstance<PanelSettings>();
            }
            _root = doc.rootVisualElement;
            Render();
        }

        // ── the one door into Core ──────────────────────────────────────────────

        private void Dispatch(IAction action)
        {
            var r = _session.Dispatch(action);
            if (!r.Ok)
            {
                _log.Add("✗ " + r.Error);
            }
            else
            {
                foreach (var e in r.Events) _log.Add(e.ToString());
                _sel.Clear();
            }

            if (!_outcomeRecorded &&
                (S.Phase == CampaignPhase.CampaignWon || S.Phase == CampaignPhase.CampaignLost))
            {
                _outcomeRecorded = true;
                _meta.RecordOutcome(S);
                _meta.SaveTo(_metaPath);
            }
            Render();
        }

        private void NewRun(string seed)
        {
            _session = new GameSession(string.IsNullOrWhiteSpace(seed)
                ? DateTime.Now.Ticks.ToString() : seed.Trim());
            _outcomeRecorded = false;
            _log.Clear();
            _sel.Clear();
            _classPick = null;
            _meta.RecordRunStart();
            _meta.SaveTo(_metaPath);
            Render();
        }

        private void BackToMenu()
        {
            _session = null;
            _log.Clear();
            _sel.Clear();
            ClosePicker();
            Render();
        }

        // ── render router ───────────────────────────────────────────────────────

        private void Render()
        {
            if (_root == null) return;
            _root.Clear();
            _root.style.flexGrow = 1;
            Theme.Background(_root);

            VisualElement screen;
            if (_session == null) screen = BuildMainMenu();
            else switch (S.Phase)
            {
                case CampaignPhase.ClassSelect: screen = BuildClassSelect(); break;
                case CampaignPhase.Road: screen = BuildRoad(); break;
                case CampaignPhase.Encounter: screen = BuildEncounter(); break;
                case CampaignPhase.ChapterComplete: screen = BuildRecap(); break;
                case CampaignPhase.CampaignWon: screen = BuildEnd(true); break;
                case CampaignPhase.CampaignLost: screen = BuildEnd(false); break;
                default: screen = BuildRoad(); break;
            }
            screen.style.flexGrow = 1;
            _root.Add(screen);

            if (S != null && S.PendingChoice != null) _root.Add(BuildPendingOverlay(S.PendingChoice));
            if (_pickerIds != null) _root.Add(BuildPickerOverlay());
        }

        // ── small UI kit (Theme-backed; signatures stable across the partials) ──

        private static Button Btn(string text, Action onClick, bool enabled = true) =>
            Theme.Button(text, onClick, Theme.ButtonKind.Normal, enabled);

        private static Button BtnPrimary(string text, Action onClick, bool enabled = true) =>
            Theme.Button(text, onClick, Theme.ButtonKind.Primary, enabled);

        private static Label Head(string text)
        {
            var l = new Label(text);
            l.style.fontSize = 20;
            l.style.color = Theme.GoldBright;
            l.style.unityFontStyleAndWeight = FontStyle.Bold;
            l.style.marginBottom = 8;
            return l;
        }

        private static Label Text(string text)
        {
            var l = new Label(text);
            l.style.whiteSpace = WhiteSpace.Normal;
            l.style.marginBottom = 2;
            return l;
        }

        private static VisualElement Row()
        {
            var v = new VisualElement();
            v.style.flexDirection = FlexDirection.Row;
            v.style.flexWrap = Wrap.Wrap;
            v.style.alignItems = Align.Center;
            return v;
        }

        private static VisualElement Panel(string title = null) => Theme.Frame(title);

        private static VisualElement Overlay()
        {
            var v = new VisualElement();
            v.style.position = Position.Absolute;
            v.style.left = 0; v.style.right = 0; v.style.top = 0; v.style.bottom = 0;
            v.style.backgroundColor = new StyleColor(new Color(0.02f, 0.01f, 0.05f, 0.82f));
            v.style.alignItems = Align.Center;
            v.style.justifyContent = Justify.Center;
            return v;
        }

        private static VisualElement Dialog(string title)
        {
            var d = Theme.Frame();
            Theme.SetBorder(d, Theme.Gold, 2);
            Theme.SetPadding(d, 14, 18);
            d.style.maxWidth = 760;
            d.Add(Head(title));
            return d;
        }

        private string CardLabel(int physicalId) => S.Cards.Get(physicalId).ToString();

        /// <summary>The hand as a Slay-the-Spire card fan feeding the shared selection set.</summary>
        private VisualElement HandStrip(bool selectable)
        {
            var row = new VisualElement();
            row.style.flexDirection = FlexDirection.Row;
            row.style.alignItems = Align.FlexEnd;
            row.style.justifyContent = Justify.Center;
            row.style.paddingTop = 22; // headroom for the selected-card lift

            var hand = S.Deck.Hand.ToList();
            for (int i = 0; i < hand.Count; i++)
            {
                int captured = hand[i];
                var card = CardView.Card(S.Cards.Get(captured), CardView.Size.Hand,
                    onClick: !selectable ? (Action)null : () =>
                    {
                        if (!_sel.Remove(captured)) _sel.Add(captured);
                        Render();
                    },
                    selected: _sel.Contains(captured));
                CardView.Fan(card, i, hand.Count);
                row.Add(card);
            }
            if (hand.Count == 0)
            {
                var empty = Text("(empty hand)");
                empty.style.color = Theme.Grey;
                row.Add(empty);
            }
            return row;
        }

        private VisualElement DeckCounts()
        {
            var row = Row();
            row.Add(Theme.Chip($"Tavern {S.Deck.Tavern.Count}", Theme.Blue));
            row.Add(Theme.Chip($"Discard {S.Deck.Discard.Count}", Theme.RedDeep));
            row.Add(Theme.Chip($"Hand {S.Deck.Hand.Count}/{S.MaxHandSize}"));
            row.Add(Theme.Chip($"Deck {S.OwnedCards.Count}", Theme.Green));
            row.Add(Theme.Chip($"Fragments {S.TokenFragments}", Theme.Gold));
            if (S.TokenHalves > 0) row.Add(Theme.Chip($"Halves {S.TokenHalves}", Theme.GoldBright));
            row.Add(Btn("Deck", () => OpenViewer("Owned cards (sorted by suit — draw order hidden)",
                S.OwnedCards.OrderBy(id => S.Cards.Get(id).EffectiveFace().Suit)
                            .ThenBy(id => S.Cards.Get(id).EffectiveFace().Rank).ToList())));
            row.Add(Btn("Discard", () => OpenViewer("Discard pile",
                S.Deck.Discard.OrderBy(id => S.Cards.Get(id).EffectiveFace().Suit)
                              .ThenBy(id => S.Cards.Get(id).EffectiveFace().Rank).ToList())));
            return row;
        }

        private VisualElement EventLog()
        {
            var panel = Panel("Chronicle");
            var scroll = new ScrollView();
            scroll.style.maxHeight = 150;
            var lines = _log.Skip(Math.Max(0, _log.Count - 60)).ToList();
            for (int i = 0; i < lines.Count; i++)
            {
                var t = Text(lines[i]);
                t.style.fontSize = 11;
                bool latest = i >= lines.Count - 3;
                t.style.color = lines[i].StartsWith("✗") ? Theme.RedBright
                    : latest ? Theme.Parchment : Theme.Grey;
                scroll.Add(t);
            }
            panel.Add(scroll);
            scroll.schedule.Execute(() => scroll.scrollOffset = new Vector2(0, float.MaxValue));
            return panel;
        }

        // ── generic picker overlay (viewer / target chooser) ────────────────────

        private void OpenPicker(string title, List<int> ids, Func<int, string> label, Action<int> done)
        {
            _pickerTitle = title;
            _pickerIds = ids;
            _pickerLabel = label;
            _pickerDone = done;
            _pickerViewOnly = false;
            Render();
        }

        private void OpenViewer(string title, List<int> cardIds)
        {
            _pickerTitle = title;
            _pickerIds = cardIds;
            _pickerLabel = CardLabel;
            _pickerDone = null;
            _pickerViewOnly = true;
            Render();
        }

        private void ClosePicker()
        {
            _pickerTitle = null;
            _pickerIds = null;
            _pickerLabel = null;
            _pickerDone = null;
            _pickerViewOnly = false;
        }

        private VisualElement BuildPickerOverlay()
        {
            var o = Overlay();
            var d = Dialog(_pickerTitle);
            var scroll = new ScrollView();
            scroll.style.maxHeight = 420;
            var row = Row();
            foreach (int id in _pickerIds)
            {
                int captured = id;
                // Card ids render as actual cards; anything else falls back to a button.
                if (S != null && S.Cards.TryGet(captured, out var card))
                {
                    row.Add(CardView.Card(card, CardView.Size.Small,
                        onClick: _pickerViewOnly ? (Action)null : () =>
                        {
                            var done = _pickerDone;
                            ClosePicker();
                            done(captured);
                        }));
                }
                else if (_pickerViewOnly)
                {
                    row.Add(Text(_pickerLabel(id)));
                }
                else
                {
                    row.Add(Btn(_pickerLabel(id), () =>
                    {
                        var done = _pickerDone;
                        ClosePicker();
                        done(captured);
                    }));
                }
            }
            scroll.Add(row);
            d.Add(scroll);
            d.Add(Btn(_pickerViewOnly ? "Close" : "Cancel", () => { ClosePicker(); Render(); }));
            o.Add(d);
            return o;
        }
    }
}
