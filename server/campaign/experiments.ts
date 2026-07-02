// Balance experiment toggles. V3.0 cutover (slice 9): `ascendingDeck` is the
// SINGLE default — no longer a toggle (the non-ascending offer branches, the
// province prototype and its `provinceMode` flag + CURATION_CUT are deleted).
// The remaining guards that read it are constant-true; collapsing them
// textually is a deferred hygiene pass (⚑ BUILD-STATUS slice 9 note).
export const EXPERIMENTS = {
  // V3.0 — THE game mode (cutover 2026-07-02). Pinned true; do not flip.
  ascendingDeck: true,

  // Entering a boss encounter performs a full camp-style rest first
  // (discard + hands reshuffled into the Tavern, hands redrawn).
  preBossReshuffle: false,
  // Hearts recover double inside boss fights (intra-fight attrition relief).
  castleHearts: false,
  // The castle fields 3 suits per rank instead of 4 (9 royals, not 12).
  shortCastle: false,
  // Gates sweep the party forward without a route choice (random on forks).
  // OFF for now (2026-06-11, Gab): players keep agency after a gate falls.
  autoMarchAfterGates: false,
}
