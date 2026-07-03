import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { CampaignState, KingdomState } from './types'
import { buildClientCampaign } from './campaign'
import { STARTING_RELICS, STARTING_SPELLS } from './content'
import { cardLabel } from '../deck'

// Action-by-action run traces for the replay sandbox (client route #/sandbox).
// One JSONL file per run in data/traces/: line 0 is a header, then one line
// per successful action. Trace v2: each step stores the REAL client projection
// (buildClientCampaign) from the current actor's perspective, so the sandbox
// renders the exact same UI components a player sees (EncounterBoard, RoadMap,
// CampPanel) — plus every hand for the analysis strip. Human runs are traced
// from sessions.dispatchCampaignAction (when the lobby Record box is checked);
// bot runs from sim.ts --trace. Tracing must never break the game — every
// write is wrapped and a failure is dropped silently.

const HERE = path.dirname(fileURLToPath(import.meta.url))
// honor REGICIDE_DATA_DIR (like store.ts) so traces persist on the prod disk
const TRACE_DIR = path.join(process.env.REGICIDE_DATA_DIR || path.join(HERE, '..', 'data'), 'traces')

const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_')

// hostId is a sentinel no player matches, so the replayed UI is read-only
// (RoadMap clicks and host-only buttons are isHost-gated)
const REPLAY_HOST = '__replay__'

export const REPLAY_KINGDOM: KingdomState = {
  unlockedChapters: [1, 2],
  unlockedClasses: ['sentinel', 'quartermaster', 'surgeon', 'executioner', 'commander', 'warden', 'gambler', 'exile', 'oracle'],
  specializationsUnlocked: true,
  campaignsWon: 0,
  heroesLost: 0,
  unlockedRelics: [...STARTING_RELICS],
  unlockedSpells: [...STARTING_SPELLS],
}

/** The v3 header — everything the replayer (scripts/replay.ts) needs to
 * reconstruct the run: seed + players + chapter recreate the campaign, the
 * kingdom snapshot recreates the content offers (unlock pools feed the RNG-
 * consuming draws), staffs recreate the class picks. */
function buildHeader(c: CampaignState, source: 'human' | 'bot', kingdom?: KingdomState) {
  return {
    trace: 3,
    source,
    id: c.id,
    name: c.name,
    seed: c.seed,
    chapter: c.chapter,
    players: c.heroes.map(h => h.playerName),
    classes: c.heroes.map(h => h.classId),
    staffs: c.heroes.map(h => h.staffId ?? null),
    // fall back to a kingdom derived from the campaign's own unlock snapshot —
    // self-contained even when the caller can't hand us the live kingdom
    kingdom: kingdom ?? {
      ...REPLAY_KINGDOM,
      unlockedChapters: [c.chapter],
      unlockedRelics: c.unlockedRelics ?? REPLAY_KINGDOM.unlockedRelics,
      unlockedSpells: c.unlockedSpells ?? REPLAY_KINGDOM.unlockedSpells,
    },
    startedAt: new Date().toISOString(),
  }
}

/** Append one trace line (writing the header first if the file is new). */
export function traceAction(
  c: CampaignState,
  source: 'human' | 'bot',
  traceId: string,
  action: { type: string; [k: string]: unknown },
  opts?: { actorIdx?: number; kingdom?: KingdomState },
) {
  try {
    fs.mkdirSync(TRACE_DIR, { recursive: true })
    const file = path.join(TRACE_DIR, `${safe(traceId)}.jsonl`)
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(buildHeader(c, source, opts?.kingdom)) + '\n')
    }
    // follow the actor: project from whoever holds the turn so myHand (the
    // fan) is the acting player's hand — exactly what that player saw.
    // v3: the true actor is passed in (playerIds are socket ids — worthless
    // for replay); the fallback derivation covers legacy callers.
    const s = c.encounter
    const actorIdx = opts?.actorIdx ?? (s && s.outcome === 'active'
      ? Math.max(0, s.currentPlayerIndex)
      : 0)
    const actorId = c.heroes[actorIdx]?.playerId ?? c.heroes[0]?.playerId ?? ''
    const view = buildClientCampaign(c, actorId, REPLAY_HOST, REPLAY_KINGDOM)
    // trace diet: pile CONTENTS (the inspector) and the map during fight steps
    // are the bulk of every line and the replay boards don't need them —
    // counts still render on the side board, the map returns on road steps
    if (view.encounter) {
      view.encounter.tavernCards = []
      view.encounter.discardCards = []
      if (view.phase === 'encounter' || view.phase === 'death_vote') view.map = null
    }
    // every hand, for the sandbox's all-hands analysis strip
    const hands = (s ? s.hands : c.deck?.hands ?? []).map(h => h.map(cardLabel))
    fs.appendFileSync(file, JSON.stringify({ action, actorIdx, view, hands }) + '\n')
  } catch { /* tracing never breaks the game */ }
}

/**
 * "Lite" trace: header + action stream only (no per-step views/hands).
 * Written in one shot by the sims when an invariant violation is detected —
 * cheap to buffer, and fully re-dispatchable by scripts/replay.ts (which
 * replays actions and recomputes state; the views were only ever for the
 * sandbox renderer).
 */
export function writeActionTrace(
  c: CampaignState,
  source: 'human' | 'bot',
  traceId: string,
  steps: { action: { type: string; [k: string]: unknown }; actorIdx: number }[],
  kingdom?: KingdomState,
): string | null {
  try {
    fs.mkdirSync(TRACE_DIR, { recursive: true })
    const file = path.join(TRACE_DIR, `${safe(traceId)}.jsonl`)
    const lines = [JSON.stringify({ ...buildHeader(c, source, kingdom), lite: true })]
    for (const s of steps) lines.push(JSON.stringify(s))
    fs.writeFileSync(file, lines.join('\n') + '\n')
    return file
  } catch { return null }   // tracing never breaks the run
}
