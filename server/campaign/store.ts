import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { CampaignState, KingdomState } from './types'
import { STARTING_CLASSES, STARTING_RELICS, STARTING_SPELLS } from './content'

// File-backed persistence (v0 canon: saves must survive reload; Kingdom unlocks
// are permanent; campaign saves are independent from each other).

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(HERE, '..', 'data')
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
    k = {
      unlockedChapters: [1],
      unlockedClasses: [...STARTING_CLASSES],
      specializationsUnlocked: false,
      campaignsWon: 0,
      heroesLost: 0,
    }
  }
  // item-economy: default the starting pools for fresh/legacy kingdoms.
  if (!k.unlockedRelics) k.unlockedRelics = [...STARTING_RELICS]
  if (!k.unlockedSpells) k.unlockedSpells = [...STARTING_SPELLS]
  return k
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
    return JSON.parse(fs.readFileSync(path.join(CAMPAIGN_DIR, `${id.replace(/[^a-zA-Z0-9_-]/g, '')}.json`), 'utf-8')) as CampaignState
  } catch {
    return null
  }
}

export function deleteCampaign(id: string) {
  try { fs.unlinkSync(path.join(CAMPAIGN_DIR, `${id.replace(/[^a-zA-Z0-9_-]/g, '')}.json`)) } catch { /* gone */ }
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
  ensureDirs()
  const out: SaveSummary[] = []
  for (const f of fs.readdirSync(CAMPAIGN_DIR)) {
    if (!f.endsWith('.json')) continue
    try {
      const c = JSON.parse(fs.readFileSync(path.join(CAMPAIGN_DIR, f), 'utf-8')) as CampaignState
      if (c.phase === 'campaign_lost') continue
      out.push({
        id: c.id, name: c.name, chapter: c.chapter, phase: c.phase,
        heroes: c.heroes.map(h => ({ name: h.playerName, classId: h.classId, alive: h.alive })),
        createdAt: c.createdAt,
      })
    } catch { /* corrupt save — skip */ }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
