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
        private bool _showLog;
        private bool _showSettings;
        private bool _confirmForfeit;
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
            Sfx.Muted = PlayerPrefs.GetInt("kingfall-muted", 0) == 1;

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
                _log.Add("! " + r.Error);
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

        /// <summary>The discard riffles back into the deck — piles pulse, cards arc, riffle sound.</summary>
        private void ShuffleFx()
        {
            if (_fxLayer == null || _fxLayer.panel == null) return;
            Sfx.Play(Sfx.Sound.Shuffle);
            Fx.FlyPile(_fxLayer,
                _root.Q<VisualElement>("fx-pile-discard"),
                _root.Q<VisualElement>("fx-pile-deck"), 5);
        }

        /// <summary>Trigger feedback (§10): map the dispatch's events onto the FX layer.</summary>
        private void PlayFx(Result r)
        {
            if (_fxLayer == null || _fxLayer.panel == null) return;

            if (!r.Ok)
            {
                _flights.Clear();
                Sfx.Play(Sfx.Sound.Error);
                Fx.Float(_fxLayer, null, "! " + r.Error, Theme.RedBright, 16);
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

            // A chapter/crown fanfare outranks the per-fight trumpets (web parity).
            bool bigWin = r.Events.Any(e => e is ChapterCompleted || e is CampaignWonEvent);

            foreach (var e in r.Events)
            {
                switch (e)
                {
                    case DamageDealt d:
                        Sfx.Play(d.Doubled ? Sfx.Sound.DamageBig : Sfx.Sound.Impact);
                        Fx.Float(_fxLayer, enemy, "-" + d.Amount,
                            d.Doubled ? Theme.GoldBright : Theme.RedBright, d.Doubled ? 34 : 28);
                        Fx.Shake(enemy);
                        break;
                    case NextEnemy _:
                        Sfx.Play(Sfx.Sound.Reveal, 0.8f);
                        break;
                    case MovedToNode _:
                        Sfx.Play(Sfx.Sound.Footsteps, 0.8f);
                        break;
                    case EncounterWon _:
                        if (!bigWin) Sfx.Play(Sfx.Sound.Victory, 0.9f);
                        break;
                    case ShieldGained sg:
                        Sfx.Play(Sfx.Sound.Shield, 0.7f);
                        Fx.Float(_fxLayer, enemy, "+" + sg.Amount + " shield", Theme.Shield, 18, 56);
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
                    case CounterattackIncoming ci:
                        // The enemy card lunges at you; the hit lands mid-lunge.
                        Sfx.Play(Sfx.Sound.Counter);
                        Fx.Lunge(enemy, 0, 90);
                        _fxLayer.schedule.Execute(() =>
                        {
                            Sfx.Play(Sfx.Sound.Impact, 0.8f);
                            Fx.Flash(_fxLayer, Theme.RedDeep, 260);
                            Fx.Shake(_root.Q<VisualElement>("fx-hand"), 9f);
                            Fx.Float(_fxLayer, null, $"COUNTER {ci.NetAttack}", Theme.RedBright, 30);
                        }).ExecuteLater(140);
                        break;
                    case CounterattackBlocked _:
                        // A half-lunge that glances off the shield.
                        Fx.Lunge(enemy, 0, 45, 300);
                        _fxLayer.schedule.Execute(() =>
                        {
                            Sfx.Play(Sfx.Sound.Shield);
                            Fx.Float(_fxLayer, enemy, "BLOCKED", Theme.Shield, 24);
                        }).ExecuteLater(110);
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
                        Sfx.Play(Sfx.Sound.Triumph);
                        Toast("PROVINCE CLEARED", Theme.GoldBright);
                        break;
                    case SeamRestApplied _:
                        ShuffleFx();
                        break;
                    case CampRested _:
                    {
                        // The campfire explains itself (§9's four parts), no menu:
                        // ember glow, the shuffle, then each effect floats up in turn.
                        Fx.Flash(_fxLayer, Theme.Hex("#e09c3f"), 700);
                        ShuffleFx();
                        string[] warmth = { "deck reshuffled", "hand refilled", "first strike ×2 armed", "+10 shield armed" };
                        for (int i = 0; i < warmth.Length; i++)
                        {
                            string line = warmth[i];
                            _fxLayer.schedule.Execute(() =>
                                Fx.Float(_fxLayer, null, line, Theme.GoldBright, 20)).ExecuteLater(300 + i * 320);
                        }
                        break;
                    }
                    case RelicUsed ru when ru.RelicId == "bedroll" || ru.RelicId == "sainted_scalpel":
                        ShuffleFx();
                        break;
                    case CardsRecovered cr when cr.Count > 2:
                        ShuffleFx(); // Full Recycle / big recoveries visibly re-feed the deck
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

            // Persistent chrome: deck/discard piles bottom-right during a run,
            // the settings gear top-right always.
            if (_session != null && S.Phase != CampaignPhase.ClassSelect &&
                S.Phase != CampaignPhase.CampaignWon && S.Phase != CampaignPhase.CampaignLost)
                _root.Add(PileCorner());
            _root.Add(GearButton());

            // Defend and Debt resolve INLINE on the battle screen — the hand fan is
            // the selector, no popup (the web UX). Everything else overlays.
            var pending = S?.PendingChoice;
            bool inlinePending = pending != null && S.Phase == CampaignPhase.Encounter &&
                (pending.Kind == PendingChoiceKind.Defend || pending.Kind == PendingChoiceKind.DebtDiscard);
            if (pending != null && !inlinePending) _root.Add(BuildPendingOverlay(pending));
            if (_pickerIds != null) _root.Add(BuildPickerOverlay());
            if (_showLog) _root.Add(BuildLogOverlay());
            if (_showSettings) _root.Add(BuildSettingsOverlay());

            // The FX layer sits above everything; floats/toasts/flashes land here.
            _fxLayer = new VisualElement();
            _fxLayer.pickingMode = PickingMode.Ignore;
            _fxLayer.style.position = Position.Absolute;
            _fxLayer.style.left = 0; _fxLayer.style.right = 0;
            _fxLayer.style.top = 0; _fxLayer.style.bottom = 0;
            _root.Add(_fxLayer);

            // Tooltips draw above even the FX; a fresh layer per render kills stale tips.
            var tipLayer = new VisualElement();
            tipLayer.pickingMode = PickingMode.Ignore;
            tipLayer.style.position = Position.Absolute;
            tipLayer.style.left = 0; tipLayer.style.right = 0;
            tipLayer.style.top = 0; tipLayer.style.bottom = 0;
            _root.Add(tipLayer);
            Tips.SetLayer(tipLayer);
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

        /// <summary>
        /// The hand as a Slay-the-Spire card fan feeding the shared selection set.
        /// Sortable (suit / rank links) and drag-to-reorder — hand ORDER is pure
        /// presentation, no rule reads it, so reordering the state list is safe.
        /// </summary>
        private VisualElement HandStrip(bool selectable)
        {
            var wrap = new VisualElement();

            if (selectable && S.Deck.Hand.Count > 2)
            {
                var sortRow = Row();
                sortRow.style.flexWrap = Wrap.NoWrap;
                sortRow.style.justifyContent = Justify.Center;

                void SortLink(string text, Comparison<int> by)
                {
                    var l = Theme.Subtle(text);
                    l.style.marginRight = 10;
                    l.style.color = Theme.GoldDim;
                    l.RegisterCallback<MouseEnterEvent>(_ => l.style.color = Theme.GoldBright);
                    l.RegisterCallback<MouseLeaveEvent>(_ => l.style.color = Theme.GoldDim);
                    l.RegisterCallback<ClickEvent>(_ =>
                    {
                        Sfx.Play(Sfx.Sound.Tick, 0.7f);
                        S.Deck.Hand.Sort(by);
                        Render();
                    });
                    sortRow.Add(l);
                }

                SortLink("sort ♠♥♦♣", (x, y) =>
                {
                    var fx = S.Cards.Get(x).EffectiveFace();
                    var fy = S.Cards.Get(y).EffectiveFace();
                    return fx.Suit != fy.Suit ? fx.Suit.CompareTo(fy.Suit) : fx.Rank.CompareTo(fy.Rank);
                });
                SortLink("sort 1→10", (x, y) =>
                {
                    int vx = S.Cards.Get(x).EffectiveValue(), vy = S.Cards.Get(y).EffectiveValue();
                    return vx != vy ? vx.CompareTo(vy)
                        : S.Cards.Get(x).EffectiveFace().Suit.CompareTo(S.Cards.Get(y).EffectiveFace().Suit);
                });
                wrap.Add(sortRow);
            }

            var row = new VisualElement();
            row.name = "fx-hand"; // FX hook: counterattacks rattle the hand
            row.style.flexDirection = FlexDirection.Row;
            row.style.alignItems = Align.FlexEnd;
            row.style.justifyContent = Justify.Center;
            row.style.paddingTop = 22; // headroom for the selected-card lift

            var hand = S.Deck.Hand.ToList();
            for (int i = 0; i < hand.Count; i++)
            {
                int captured = hand[i];
                bool wasDrag = false;
                var card = CardView.Card(S.Cards.Get(captured), CardView.Size.Hand,
                    onClick: !selectable ? (Action)null : () =>
                    {
                        if (wasDrag) { wasDrag = false; return; } // a drop is not a pick
                        if (!_sel.Remove(captured)) _sel.Add(captured);
                        Sfx.Play(Sfx.Sound.Tick, 0.8f);
                        Render();
                    },
                    selected: _sel.Contains(captured));
                card.name = "card-" + captured; // FX hook: drawn cards pop in by name
                CardView.Fan(card, i, hand.Count);

                if (selectable) EnableHandDrag(card, captured, row, () => wasDrag = true);
                row.Add(card);
            }
            if (hand.Count == 0)
            {
                var empty = Text("(empty hand)");
                empty.style.color = Theme.Grey;
                row.Add(empty);
            }
            wrap.Add(row);
            return wrap;
        }

        /// <summary>Pointer-drag a hand card horizontally to reorder it in the fan.</summary>
        private void EnableHandDrag(VisualElement card, int physicalId, VisualElement fanRow, Action markDragged)
        {
            Vector2 start = default;
            bool held = false, dragging = false;

            card.RegisterCallback<PointerDownEvent>(evt =>
            {
                held = true; dragging = false;
                start = evt.position;
                card.CapturePointer(evt.pointerId);
            });
            card.RegisterCallback<PointerMoveEvent>(evt =>
            {
                if (!held) return;
                Vector2 delta = (Vector2)evt.position - start;
                if (!dragging && Mathf.Abs(delta.x) > 14f)
                {
                    dragging = true;
                    markDragged();
                    card.BringToFront();
                }
                if (dragging)
                    card.style.translate = new Translate(delta.x, -24);
            });
            card.RegisterCallback<PointerUpEvent>(evt =>
            {
                if (card.HasPointerCapture(evt.pointerId)) card.ReleasePointer(evt.pointerId);
                if (!held) return;
                held = false;
                if (!dragging) return;
                dragging = false;

                // New index = how many OTHER cards sit left of the dropped centre.
                float x = card.worldBound.center.x;
                int newIndex = 0;
                foreach (var sibling in fanRow.Children())
                    if (sibling != card && sibling.name != null && sibling.name.StartsWith("card-") &&
                        sibling.worldBound.center.x < x)
                        newIndex++;

                var handList = S.Deck.Hand;
                handList.Remove(physicalId);
                handList.Insert(Mathf.Clamp(newIndex, 0, handList.Count), physicalId);
                Sfx.Play(Sfx.Sound.Whoosh, 0.5f);
                Render();
            });
        }

        /// <summary>One quiet line of counts; the pile names are the viewers.</summary>
        private VisualElement DeckCounts()
        {
            var row = Row();
            row.style.flexWrap = Wrap.NoWrap;
            row.style.marginRight = 34; // clear of the settings gear

            void LinkText(string text, Action onClick)
            {
                var l = Theme.Subtle(text);
                l.style.marginRight = 4;
                if (onClick != null)
                {
                    l.RegisterCallback<ClickEvent>(_ => onClick());
                    l.RegisterCallback<MouseEnterEvent>(_ => l.style.color = Theme.GoldBright);
                    l.RegisterCallback<MouseLeaveEvent>(_ => l.style.color = Theme.ParchmentDim);
                }
                row.Add(l);
            }

            // Deck/discard live in the bottom-right pile icons now — this line
            // carries only the spell pool.
            if (S.TokenFragments > 0 || S.TokenHalves > 0)
                LinkText($"{S.TokenFragments} frags" + (S.TokenHalves > 0 ? $" + {S.TokenHalves} half" : ""), null);
            return row;
        }

        /// <summary>The chronicle, folded to its last line; click "log" for the full story.</summary>
        private VisualElement EventLog()
        {
            var row = Row();
            row.style.flexWrap = Wrap.NoWrap;
            string last = _log.Count > 0 ? _log[_log.Count - 1] : "";
            var line = Theme.Subtle(last.Length > 72 ? last.Substring(0, 72) + "…" : last);
            line.style.color = last.StartsWith("!") ? Theme.RedBright : Theme.Grey;
            line.style.overflow = Overflow.Hidden;
            line.style.flexShrink = 1;
            row.Add(line);

            var open = Theme.Subtle(" log >");
            open.style.color = Theme.GoldDim;
            open.RegisterCallback<ClickEvent>(_ => { _showLog = true; Render(); });
            open.RegisterCallback<MouseEnterEvent>(_ => open.style.color = Theme.GoldBright);
            open.RegisterCallback<MouseLeaveEvent>(_ => open.style.color = Theme.GoldDim);
            row.Add(open);
            return row;
        }

        // ── settings gear (top-right): mute · forfeit · quit ────────────────────

        private VisualElement GearButton()
        {
            var g = new VisualElement();
            g.style.position = Position.Absolute;
            g.style.top = 10; g.style.right = 14;
            g.Add(Widgets.MiniIcon(Widgets.Icon.Gear, Theme.GoldDim, 22));
            Fx.Transition(g, 90);
            g.RegisterCallback<MouseEnterEvent>(_ =>
            {
                g.Clear();
                g.Add(Widgets.MiniIcon(Widgets.Icon.Gear, Theme.GoldBright, 22));
                g.style.rotate = new Rotate(30);
            });
            g.RegisterCallback<MouseLeaveEvent>(_ =>
            {
                g.Clear();
                g.Add(Widgets.MiniIcon(Widgets.Icon.Gear, Theme.GoldDim, 22));
                g.style.rotate = new Rotate(0);
            });
            g.RegisterCallback<ClickEvent>(_ =>
            {
                Sfx.Play(Sfx.Sound.Click, 0.7f);
                _showSettings = true;
                _confirmForfeit = false;
                Render();
            });
            return g;
        }

        private VisualElement BuildSettingsOverlay()
        {
            void Close()
            {
                _showSettings = false;
                _confirmForfeit = false;
                Render();
            }

            var o = Overlay();
            var d = Dialog("Settings");
            d.style.minWidth = 300;

            d.Add(Btn(Sfx.Muted ? "Unmute sounds" : "Mute sounds", () =>
            {
                Sfx.Muted = !Sfx.Muted;
                PlayerPrefs.SetInt("kingfall-muted", Sfx.Muted ? 1 : 0);
                PlayerPrefs.Save();
                Render();
            }));

            bool runLive = _session != null &&
                           S.Phase != CampaignPhase.CampaignWon && S.Phase != CampaignPhase.CampaignLost;
            if (runLive)
            {
                if (!_confirmForfeit)
                {
                    d.Add(Theme.Button("Forfeit this run", () => { _confirmForfeit = true; Render(); },
                        Theme.ButtonKind.Danger));
                }
                else
                {
                    var warn = Theme.Subtle("the run ends here — the conquest is lost");
                    warn.style.color = Theme.RedBright;
                    d.Add(warn);
                    var row = Row();
                    row.Add(Theme.Button("Yes, forfeit", () =>
                    {
                        _showSettings = false;
                        _confirmForfeit = false;
                        BackToMenu();
                    }, Theme.ButtonKind.Danger));
                    row.Add(Btn("No, keep fighting", () => { _confirmForfeit = false; Render(); }));
                    d.Add(row);
                }
            }

            d.Add(Theme.Button("Quit to desktop", () => Application.Quit(), Theme.ButtonKind.Ghost));
            d.Add(BtnPrimary("Resume", Close));

            o.RegisterCallback<ClickEvent>(evt => { if (evt.target == o) Close(); });
            o.Add(d);
            return o;
        }

        // ── deck & discard piles (bottom-right) ─────────────────────────────────

        private VisualElement PileCorner()
        {
            var wrap = new VisualElement();
            wrap.style.position = Position.Absolute;
            wrap.style.right = 14; wrap.style.bottom = 12;
            wrap.style.flexDirection = FlexDirection.Row;
            wrap.style.alignItems = Align.FlexEnd;

            var deckPile = Pile("deck", S.Deck.Tavern.Count, Theme.GoldDim, 0f, () => OpenViewer(
                "Cards left to draw (sorted by suit — draw order hidden)",
                S.Deck.Tavern.OrderBy(id => S.Cards.Get(id).EffectiveFace().Suit)
                             .ThenBy(id => S.Cards.Get(id).EffectiveFace().Rank).ToList()));
            deckPile.name = "fx-pile-deck"; // shuffle FX anchor
            wrap.Add(deckPile);
            var discardPile = Pile("discard", S.Deck.Discard.Count, Theme.RedDeep, -8f, () => OpenViewer(
                "Discard pile",
                S.Deck.Discard.OrderBy(id => S.Cards.Get(id).EffectiveFace().Suit)
                              .ThenBy(id => S.Cards.Get(id).EffectiveFace().Rank).ToList()));
            discardPile.name = "fx-pile-discard";
            wrap.Add(discardPile);
            return wrap;
        }

        /// <summary>A little card-pile icon: latticed back, count on its face, label under.</summary>
        private VisualElement Pile(string label, int count, Color tint, float tilt, Action onClick)
        {
            var v = new VisualElement();
            v.style.alignItems = Align.Center;
            v.style.marginLeft = 12;

            var stack = new VisualElement();
            stack.style.width = 46; stack.style.height = 62;

            var shadow = new VisualElement();
            shadow.style.position = Position.Absolute;
            shadow.style.left = 4; shadow.style.top = 4;
            shadow.style.width = 40; shadow.style.height = 56;
            Theme.SetRadius(shadow, 6);
            shadow.style.backgroundColor = Theme.NightDeep;
            Theme.SetBorder(shadow, new Color(tint.r, tint.g, tint.b, 0.35f), 1);
            if (count > 1) stack.Add(shadow); // depth only when there is a pile

            var front = new VisualElement();
            front.style.position = Position.Absolute;
            front.style.left = 0; front.style.top = 0;
            front.style.width = 40; front.style.height = 56;
            Theme.SetRadius(front, 6);
            front.style.backgroundColor = count > 0 ? Theme.NightRaised : Theme.NightDeep;
            if (count > 0)
            {
                front.style.backgroundImage = new StyleBackground(Textures.Lattice());
                front.style.backgroundRepeat = new BackgroundRepeat(Repeat.Repeat, Repeat.Repeat);
                front.style.backgroundSize = new BackgroundSize(24, 24);
            }
            Theme.SetBorder(front, count > 0 ? tint : new Color(tint.r, tint.g, tint.b, 0.35f), 1.5f);
            front.style.rotate = new Rotate(tilt);
            front.style.alignItems = Align.Center;
            front.style.justifyContent = Justify.Center;

            var n = new Label(count.ToString());
            n.style.fontSize = 15;
            n.style.unityFontStyleAndWeight = FontStyle.Bold;
            n.style.color = count > 0 ? Theme.Parchment : Theme.Grey;
            front.Add(n);
            stack.Add(front);
            v.Add(stack);

            var caption = Theme.Subtle(label);
            caption.style.fontSize = 10;
            caption.style.marginTop = 2;
            v.Add(caption);

            Fx.Transition(v, 100);
            Tips.Attach(v, () => ($"{label} — {count} card{(count == 1 ? "" : "s")}",
                label == "deck"
                    ? "the cards left to draw · click to view (sorted by suit — draw order stays hidden)"
                    : "spent cards land here; rests and ♥ recovery return them to the deck · click to view"));
            v.RegisterCallback<MouseEnterEvent>(_ =>
            {
                v.style.translate = new Translate(0, -4);
                Theme.SetBorder(front, Theme.GoldBright, 2);
            });
            v.RegisterCallback<MouseLeaveEvent>(_ =>
            {
                v.style.translate = new Translate(0, 0);
                Theme.SetBorder(front, tint, 1.5f);
            });
            v.RegisterCallback<ClickEvent>(_ =>
            {
                Sfx.Play(Sfx.Sound.Tick, 0.7f);
                onClick();
            });
            return v;
        }

        private VisualElement BuildLogOverlay()
        {
            var o = Overlay();
            o.RegisterCallback<ClickEvent>(_ => { _showLog = false; Render(); });
            var d = Dialog("Chronicle");
            var scroll = new ScrollView();
            scroll.style.maxHeight = 460;
            scroll.style.minWidth = 520;
            var lines = _log.Skip(Math.Max(0, _log.Count - 120)).ToList();
            foreach (var lineText in lines)
            {
                var t = Text(lineText);
                t.style.fontSize = 11;
                t.style.color = lineText.StartsWith("!") ? Theme.RedBright : Theme.ParchmentDim;
                scroll.Add(t);
            }
            d.Add(scroll);
            d.Add(Btn("Close", () => { _showLog = false; Render(); }));
            scroll.schedule.Execute(() => scroll.scrollOffset = new Vector2(0, float.MaxValue));
            o.Add(d);
            return o;
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
