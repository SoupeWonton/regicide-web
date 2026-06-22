# Economy & Identity — the progression spine

**BUILD STATUS (2026-06-16):** ✅ **Phase 1** — content (5 hail-mary spells, 5 mythic
relics, the Catalyst) + all effects wired & unit-tested. ✅ **Phase 2** — the
post-Council fragment shop (4 tiers @ 6/18/24/36, opens at the C1→C2 seam,
road-spending removed). ✅ **Phase 3** — the other two mythic sources: **Caravan**
(curse all your 2s/3s → a mythic) and the **Lair 3-way reward** (mythic relic /
hail-mary spell / free rare token), all sharing one **3-per-continent cap**
(`mythicThisContinent`, resets at the continent seam). ✅ **Phase 4** — the
**Sanctum → Rites** rework (`offerSanctum`/`applySanctumRite` in `campaign.ts`): no
longer sells held spells; offers three immediate, consumed-on-pick rites — **Foresight**
(`foresightNext` flag → reveals the next fight's enemy lineup, server flag + client
`foreseen` projection), **Blessing** (reuses `shrineBlessing`), and **Cleanse** (folds
the Shrine in, reuses `shrine:cleanse:` routing). Smoke **Test G** covers them.
*Simplification to revisit:* Foresight is **see-only** (no enemy reorder yet). ⚠️
**NO-EXILE (2026-06-16):** the deck **only grows** — the Sanctum Exile rite, the
Exile-class camp ability, the "Tithe of the Severed" siege ult, and the `exile_pick`
flow were all **removed**; no mechanic thins the deck. The Exile **class** is parked
(roster + signature tokens kept, no active ability). ⏳ **Remaining:** Phase 5 (proper
shop UI + cut spells from veteran/elite/gate spoils). Smoke 5/5 + client typecheck green.

This is the canonical record of the design conversation
that set the fragment economy, the 4-tier shop, the bridge-relic ladder, the Token-2
identity engines, and the shop/landmark roles. Difficulty is **frozen** (see end).

## 0. The thesis — brute-force → finesse

The whole skill arc is leaving crutches behind. Early you lean on raw value and a
generic amplifier relic; late, a self-running engine and **precise exact-kills**
carry you and you *drop* the crutch. The one-line law:

> **You don't win by increasing every card. You want finesse.**

## 1. The fragment economy & the 4-tier shop — **LOCKED (2026-06-16)**

Fragments are earned across a continent (exact-killing **owned** cards — the golden
rule — and backfill/Council redundancy; **both sources scale with exact-kill rate**, so
fragments are a *finesse meter*). They are spent **post-Council, once per continent**,
at the **graduation shop** (NOT on the road — migrate today's road-side `apply_fragment`
into this shop). One shared budget, four price tiers:

| Tier | Type | **Cost** | Cap | Role |
|---|---|---|---|---|
| **1** | C-tier **token** | **6** | ∞ (budget-limited) | granular upgrade — **the over-buy trap** |
| **2** | **spell** (hail-mary, §5a) | **18** | 2 | held clutch swing |
| **3** | **relic** (standard, §5b) | **24** | 3 (4 if excellent) | passive build-definer |
| **4** | **premium bridge relic** (§3) | **36** | 1 | the gate to the next continent |

**Allocation is the game.** All four tiers draw from one purse — spreading *wide* (many
Item-1 tokens) is the "increase every card" trap; saving *tall* (Item 4) is finesse.

**Validated by content audit + playtest (8k5jk9uq):** Continent 1 presents **64
exact-kill opportunities** (20 recruits + 44 fragment-eligible). A skilled run (~77%
exact-kill) banks **~43 fragments** → the **premium (36) is affordable with a ~7-frag
≈ 4-missed-exact buffer** (the "one miss won't lock you out" feel). The buy-the-premium
gate sits at **~65–70% exact-kill rate**; below it you settle for a relic/spells. The
~50% bot earns ~20 → tokens/a spell only (correct — it hasn't earned the bridge). The
costs *are* the skill curve; tuned for human precision (~70%), with the bot as the floor.

## 2. The over-upgrade trap (a learnable mistake)

Over-Honing inflates card values → exact-kills **overshoot** → in Continent 2 the
royals get **banished, not recruited** → weaker deck → the next continent punishes the
greed. It **survives the run** (overkill still defeats), it just costs the recruits and
the identity. Guardrail: fragment cost **6** (makes "Hone everything" a real, regretted
choice). **There is no claw-back** — once over-Honed, you live with it; **no mechanic
removes a card from the deck** (see the no-exile rule below). The trap should *tempt*
and *teach* mid-Continent-2, not be patched out.

> **NO-EXILE RULE (canon, 2026-06-16):** the deck **only ever grows** — recruit
> number-enemies and royals, never thin. There is **no card-removal mechanic
> anywhere** (the old Exile rite, Exile-class camp ability, and the "Tithe of the
> Severed" siege ultimate were all retired). Each continent **starts from a complete
> deck** (Continent 2 = the full A–10, 40 cards, built from `ownedCards`). The **Exile
> class** keeps its roster slot + signature Transmute tokens but is **parked** (no
> active ability) pending a non-thinning repurpose.

## 3. The bridge-relic ladder

Each continent: **grind → buy the premium → next continent opens.** The premium
**escalates in specificity** up the ladder:
- **C1 → the Catalyst** (generic): *once per turn, your first token/engine trigger
  fires twice.* Lifts all four engines. **It obsoletes itself** — late game your engine
  fires many times a turn, so amplifying the *first* trigger is a rounding error.
  Dropping the Catalyst for a specialized relic *is* the proof you've graduated to finesse.
- **C2 → Token 2** (per-class identity engine — see §4).
- **C3 → deeper still** (TBD).

## 4. Token 2 — the identity engines (per class)

**Token 1** (the C1 class signature, 3 stamps on the 3/4/5 of your suit) is the *lever*
and is fine as-is for the four mains. **Token 2** turns that lever into a **win condition**
via a conditional trigger that only pays if you commit to the axis ("vanilla dies").
Two trigger shapes: **state-based** ("when the enemy has no attack…") and **count-based**
("for every X in your hand…").

- **Sentinel — the wall strikes back:** when you fully shield the enemy (net 0), deal
  your shield **overflow** as damage. Over-shielding becomes the weapon.
- **Quartermaster — the full hand is the weapon:** +damage per N cards held; a loaded
  hand is power, dumping it carelessly is weakness.
- **Surgeon — escalation through attrition:** every Nth recovery → draw + a damage
  spike. Wants to be at 0 cards because that's when it erupts. (The comeback class —
  literally the "0 cards → insane recovery" moment from `Updated_Raw.txt`.)
- **Executioner — precision snowball:** each exact kill this encounter primes the next
  (+damage, stacking). Chain clean cuts to accelerate.

## 5. Item types & the shops (roles)

- **Token (1)** — modifies **one card**. Granular.
- **Spell (2)** — **held**, one-shot, cast *in* a fight at a chosen moment. A *moment*.
  Now shop-only (cap 2) → stops the spell flood; each one matters.
- **Relic (3)** — **passive, always-on rule-bend** you build around. A *strategy*. The
  "stronger tier feel" = always-on + build-around. **Universal but double-edged** (see
  §5b): pure upside if you've committed to a build, a liability if you stayed vanilla.
- **Premium (4)** — the **engine/bridge**. The *run*.
- **Sanctum (reworked) — Rites — ✅ BUILT (Phase 4):** no longer sells held spells.
  Sells **immediate, consumed-on-pick** effects applied *now*, between fights, to your
  deck/run state: **Foresight** (see the next encounter's enemies — *reorder deferred*),
  **Blessing** (start the next fight with a boon), **Cleanse** (folds the Shrine in).
  **No Exile rite** — see the no-exile rule (§2); the deck only grows. The verb split:
  **Camp rests · Sanctum transforms (now) · Spells answer (later, in a fight).**
- **Caravan / fragment shop** — the paid store of §1 (the four tiers).

### 5a. Spells — the hail-mary list — **LOCKED**

Shop-only (Item 2, cost 18, **cap 2**). Big, swingy, *"oh I'm saved"* — held for the
cornered moment, not background chip. (Replaces the old flood of small spells.)

| Spell | Effect |
|---|---|
| **Overdrive** | Your next play deals **triple** damage. |
| **Bulwark** | **Negate** the next counterattack entirely. |
| **Mass Muster** | Draw **4** cards. |
| **Full Recovery** | Shuffle your **entire discard** into the Tavern, then draw to full. |
| **Execute** | Instantly kill an enemy at **≤10 HP** (the value you couldn't quite reach). |

(Cut: *Second Wind* — it was Full Recovery + Bulwark in one, too strong.)

### 5b. Mythic relics — the shiny-decoy tier — **LOCKED**

**Mythic rarity. Max 3 per continent**, from three sources: the **Caravan** (curse all
your 2s — or 3s — to take one), a **Lair reward screen** (pick 1 of 3: this relic, a
hail-mary spell, or a very rare token), and the **fragment shop** (Item 3, cost 24).

**Net-positive, flashy, rare** — concrete enough that a new player thinks *"isn't Item 3
better than the 36-cost bridge?"* and buys it over the **Catalyst**. It isn't: the bridge
compounds all continent and **gates the next one**, while these flat relics **plateau**.
By run 4–5 you learn to take the bridge. **No explicit downsides** — the trap is purely
(a) buying them *instead of* the bridge and (b) the quiet **over-token pull**.

| Relic | Effect | The quiet trap |
|---|---|---|
| **Glass Core** ⭐ | Your **tokened** cards deal **+2**. | the bait — pulls you to Hone everything → overshoot exact-kills |
| **Warhorn** | **+2 damage** on every play. | flat & flashy; overshoots exacts, doesn't scale late |
| **Bloodhound** | Every **exact kill** draws a card. | feels amazing, but win-more — builds no identity |
| **Reliquary** | **+2 hand cap.** | comfy card advantage → coast *vanilla* into C2 |
| **Combat Cache** | Combos may total **12**. | the gentle pure-value pick |

(**Twin Strike** — first play each turn hits twice — loved, held for a later pass.
**Quartermaster's Ledger** cut. **Overflow** cut. General relic rebalance = later.)

**Premium (Item 4) — the per-continent bridge — LOCKED:** C1 = **the Catalyst** (once
per turn, your first token/engine trigger fires twice — abstract, compounding,
obsoletes itself, §3); C2 = **Token 2** (per-class identity engine, §4); C3+ deeper.

## 6. Difficulty is FROZEN (`Final_Update.txt`, 2026-06-16)

The partner crossed **Criticism → Engagement → Retention → Ownership** ("j'ai du fun"
unqualified; two runs while impaired; overwriting his branch as the baseline; now wants
"ça look better"). The difficulty complaints are stale. **Stop tuning numbers.** The
**Jester reset is intentional** — the lack of early pressure is the point (you learn to
aim for exact-kill every time). Relic-rebalance / spell-cap / Jester-scarcity /
enemy-escalation are **shelved** — they'd tune the fun out. **Role split:**
systems/economy/balance (Landry + Claude) ↔ visuals/UX/presentation (Gabriel).
