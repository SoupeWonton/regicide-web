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
        private VisualElement _fxLayer;
        private string _lastScreenKey;
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

        // Card-flight snapshots: taken at dispatch time, flown on the FX layer after.
        private readonly List<(Rect from, CardFace face)> _flights = new List<(Rect, CardFace)>();
        private Rect _flightTarget;
        private bool _flightsDown; // defend pays sink instead of striking

        private void Start()
        {
            _metaPath = System.IO.Path.Combine(Application.persistentDataPath, "lineage.json");
            _meta = MetaState.LoadFrom(_metaPath);
            Sfx.Init(gameObject);

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
            SnapshotFlights(action);
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
            // The FX pass reads element positions — wait one layout tick.
            _root.schedule.Execute(() => PlayFx(r)).ExecuteLater(35);
        }

        /// <summary>
        /// Before the state changes: remember where the spent cards sit on screen
        /// and where they are headed, so their ghosts can fly after the re-render.
        /// </summary>
        private void SnapshotFlights(IAction action)
        {
            _flights.Clear();
            List<int> ids = action switch
            {
                PlayCards p => p.PhysicalIds,
                DefendDiscard dd when S?.PendingChoice?.Kind == PendingChoiceKind.Defend => dd.PhysicalIds,
                _ => null,
            };
            if (ids == null || S == null) return;

            _flightsDown = action is DefendDiscard;
            var target = _root?.Q<VisualElement>("fx-enemy");
            _flightTarget = target != null && target.panel != null ? target.worldBound : default;

            foreach (int id in ids)
            {
                var el = _root?.Q<VisualElement>("card-" + id);
                if (el == null || el.panel == null || !S.Cards.TryGet(id, out var card)) continue;
                _flights.Add((el.worldBound, card.EffectiveFace()));
            }
        }

        /// <summary>Fly the snapshotted card ghosts (hand → enemy, or down into the discard).</summary>
        private void FlyFlights()
        {
            if (_flights.Count == 0 || _fxLayer == null || _fxLayer.panel == null) return;
            Sfx.Play(Sfx.Sound.Whoosh);

            Vector2 to = _flightsDown || _flightTarget == default
                ? new Vector2(_fxLayer.worldBound.xMax - 120, _fxLayer.worldBound.yMax - 60)
                : _flightTarget.center;
            to = _fxLayer.WorldToLocal(to);

            for (int i = 0; i < _flights.Count; i++)
            {
                var (fromWorld, face) = _flights[i];
                var ghost = CardView.Face(face, CardView.Size.Small);
                ghost.pickingMode = PickingMode.Ignore;
                ghost.style.position = Position.Absolute;
                var from = _fxLayer.WorldToLocal(fromWorld.center);
                ghost.style.left = from.x - 36;
                ghost.style.top = from.y - 50;
                _fxLayer.Add(ghost);

                var g = ghost;
                Vector2 delta = to - from;
                _fxLayer.schedule.Execute(() =>
                    g.experimental.animation.Start(0f, 1f, 240, (el, t) =>
                    {
                        float e2 = 1f - (1f - t) * (1f - t);
                        el.style.translate = new Translate(delta.x * e2, delta.y * e2 - 30f * Mathf.Sin(Mathf.PI * e2));
                        el.style.scale = new Scale(Vector3.one * (1f - 0.45f * e2));
                        el.style.opacity = 1f - 0.7f * t * t;
                    })).ExecuteLater(i * 50);
                _fxLayer.schedule.Execute(() => g.RemoveFromHierarchy()).ExecuteLater(300 + i * 50);
            }
            _flights.Clear();
        }

        /// <summary>Trigger feedback (§10): map the dispatch's events onto the FX layer.</summary>
        private void PlayFx(Result r)
        {
            if (_fxLayer == null || _fxLayer.panel == null) return;

            if (!r.Ok)
            {
                _flights.Clear();
                Sfx.Play(Sfx.Sound.Error);
                Fx.Float(_fxLayer, null, "✗ " + r.Error, Theme.RedBright, 16);
                return;
            }

            // Spent cards fly first; the consequences land as the ghosts arrive.
            bool flew = _flights.Count > 0;
            FlyFlights();
            if (flew)
            {
                var captured = r;
                _fxLayer.schedule.Execute(() => PlayEventFx(captured)).ExecuteLater(230);
            }
            else
            {
                PlayEventFx(r);
            }
        }

        private void PlayEventFx(Result r)
        {
            if (_fxLayer == null || _fxLayer.panel == null) return;
            var enemy = _root.Q<VisualElement>("fx-enemy");
            int slot = 0;
            void Toast(string text, Color tint)
            {
                if (slot < 5) Fx.Toast(_fxLayer, text, tint, slot++);
            }

            foreach (var e in r.Events)
            {
                switch (e)
                {
                    case DamageDealt d:
                        Sfx.Play(Sfx.Sound.Impact);
                        Fx.Float(_fxLayer, enemy, "-" + d.Amount,
                            d.Doubled ? Theme.GoldBright : Theme.RedBright, d.Doubled ? 34 : 28);
                        Fx.Shake(enemy);
                        break;
                    case ShieldGained sg:
                        Sfx.Play(Sfx.Sound.Shield, 0.7f);
                        Fx.Float(_fxLayer, enemy, "+" + sg.Amount + " ⛨", Theme.Shield, 20, 52);
                        break;
                    case CardsDrawn cd:
                        Sfx.Play(Sfx.Sound.Draw, 0.7f);
                        for (int i = 0; i < cd.PhysicalIds.Count; i++)
                            Fx.PopIn(_root.Q<VisualElement>("card-" + cd.PhysicalIds[i]), i * 60);
                        break;
                    case EnemyKilled k:
                        Sfx.Play(k.Kind == KillKind.Exact ? Sfx.Sound.Exact : Sfx.Sound.Overkill);
                        Toast(k.Kind == KillKind.Exact
                                ? $"EXACT KILL — {PhysicalCard.Pretty(k.Face)}"
                                : $"{PhysicalCard.Pretty(k.Face)} overkilled — no spoils",
                            k.Kind == KillKind.Exact ? Theme.GoldBright : Theme.Grey);
                        break;
                    case Recruited rec:
                        Toast($"Recruited {PhysicalCard.Pretty(rec.Face)}" + (rec.ToHand ? " → hand" : ""), Theme.Green);
                        break;
                    case GraftApplied g:
                        Toast($"Grafted — now {PhysicalCard.Pretty(g.NewEffective)}", Theme.Gold);
                        break;
                    case RoyalKept rk:
                        Toast($"{PhysicalCard.Pretty(rk.Face)} joins your court", Theme.GoldBright);
                        break;
                    case RoyalLeft rl:
                        Toast($"{PhysicalCard.Pretty(rl.Face)} is left behind", Theme.Grey);
                        break;
                    case FragmentDropped _:
                        Sfx.Play(Sfx.Sound.Coin, 0.8f);
                        Toast("+1 spell fragment", Theme.Gold);
                        break;
                    case HalfForged _:
                        Sfx.Play(Sfx.Sound.Coin);
                        Toast("A Half is forged", Theme.GoldBright);
                        break;
                    case SpellCast sc:
                        Sfx.Play(Sfx.Sound.Spell);
                        Toast($"CAST — {SpellTables.Name(sc.Suit, sc.Tier)}", Theme.Blue);
                        break;
                    case RelicGained rg:
                        Sfx.Play(Sfx.Sound.Coin);
                        Toast($"Relic claimed: {RelicTables.Get(rg.RelicId).Name}", Theme.Gold);
                        break;
                    case StaffTriggered st:
                        Toast($"Staff — {st.Note}", Theme.ParchmentDim);
                        break;
                    case CounterattackIncoming ci:
                        Sfx.Play(Sfx.Sound.Counter);
                        Fx.Float(_fxLayer, null, $"COUNTER {ci.NetAttack}", Theme.RedBright, 30);
                        Fx.Flash(_fxLayer, Theme.RedDeep, 260);
                        break;
                    case CounterattackBlocked _:
                        Sfx.Play(Sfx.Sound.Shield);
                        Fx.Float(_fxLayer, enemy, "BLOCKED", Theme.Shield, 24);
                        break;
                    case PlayerDied _:
                        Sfx.Play(Sfx.Sound.Death);
                        Fx.Flash(_fxLayer, Theme.RedDeep, 1000);
                        break;
                    case CampaignWonEvent _:
                        Sfx.Play(Sfx.Sound.Crown);
                        Fx.Flash(_fxLayer, Theme.Gold, 1000);
                        break;
                    case ChapterCompleted _:
                        Toast("PROVINCE CLEARED", Theme.GoldBright);
                        break;
                }
            }
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

            // Fade whole screens in when the phase (or menu/run state) changes.
            string key = _session == null ? "menu" : S.Phase.ToString();
            if (key != _lastScreenKey) Fx.FadeIn(screen);
            _lastScreenKey = key;

            if (S != null && S.PendingChoice != null) _root.Add(BuildPendingOverlay(S.PendingChoice));
            if (_pickerIds != null) _root.Add(BuildPickerOverlay());

            // The FX layer sits above everything; floats/toasts/flashes land here.
            _fxLayer = new VisualElement();
            _fxLayer.pickingMode = PickingMode.Ignore;
            _fxLayer.style.position = Position.Absolute;
            _fxLayer.style.left = 0; _fxLayer.style.right = 0;
            _fxLayer.style.top = 0; _fxLayer.style.bottom = 0;
            _root.Add(_fxLayer);
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
                        Sfx.Play(Sfx.Sound.Tick, 0.8f);
                        Render();
                    },
                    selected: _sel.Contains(captured));
                card.name = "card-" + captured; // FX hook: drawn cards pop in by name
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
            // Ids render as actual cards ONLY when the label really is CardLabel —
            // pickers over non-card ids (e.g. the Sanctum's graft seqs) could
            // otherwise collide with physicalIds and paint the wrong card.
            bool cardPicker = _pickerLabel != null && _pickerLabel.Method.Name == nameof(CardLabel);
            foreach (int id in _pickerIds)
            {
                int captured = id;
                if (cardPicker && S != null && S.Cards.TryGet(captured, out var card))
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
