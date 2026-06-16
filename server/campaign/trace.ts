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
const TRACE_DIR = path.join(HERE, '..', 'data', 'traces')

const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_')

// hostId is a sentinel no player matches, so the replayed UI is read-only
// (RoadMap clicks and host-only buttons are isHost-gated)
const REPLAY_HOST = '__replay__'

const REPLAY_KINGDOM: KingdomState = {
  unlockedChapters: [1, 2],
  unlockedClasses: ['sentinel', 'quartermaster', 'surgeon', 'executioner', 'commander', 'warden', 'gambler', 'exile', 'oracle'],
  specializationsUnlocked: true,
  campaignsWon: 0,
  heroesLost: 0,
  unlockedRelics: [...STARTING_RELICS],
  unlockedSpells: [...STARTING_SPELLS],
}

/** Append one trace line (writing the header first if the file is new). */
export function traceAction(
  c: CampaignState,
  source: 'human' | 'bot',
  traceId: string,
  action: { type: string; [k: string]: unknown },
) {
  try {
    fs.mkdirSync(TRACE_DIR, { recursive: true })
    const file = path.join(TRACE_DIR, `${safe(traceId)}.jsonl`)
    if (!fs.existsSync(file)) {
      const header = {
        trace: 2,
        source,
        id: c.id,
        name: c.name,
        seed: c.seed,
        chapter: c.chapter,
        players: c.heroes.map(h => h.playerName),
        classes: c.heroes.map(h => h.classId),
        startedAt: new Date().toISOString(),
      }
      fs.writeFileSync(file, JSON.stringify(header) + '\n')
    }
    // follow the actor: project from whoever holds the turn so myHand (the
    // fan) is the acting player's hand — exactly what that player saw
    const s = c.encounter
    const actorIdx = s && s.outcome === 'active'
      ? Math.max(0, s.currentPlayerIndex)
      : 0
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
    fs.appendFileSync(file, JSON.stringify({ action, view, hands }) + '\n')
  } catch { /* tracing never breaks the game */ }
}
