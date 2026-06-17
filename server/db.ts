// Optional Postgres sink for finished runs. Enabled ONLY when DATABASE_URL is set
// (Render Postgres / Supabase / Neon — any standard Postgres connection string).
// In local dev (no DATABASE_URL) this is a no-op and the CSV files written by
// human-runs.ts remain the source of truth.
//
// Why this exists: Render's web-service filesystem is ephemeral (wiped on every
// deploy/restart), so the on-disk CSV/JSONL telemetry does NOT survive in prod —
// the database does.
//
// Safety: pg is imported lazily (a missing module or DB outage never crashes the
// server), every call is async, and callers fire-and-forget, so a DB hiccup can
// never block or break gameplay. The CSV append still happens regardless.

let poolPromise: Promise<unknown> | null = null
let schemaReady: Promise<void> | null = null
let warned = false

export function dbEnabled(): boolean {
  return !!process.env.DATABASE_URL
}

async function getPool(): Promise<any | null> {
  if (!process.env.DATABASE_URL) return null
  if (!poolPromise) {
    poolPromise = (async () => {
      const pg: any = await import('pg')
      const Pool = pg.Pool ?? pg.default?.Pool
      const url = process.env.DATABASE_URL!
      const pool = new Pool({
        connectionString: url,
        // managed Postgres (Render/Supabase/Neon) requires TLS; local does not
        ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
        max: 4,
      })
      pool.on('error', (e: any) => console.error('[db] pool error:', e?.message ?? e))
      return pool
    })().catch(e => { poolPromise = null; throw e })
  }
  return poolPromise as Promise<any>
}

// Promoted columns are the ones worth querying directly; the full row is kept in
// `data` (JSONB) so new telemetry fields need no migration.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS runs (
  id              BIGSERIAL PRIMARY KEY,
  run_id          TEXT,
  kind            TEXT,
  name            TEXT,
  seed            TEXT,
  player_count    INTEGER,
  result          TEXT,
  chapter_reached INTEGER,
  classes         TEXT,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  data            JSONB,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS runs_kind_idx ON runs (kind);
CREATE INDEX IF NOT EXISTS runs_recorded_idx ON runs (recorded_at);
`

async function ensureSchema(pool: any): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(SCHEMA).then(() => undefined).catch((e: unknown) => { schemaReady = null; throw e })
  }
  return schemaReady
}

const numOrNull = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null }
const strOrNull = (v: unknown) => (v === undefined || v === null || v === '' ? null : String(v))

/** Insert one finished run. `kind` is 'runs' (campaign) or 'quick'. */
export async function insertRun(kind: string, row: Record<string, unknown>): Promise<void> {
  const pool = await getPool()
  if (!pool) return
  try {
    await ensureSchema(pool)
    await pool.query(
      `INSERT INTO runs (run_id, kind, name, seed, player_count, result, chapter_reached, classes, started_at, ended_at, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        strOrNull(row.runId), kind, strOrNull(row.name), strOrNull(row.seed),
        numOrNull(row.playerCount), strOrNull(row.result), numOrNull(row.chapterReached),
        strOrNull(row.classes), strOrNull(row.startedAt), strOrNull(row.endedAt),
        JSON.stringify(row),
      ],
    )
  } catch (e: any) {
    // log once so a misconfigured DB doesn't spam, but keep CSV as the fallback
    if (!warned) { console.error('[db] run insert failed (CSV still written):', e?.message ?? e); warned = true }
    throw e
  }
}
