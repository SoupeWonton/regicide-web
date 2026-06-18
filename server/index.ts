import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import {
  createRoom, joinRoom, setReady, startGame, playCards, discardDamage, yieldTurn,
  chooseNext, restartGame, playerDisconnect, roomInfo, findRoomsByPlayer,
  markConnected, gameStateFor, leaveRoom, deleteRoom,
} from './rooms'
import {
  startCampaignSession, startTutorialSession, resumeCampaignSession, dispatchCampaignAction,
  buildCampaignStates, getSaves, getKingdom, getSession, endSession,
} from './campaign/sessions'
import type { CampaignAction } from './campaign/sessions'
import path from 'path'
import fs from 'fs'
import archiver from 'archiver'
import { fileURLToPath } from 'url'

const app = express()
const http = createServer(app)
const io = new Server(http, { cors: { origin: '*' } })

app.get('/health', (_, res) => res.json({ ok: true }))

// Production (Render / tunnel): serve the built client from this server so a
// single origin carries both the app and the websocket. Gated on dist
// existing rather than NODE_ENV — dev keeps using Vite on :5173 either way.
const HERE = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(HERE, '..', 'client', 'dist')

// ── Run-data ops page (telemetry is not private) ─────────────────────────────
// /data                          → HTML page grouped by top-level folder, each with
//                                  its own download/delete; plus download-all/delete-all
// /data/all.zip[?folder=traces]  → zip the whole dir, or just one folder
// POST /data/delete-all?confirm=DELETE[&folder=traces] → wipe the dir, or one folder
// /data/<path>                   → download a single file
// All serve from REGICIDE_DATA_DIR. Registered before the SPA catch-all. Read
// routes are path-traversal-guarded. Delete is POST-only + a fixed confirm token
// (not a secret — just stops accidental/drive-by GET triggers).
const DATA_DIR = path.resolve(process.env.REGICIDE_DATA_DIR || path.join(HERE, '..', 'data'))
function listDataFiles(dir: string, base = ''): { path: string; size: number }[] {
  const out: { path: string; size: number }[] = []
  let entries: fs.Dirent[]
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...listDataFiles(abs, rel))
    else { try { out.push({ path: rel, size: fs.statSync(abs).size }) } catch { /* skip unreadable */ } }
  }
  return out
}
const fmtBytes = (n: number) =>
  n >= 1e9 ? (n / 1e9).toFixed(2) + ' GB' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : n >= 1e3 ? (n / 1e3).toFixed(1) + ' KB' : n + ' B'
// a folder filter must be a single simple segment (no traversal)
const VALID_FOLDER = /^[a-zA-Z0-9_-]+$/
const folderOf = (rel: string) => { const i = rel.indexOf('/'); return i < 0 ? '' : rel.slice(0, i) }

app.get('/data', (_req, res) => {
  const files = listDataFiles(DATA_DIR)
  const total = files.reduce((s, f) => s + f.size, 0)
  const pct = Math.min(100, 100 * total / 1e9)
  // group by top-level folder; root-level files (e.g. kingdom.json) bucket under ''
  const groups = new Map<string, { count: number; size: number; files: { path: string; size: number }[] }>()
  for (const f of files) {
    const g = folderOf(f.path)
    const e = groups.get(g) ?? { count: 0, size: 0, files: [] }
    e.count++; e.size += f.size; e.files.push(f); groups.set(g, e)
  }
  const folderRows = [...groups.entries()].filter(([g]) => g).sort((a, b) => b[1].size - a[1].size).map(([g, e]) => {
    const fl = e.files.sort((a, b) => a.path.localeCompare(b.path))
      .map(f => `<div><a href="/data/${encodeURI(f.path)}">${f.path.slice(g.length + 1)}</a> <span class="r">${fmtBytes(f.size)}</span></div>`).join('')
    return `<tr><td><b>${g}/</b></td><td class="r">${e.count}</td><td class="r">${fmtBytes(e.size)}</td>`
      + `<td class="act"><a class="dl" href="/data/all.zip?folder=${encodeURIComponent(g)}">⬇ zip</a>`
      + `<button class="del" onclick="del('${g}',${e.count},'${fmtBytes(e.size)}')">🗑</button></td></tr>`
      + `<tr><td colspan="4" class="fl"><details><summary>show ${e.count} file(s)</summary>${fl}</details></td></tr>`
  }).join('')
  const rootFiles = (groups.get('')?.files ?? []).sort((a, b) => a.path.localeCompare(b.path))
    .map(f => `<tr><td colspan="3"><a href="/data/${encodeURI(f.path)}">${f.path}</a></td><td class="r">${fmtBytes(f.size)}</td></tr>`).join('')
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Regicide run data</title><style>
body{font:14px/1.5 system-ui,sans-serif;max-width:880px;margin:2rem auto;padding:0 1rem;color:#eaeaea;background:#15131f}
a{color:#c9a84a}h1{margin:0 0 .25rem}h2{margin:1.4rem 0 .3rem;font-size:1rem;color:#888}.r{text-align:right;white-space:nowrap;color:#aaa}
.bar{height:10px;background:#2a2740;border-radius:5px;overflow:hidden;margin:.4rem 0 1rem}.bar>i{display:block;height:100%;background:${pct > 85 ? '#e05a3a' : '#c9a84a'}}
table{width:100%;border-collapse:collapse}td,th{padding:.35rem .5rem;border-bottom:1px solid #2a2740}th{text-align:left;color:#888}
.act{text-align:right;white-space:nowrap}.fl{padding:0 .5rem .4rem 1.5rem}.fl details{color:#888}.fl div{font-size:13px}
.btns{margin:1rem 0;display:flex;gap:.75rem;flex-wrap:wrap}.dl,button{padding:.45rem .8rem;border-radius:6px;border:0;font:inherit;cursor:pointer;text-decoration:none;font-size:13px}
.dl{background:#2e7d32;color:#fff}.del{background:#9b2c2c;color:#fff;margin-left:.4rem}.big{padding:.55rem 1rem}</style></head><body>
<h1>Regicide run data</h1>
<p>${files.length} file(s) · <b>${fmtBytes(total)}</b> of 1 GB used (${pct.toFixed(1)}%)</p>
<div class="bar"><i style="width:${pct}%"></i></div>
<div class="btns">
  <a class="dl big" href="/data/all.zip">⬇ Download all (.zip)</a>
  <button class="del big" style="margin-left:0" onclick="del('',${files.length},'${fmtBytes(total)}')">🗑 Delete all</button>
</div>
<h2>by folder — download or clear just one</h2>
<table><thead><tr><th>folder</th><th class="r">files</th><th class="r">size</th><th class="act">actions</th></tr></thead>
<tbody>${folderRows || '<tr><td colspan="4">No folders yet.</td></tr>'}${rootFiles ? `<tr><td colspan="4"><b>loose files</b></td></tr>${rootFiles}` : ''}</tbody></table>
<script>
async function del(folder,n,sz){
  const what = folder ? folder+'/ ('+n+' files, '+sz+')' : 'ALL '+n+' files ('+sz+')';
  if(!confirm('Delete '+what+'?\\nDownload first — this cannot be undone.'))return;
  const u='/data/delete-all?confirm=DELETE'+(folder?'&folder='+encodeURIComponent(folder):'');
  const r=await fetch(u,{method:'POST'});const j=await r.json().catch(()=>({}));
  alert('Deleted '+(j.deleted??'?')+' files'+(j.freed?' ('+(j.freed/1e6).toFixed(1)+' MB)':'')+'.');location.reload();
}
</script></body></html>`)
})

app.get('/data/all.zip', (req, res) => {
  const folder = typeof req.query.folder === 'string' ? req.query.folder : ''
  if (folder && !VALID_FOLDER.test(folder)) { res.status(400).send('bad folder'); return }
  let files = listDataFiles(DATA_DIR)
  if (folder) files = files.filter(f => f.path.startsWith(folder + '/'))
  res.attachment(folder ? `regicide-${folder}.zip` : 'regicide-data.zip')
  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.on('error', err => { console.error('[data] zip error:', err.message); try { res.status(500).end() } catch { /* already streaming */ } })
  archive.pipe(res)
  for (const f of files) archive.file(path.join(DATA_DIR, f.path), { name: f.path })
  archive.finalize()
})

app.post('/data/delete-all', (req, res) => {
  if (req.query.confirm !== 'DELETE') { res.status(400).json({ error: 'pass ?confirm=DELETE' }); return }
  const folder = typeof req.query.folder === 'string' ? req.query.folder : ''
  if (folder && !VALID_FOLDER.test(folder)) { res.status(400).json({ error: 'bad folder' }); return }
  let files = listDataFiles(DATA_DIR)
  if (folder) files = files.filter(f => f.path.startsWith(folder + '/'))
  let deleted = 0, freed = 0
  for (const f of files) { try { fs.rmSync(path.join(DATA_DIR, f.path)); deleted++; freed += f.size } catch { /* skip */ } }
  // remove now-empty dirs: just the one folder, or every subdir for a full wipe
  try {
    if (folder) { fs.rmSync(path.join(DATA_DIR, folder), { recursive: true, force: true }) }
    else for (const d of fs.readdirSync(DATA_DIR)) {
      const abs = path.join(DATA_DIR, d)
      try { if (fs.statSync(abs).isDirectory()) fs.rmSync(abs, { recursive: true, force: true }) } catch { /* skip */ }
    }
  } catch { /* gone */ }
  console.log(`[data] delete ${folder || 'ALL'}: ${deleted} files (${fmtBytes(freed)})`)
  res.json({ deleted, freed })
})

app.get(/^\/data\/(.+)/, (req, res) => {
  const rel = decodeURIComponent((req.params as Record<string, string>)[0]!)
  const abs = path.resolve(DATA_DIR, rel)
  if (abs !== DATA_DIR && !abs.startsWith(DATA_DIR + path.sep)) { res.status(400).send('bad path'); return }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) { res.status(404).send('not found'); return }
  res.download(abs)
})

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get(/^\/(?!socket\.io|health).*/, (_, res) => res.sendFile(path.join(DIST, 'index.html')))
  console.log('Serving built client from client/dist')
}

// Players are keyed by a stable client id (sent via socket auth, persisted in
// the browser's localStorage) instead of the volatile socket id. This map
// tracks which live socket currently speaks for each client id, so phones
// that sleep / drop connection rejoin their seat automatically.
const socketsByClient = new Map<string, string>()   // clientId → socket.id

io.on('connection', socket => {
  const cid: string = typeof socket.handshake.auth?.clientId === 'string' && socket.handshake.auth.clientId
    ? socket.handshake.auth.clientId
    : socket.id
  socketsByClient.set(cid, socket.id)
  console.log(`+ ${socket.id} (client ${cid})`)

  function socketFor(clientId: string) {
    const sid = socketsByClient.get(clientId)
    return sid ? io.sockets.sockets.get(sid) : undefined
  }

  function broadcastCampaign(code: string) {
    const info = roomInfo(code)
    if (!info) return
    const states = buildCampaignStates(code, info.players, info.hostId)
    states.forEach((state, playerId) => socketFor(playerId)?.emit('campaign_state', state))
  }

  function broadcast(states: Map<string, import('./types').ClientGameState>) {
    states.forEach((state, playerId) => socketFor(playerId)?.emit('game_state', state))
  }

  // ── Auto-rejoin: put a reconnecting client back into its rooms ─────────────
  for (const code of findRoomsByPlayer(cid)) {
    socket.join(code)
    markConnected(cid)
    const info = roomInfo(code)
    if (info) socket.emit('room_update', info)
    const game = gameStateFor(code, cid)
    if (game) socket.emit('game_state', game)
    if (getSession(code)) {
      const states = buildCampaignStates(code, info?.players ?? [], info?.hostId ?? '')
      const mine = states.get(cid)
      if (mine) socket.emit('campaign_state', mine)
    }
    console.log(`  ↩ ${cid} rejoined room ${code}`)
  }

  socket.on('create_room', ({ name }: { name: string }) => {
    const room = createRoom(cid, name)
    socket.join(room.code)
    socket.emit('room_update', room)
  })

  socket.on('join_room', ({ code, name }: { code: string; name: string }) => {
    const upper = code.toUpperCase()
    // returning member of a campaign room may rejoin; strangers may not
    if (getSession(upper)) {
      const info = roomInfo(upper)
      if (!info?.players.some(p => p.id === cid)) {
        socket.emit('error', 'A campaign is already in progress in that room.')
        return
      }
      socket.join(upper)
      markConnected(cid)
      socket.emit('room_update', info)
      broadcastCampaign(upper)
      return
    }
    const { room, error } = joinRoom(upper, cid, name)
    if (error) { socket.emit('error', error); return }
    socket.join(upper)
    io.to(upper).emit('room_update', room)
  })

  socket.on('get_room', ({ code }: { code: string }) => {
    const info = roomInfo(code)
    if (info) socket.emit('room_update', info)
  })

  socket.on('set_ready', ({ code, ready }: { code: string; ready: boolean }) => {
    const room = setReady(code, cid, ready)
    if (room) io.to(code).emit('room_update', room)
  })

  socket.on('start_game', ({ code }: { code: string }) => {
    const { states, error } = startGame(code, cid)
    if (error) { socket.emit('error', error); return }
    broadcast(states!)
  })

  socket.on('play_cards', ({ code, cardIndices }: { code: string; cardIndices: number[] }) => {
    const { states, error } = playCards(code, cid, cardIndices)
    if (error) { socket.emit('error', error); return }
    broadcast(states!)
  })

  socket.on('discard_damage', ({ code, cardIndices }: { code: string; cardIndices: number[] }) => {
    const { states, error } = discardDamage(code, cid, cardIndices)
    if (error) { socket.emit('error', error); return }
    broadcast(states!)
  })

  socket.on('yield_turn', ({ code }: { code: string }) => {
    const { states, error } = yieldTurn(code, cid)
    if (error) { socket.emit('error', error); return }
    broadcast(states!)
  })

  socket.on('restart_game', ({ code }: { code: string }) => {
    const { room, error } = restartGame(code)
    if (error) { socket.emit('error', error); return }
    io.to(code).emit('room_update', room)
    io.to(code).emit('game_reset')
  })

  socket.on('choose_next', ({ code, targetIndex }: { code: string; targetIndex: number }) => {
    const { states, error } = chooseNext(code, cid, targetIndex)
    if (error) { socket.emit('error', error); return }
    broadcast(states!)
  })

  // ── Campaign mode ──────────────────────────────────────────────────────────

  socket.on('list_campaigns', () => {
    socket.emit('campaign_saves', { saves: getSaves(), kingdom: getKingdom() })
  })

  socket.on('start_campaign', ({ code, chapter, seed, runName, record }: { code: string; chapter: number; seed?: string; runName?: string; record?: boolean }) => {
    const info = roomInfo(code)
    if (!info) { socket.emit('error', 'Room not found.'); return }
    if (info.hostId !== cid) { socket.emit('error', 'Only the host can start a campaign.'); return }
    const { error } = startCampaignSession(code, info.players.map(p => ({ id: p.id, name: p.name })), (chapter === 2 ? 2 : 1), seed, { runName, record })
    if (error) { socket.emit('error', error); return }
    broadcastCampaign(code)
  })

  socket.on('start_tutorial', ({ code }: { code: string }) => {
    const info = roomInfo(code)
    if (!info) { socket.emit('error', 'Room not found.'); return }
    if (info.hostId !== cid) { socket.emit('error', 'Only the host can start the tutorial.'); return }
    const { error } = startTutorialSession(code, info.players.map(p => ({ id: p.id, name: p.name })))
    if (error) { socket.emit('error', error); return }
    broadcastCampaign(code)
  })

  socket.on('resume_campaign', ({ code, campaignId }: { code: string; campaignId: string }) => {
    const info = roomInfo(code)
    if (!info) { socket.emit('error', 'Room not found.'); return }
    if (info.hostId !== cid) { socket.emit('error', 'Only the host can resume a campaign.'); return }
    const { error } = resumeCampaignSession(code, campaignId, info.players.map(p => ({ id: p.id, name: p.name })))
    if (error) { socket.emit('error', error); return }
    broadcastCampaign(code)
  })

  socket.on('campaign_action', ({ code, action }: { code: string; action: CampaignAction }) => {
    const info = roomInfo(code)
    if (!info) { socket.emit('error', 'Room not found.'); return }
    const { error } = dispatchCampaignAction(code, cid, info.hostId, action)
    if (error) { socket.emit('error', error); return }
    if (action.type === 'abandon_campaign') {
      io.to(code).emit('campaign_ended')
      io.to(code).emit('room_update', roomInfo(code))
      return
    }
    broadcastCampaign(code)
  })

  socket.on('leave_room', ({ code }: { code: string }) => {
    const info = roomInfo(code)
    if (!info) { socket.emit('room_closed'); return }
    if (info.hostId === cid) {
      // host kills the room for everyone (campaign progress stays saved on disk)
      endSession(code)
      deleteRoom(code)
      io.to(code).emit('room_closed')
      io.in(code).socketsLeave(code)
    } else {
      const remaining = leaveRoom(code, cid)
      socket.leave(code)
      socket.emit('room_closed')
      if (remaining) io.to(code).emit('room_update', remaining)
    }
  })

  socket.on('end_campaign_session', ({ code }: { code: string }) => {
    const info = roomInfo(code)
    if (info?.hostId === cid) {
      endSession(code)
      io.to(code).emit('campaign_ended')
      io.to(code).emit('room_update', roomInfo(code))
    }
  })

  // Run again: from an ended run (or any time), the host spins up a brand-new
  // lineage for the SAME lobby in one tap — fresh seed, chapter 1, same party.
  // Carries over the previous run's stats-recording preference.
  socket.on('restart_campaign', ({ code }: { code: string }) => {
    const info = roomInfo(code)
    if (!info) { socket.emit('error', 'Room not found.'); return }
    if (info.hostId !== cid) { socket.emit('error', 'Only the host can start a new run.'); return }
    const record = getSession(code) ? getSession(code)!.recordRun !== false : true
    endSession(code)
    const { error } = startCampaignSession(code, info.players.map(p => ({ id: p.id, name: p.name })), 1, undefined, { record })
    if (error) { socket.emit('error', error); return }
    broadcastCampaign(code)
  })

  socket.on('disconnect', () => {
    console.log(`- ${socket.id} (client ${cid})`)
    // only forget the mapping if a newer connection hasn't replaced it
    if (socketsByClient.get(cid) === socket.id) socketsByClient.delete(cid)
    // keep seats in rooms with an active campaign OR an active quick game;
    // pure lobbies still drop the player (they can simply rejoin)
    playerDisconnect(cid, code => !!getSession(code))
  })
})

const PORT = process.env.PORT ?? 3001
http.listen(PORT, () => console.log(`Regicide server on :${PORT}`))
