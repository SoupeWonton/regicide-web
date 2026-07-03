import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { CampaignState, KingdomState } from './types'
import { TIER1_CLASSES, STARTING_RELICS, STARTING_SPELLS } from './content'
import { migrateCampaign } from './cards'

// File-backed persistence (v0 canon: saves must survive reload; Kingdom unlocks
// are permanent; campaign saves are independent from each other).

const HERE = path.dirname(fileURLToPath(import.meta.url))
// REGICIDE_DATA_DIR lets sims/tests redirect persistence to a throwaway dir so
// they never touch the live game's kingdom.json / saves. Default: server/data.
const DATA_DIR = process.env.REGICIDE_DATA_DIR || path.join(HERE, '..', 'data')
const CAMPAIGN_DIR = path.join(DATA_DIR, 'campaigns')
const KINGDOM_FILE = path.join(DATA_DIR, 'kingdom.json')

function ensureDirs() {
  fs.mkdirSync(CAMPAIGN_DIR, { recursive: true })
}

export function loadKingdom(): KingdomState {
  ensureDirs()
  let k: KingdomState
  try {
    k = JSON.parse(fs.readFileSync(KINGDOM_FILE, 'utf-8')) as KingdomState
  } catch {
    k = freshKingdom()
  }
  // ── V3.0 cutover (slice 9): wipe every pre-V3 lineage ──────────────────────
  // A kingdom without the v3 marker is a V2 save — reset it to a fresh V3
  // lineage and purge the saved campaigns (no mid-run save/resume in V3.0).
  // The client shows the one-line explainer at the lobby.
  if (!k.v3) {
    k = freshKingdom()
    try {
      for (const f of fs.readdirSync(CAMPAIGN_DIR)) {
        if (f.endsWith('.json')) fs.unlinkSync(path.join(CAMPAIGN_DIR, f))
      }
    } catch { /* nothing to purge */ }
    saveKingdom(k)
  }
  // item-economy: default the starting pools for fresh/legacy kingdoms.
  if (!k.unlockedRelics) k.unlockedRelics = [...STARTING_RELICS]
  if (!k.unlockedSpells) k.unlockedSpells = [...STARTING_SPELLS]
  return k
}

function freshKingdom(): KingdomState {
  return {
    v3: true,
    unlockedChapters: [1],
    unlockedClasses: [...TIER1_CLASSES],
    specializationsUnlocked: false,
    pathsUnlocked: false,
    campaignsWon: 0,
    heroesLost: 0,
  }
}

export function saveKingdom(k: KingdomState) {
  ensureDirs()
  fs.writeFileSync(KINGDOM_FILE, JSON.stringify(k, null, 2))
}

// Full game chronicle on disk — the UI no longer shows a log, but every line
// is kept per campaign so games can be reviewed and argued about afterwards.
const LOG_DIR = path.join(DATA_DIR, 'logs')
export function appendGameLog(campaignId: string, line: string) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true })
    fs.appendFileSync(
      path.join(LOG_DIR, `${campaignId.replace(/[^a-zA-Z0-9_-]/g, '')}.log`),
      `${new Date().toISOString()} ${line}\n`,
    )
  } catch { /* logging never breaks the game */ }
}

export function saveCampaign(c: CampaignState) {
  ensureDirs()
  fs.writeFileSync(path.join(CAMPAIGN_DIR, `${c.id}.json`), JSON.stringify(c))
}

export function loadCampaign(id: string): CampaignState | null {
  ensureDirs()
  try {
    const c = JSON.parse(fs.readFileSync(path.join(CAMPAIGN_DIR, `${id.replace(/[^a-zA-Z0-9_-]/g, '')}.json`), 'utf-8')) as CampaignState
    // §F: forward-migrate legacy saves (schemaVersion < 2 → build the registry)
    return migrateCampaign(c)
  } catch {
    return null
  }
}

export function deleteCampaign(id: string) {
  try { fs.unlinkSync(path.join(CAMPAIGN_DIR, `${id.replace(/[^a-zA-Z0-9_-]/g, '')}.json`)) } catch { /* gone */ }
}

/**
 * Dev same-session reconnection: the newest autosaved, still-live SOLO run that
 * belongs to `playerId`. Used to rehydrate a run after a server restart (e.g.
 * `tsx watch` reload) — the lobby still lists nothing (listCampaigns → []); this
 * only restores YOUR own in-progress run when you refresh back into its room.
 */
export function findResumableCampaign(playerId: string): string | undefined {
  ensureDirs()
  let best: { id: string; mtime: number } | undefined
  for (const f of fs.readdirSync(CAMPAIGN_DIR)) {
    if (!f.endsWith('.json')) continue
    try {
      const c = JSON.parse(fs.readFileSync(path.join(CAMPAIGN_DIR, f), 'utf-8')) as CampaignState
      if (c.phase === 'campaign_lost' || c.phase === 'campaign_won') continue
      if (c.heroes.length !== 1 || !c.heroes.some(h => h.playerId === playerId)) continue
      const mtime = fs.statSync(path.join(CAMPAIGN_DIR, f)).mtimeMs
      if (!best || mtime > best.mtime) best = { id: c.id, mtime }
    } catch { /* skip unreadable */ }
  }
  return best?.id
}

export interface SaveSummary {
  id: string
  name: string
  chapter: number
  phase: string
  heroes: { name: string; classId: string; alive: boolean }[]
  createdAt: string
}

export function listCampaigns(): SaveSummary[] {
  // V3.0 (slice 9, §10): NO mid-run save/resume — a run is single-session and
  // only the lineage meta persists. The lobby therefore never lists saves.
  // (saveCampaign stays: it backs same-session reconnection and debugging.)
  return []
}

