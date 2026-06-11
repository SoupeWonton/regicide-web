// Balance experiment toggles. Default off = canon rules; the sim flips these
// via CLI flags (scripts/sim.ts --owner-only / --boss-reshuffle) so live play
// is never affected.
export const EXPERIMENTS = {
  // B2/B3 alternative reading: quartermaster / surgeon / executioner triggers
  // fire only on the owning hero's own play. (Sentinel is already owner-only.)
  ownerOnlyClassTriggers: false,
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
  // LIVE for playtesting (2026-06-11, Gab) — smoke.ts pins canon for tests.
  provinceMode: true,
}

// Class curation (province mode): each suited class removes its N lowest
// own-suit cards at deck build — quality up, total runway down. N scales
// down with party size so the communal deck isn't shredded.
export const CURATION_CUT: Record<number, number> = { 1: 4, 2: 3, 3: 2, 4: 2 }
