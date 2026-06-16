---
description: Sweep the codebase for drift from the ratified design canon and report (optionally record) the gaps.
argument-hint: "[focus area, e.g. 'classes' or 'deck'] [--write]"
---

Run a **canon-vs-code coherence audit** for the Regicide project. Delegate the
analysis to the `drift-auditor` subagent; you (the main session) handle scoping the
request and, if asked, writing the result.

Argument: `$ARGUMENTS`
- If it names a focus area (e.g. `classes`, `deck`, `province`, `candles`, `relics`),
  scope the audit to that area only. Empty = full sweep.
- If it contains `--write`, after reporting, update the **live** open-questions doc
  (`Design/OPEN-DESIGN-QUESTIONS-v0.md`) — refresh the `Q9 — Engineering coherence
  audit` section in place (don't duplicate it). Without `--write`, report only and
  end by asking whether to record it.

## Sources of truth (priority order)
1. `docs/design/campaign/campaign-bible.md` — wins all conflicts.
2. The ratified decisions in `docs/ideas/open-design-questions.md` (✅ RATIFIED items)
   and `docs/design/classes/class-design.md` principles.
3. `docs/design/` (campaign, classes, systems, items) + `docs/design/ascending-deck.md`.
Treat `docs/ideas/campaign-open-questions.md` as **superseded/history**, not current canon.

## What the drift-auditor must check (code under `server/campaign/*` + `client/src/components/campaign/*`)
Compare ratified canon against the engine. Known fault lines to re-verify every run
(don't assume the last result — the code may have moved):
- **Run structure:** province/act/gate vs. lingering `chapter: 1|2` / `castle`.
- **Death model:** lineage CUT / full reset vs. lingering `replace_hero`,
  `ReplacementHand`, retreat-vote, second wind.
- **Memories:** cut vs. lingering `memory_draft` / `chapter_complete` / memory refs.
- **Candle economy:** implemented vs. comment-only placeholder.
- **Deck rules:** between-province reset + persist-within + guaranteed pre-Throne Camp.
- **Deck-modification layer + per-class deck effects:** present vs. absent.
- **Relic persistence + Kingdom-gated build-defining tier.**
- **Class reworks** (Oracle/Sentinel/Gambler/Warden + Furnace/Arbiter) vs. old cores.

## Required output shape (from the drift-auditor)
A table, one row per checked decision: **the canon rule | code evidence with
`file:line` | verdict (❌ missing / ❌ contradicts / ◻ partial / ✅ coherent)**.
Then: a one-line **Net** drift assessment, and a **smallest-blast-first migration
order** for the ❌/◻ rows. Cite `file:line` for every claim — no hand-waving. If a
row is now ✅, say so plainly; don't manufacture drift.

## Your wrap-up (main session)
- Summarize the verdict in 2–3 lines.
- If `--write` was passed, make the `Q9` edit and confirm what changed.
- Otherwise, ask: "Record this into Q9 of the open-questions doc?"
