// Balance experiment toggles. Default off = canon rules; the sim flips these
// via CLI flags (scripts/sim.ts --owner-only / --boss-reshuffle) so live play
// is never affected.
export const EXPERIMENTS = {
  // ── Ascending Deck (Continents 1-2) — Step 5 (tokens) is now built; this is
  // the LIVE playtest mode (2026-06-14). Tokens, class signatures, the forge, and
  // the full ch1→Council→province arc are exercised by smoke Tests A-E. Smoke pins
  // it false for the canon/legacy tests. Set false to return to the province proto.
  // NOTE: runs paired with provinceMode:false (the tested ascending config).
  ascendingDeck: true,

  // (ownerOnlyClassTriggers was promoted to canon 2026-06-11 — playtest note:
  // "classes should only affect the player playing that class". B2/B3 settled.)
  // Entering a boss encounter performs a full camp-style rest first
  // (discard + hands reshuffled into the Tavern, hands redrawn).
  preBossReshuffle: false,
  // (midCastleRest was promoted to canon — see castle checkpoints in
  // encounter.ts resolveKill — after measuring wins 1%→15% / 5%→28%.)
  // Hearts recover double inside boss fights (intra-fight attrition relief).
  castleHearts: false,
  // The castle fields 3 suits per rank instead of 4 (9 royals, not 12).
  shortCastle: false,
  // Province prototype (2026-06-11 direction): one run = Gates → Courtyard →
  // Throne. The 12-royal castle is split across three rank fights (4 Jacks /
  // 4 Queens / 4 Kings) with road acts between them. Any hero death = full
  // run reset. Classes curate the deck at setup (option B) instead of siege
  // ultimates. Castle checkpoint off (the roads between ranks are the rest).
  // Province prototype — superseded as the LIVE mode by ascendingDeck (2026-06-14),
  // which reuses province machinery for its Continent 2. Paired OFF with the
  // ascending playtest (the config smoke Tests A-E/D validate). Flip both to return
  // to the standalone province prototype.
  provinceMode: false,
  // Gates sweep the party forward without a route choice (random on forks).
  // OFF for now (2026-06-11, Gab): players keep agency after a gate falls.
  autoMarchAfterGates: false,
}

// Class curation (province mode): each suited class removes its N lowest
// own-suit cards at deck build — quality up, total runway down. N scales
// down with party size so the communal deck isn't shredded.
export const CURATION_CUT: Record<number, number> = { 1: 4, 2: 3, 3: 2, 4: 2 }
