// Bot persona weight profiles shared by the campaign simulator (sim.ts) and
// the base-game simulator (sim-base.ts). Same values, same decision logic —
// the game mode is the experiment variable.

import type { ClassId, CtCategory } from '../campaign/types'

export interface Persona {
  id: string
  // play-phase scoring (per unit)
  aggression: number       // per point of damage dealt (capped near lethal)
  killBonus: number        // flat for landing a kill (tempo: no counterattack)
  exactBonus: number       // flat for an exact kill (card refund + procs)
  shieldWeight: number     // per point of shield added while enemy survives
  drawWeight: number       // per card drawn (Diamonds)
  recoverWeight: number    // per card recovered to Tavern (Hearts)
  conserve: number         // penalty per point of card value spent
  riskAversion: number     // multiplier on expected counterattack cost
  yieldBias: number        // additive bonus on the yield option
  // recruit economy (road canon 2026-06-11: exact kill recruits the royal,
  // overkill banishes it forever — gates exempt)
  banishAversion: number   // penalty per point of royal value banished by an overkill
  setupWeight: number      // bonus for leaving the enemy at an HP the remaining hand can hit exactly
  // strategy
  routeGreed: number       // appetite for high-reward nodes
  routeFight: number       // appetite for combat in general
  routeSafety: number      // appetite for camps/landmarks, scaled by fatigue
  catPrefs: Record<CtCategory, number>
  rarePref: number
  spellEagerness: number   // 0..1 gate for burning spells/relics/wagers
  lastStandBase: number    // 0..1 base desire to fight on after a death
  classPref: ClassId[]     // pick order (start + replacements)
}

const CATS = (s: number, a: number, r: number, i: number, c: number): Record<CtCategory, number> =>
  ({ Shield: s, Access: a, Recovery: r, Initiative: i, Consistency: c })

export const PERSONAS: Record<string, Persona> = {
  // damage above all: biggest plays, greedy routes, fights to the end.
  // Risk style: a dead royal is a dead royal — barely mourns a banish.
  slayer: {
    id: 'slayer', aggression: 1.6, killBonus: 10, exactBonus: 3, shieldWeight: 0.4,
    drawWeight: 0.6, recoverWeight: 0.3, conserve: 0.15, riskAversion: 0.6, yieldBias: -4,
    banishAversion: 0.15, setupWeight: 0.3,
    routeGreed: 1.4, routeFight: 1.2, routeSafety: 0.4,
    catPrefs: CATS(0.3, 0.8, 0.3, 1.5, 0.4), rarePref: 1.0, spellEagerness: 0.85, lastStandBase: 0.75,
    classPref: ['executioner', 'sentinel', 'quartermaster', 'surgeon', 'commander', 'gambler', 'warden', 'oracle', 'exile'],
  },
  // survival above all: shields, safe routes, retreats early.
  // Risk style: wants the recruit but never trades safety for it — the high
  // riskAversion vetoes setup lines that eat a real counterattack.
  bulwark: {
    id: 'bulwark', aggression: 0.8, killBonus: 7, exactBonus: 2, shieldWeight: 1.6,
    drawWeight: 0.7, recoverWeight: 0.6, conserve: 0.4, riskAversion: 1.8, yieldBias: 1,
    banishAversion: 0.4, setupWeight: 0.6,
    routeGreed: 0.5, routeFight: 0.5, routeSafety: 1.5,
    catPrefs: CATS(1.6, 0.6, 0.9, 0.3, 0.6), rarePref: 0.6, spellEagerness: 0.4, lastStandBase: 0.2,
    classPref: ['sentinel', 'surgeon', 'quartermaster', 'executioner', 'warden', 'commander', 'oracle', 'exile', 'gambler'],
  },
  // card economy above all: draws, recovery, minimal-waste spending.
  // Risk style: a recruit IS card economy — hates banishing value.
  hoarder: {
    id: 'hoarder', aggression: 0.9, killBonus: 7, exactBonus: 4, shieldWeight: 0.8,
    drawWeight: 1.5, recoverWeight: 1.3, conserve: 0.7, riskAversion: 1.1, yieldBias: 0,
    banishAversion: 0.9, setupWeight: 1.1,
    routeGreed: 0.9, routeFight: 0.6, routeSafety: 1.2,
    catPrefs: CATS(0.5, 1.6, 1.3, 0.3, 0.7), rarePref: 0.9, spellEagerness: 0.25, lastStandBase: 0.4,
    classPref: ['quartermaster', 'surgeon', 'sentinel', 'executioner', 'oracle', 'commander', 'warden', 'exile', 'gambler'],
  },
  // tempo precision: hunts exact kills when they're on the table, spends little.
  // Risk style: strongly prefers exact over overkill but won't slow down for it.
  sniper: {
    id: 'sniper', aggression: 1.0, killBonus: 9, exactBonus: 9, shieldWeight: 0.7,
    drawWeight: 0.8, recoverWeight: 0.5, conserve: 0.5, riskAversion: 1.0, yieldBias: -1,
    banishAversion: 1.0, setupWeight: 1.5,
    routeGreed: 1.0, routeFight: 0.8, routeSafety: 0.8,
    catPrefs: CATS(0.5, 0.7, 0.5, 1.3, 1.2), rarePref: 1.0, spellEagerness: 0.6, lastStandBase: 0.5,
    classPref: ['executioner', 'quartermaster', 'sentinel', 'surgeon', 'oracle', 'commander', 'gambler', 'warden', 'exile'],
  },
  // control group: middle of the road everywhere.
  steady: {
    id: 'steady', aggression: 1.1, killBonus: 8, exactBonus: 4, shieldWeight: 1.0,
    drawWeight: 1.0, recoverWeight: 0.8, conserve: 0.35, riskAversion: 1.0, yieldBias: -1,
    banishAversion: 0.5, setupWeight: 0.8,
    routeGreed: 1.0, routeFight: 0.8, routeSafety: 1.0,
    catPrefs: CATS(1.0, 1.0, 1.0, 1.0, 1.0), rarePref: 0.8, spellEagerness: 0.55, lastStandBase: 0.45,
    classPref: ['sentinel', 'executioner', 'quartermaster', 'surgeon', 'commander', 'warden', 'oracle', 'gambler', 'exile'],
  },
  // recruit-era precision (docs/design/items/the-bar.md M-protocol persona): engineers exact
  // kills — chips the enemy onto a number the remaining hand can hit exactly,
  // eats a survivable counterattack to do it, and treats a banished royal as
  // real lost value. Risk style: patient, not suicidal — when the counter
  // would kill or the hand can't reach any exact line, it takes the overkill.
  precision: {
    id: 'precision', aggression: 0.8, killBonus: 7, exactBonus: 10, shieldWeight: 0.9,
    drawWeight: 0.9, recoverWeight: 0.7, conserve: 0.45, riskAversion: 1.0, yieldBias: -1,
    banishAversion: 1.4, setupWeight: 2.2,
    routeGreed: 1.0, routeFight: 0.8, routeSafety: 0.9,
    catPrefs: CATS(0.7, 0.8, 0.7, 1.4, 1.3), rarePref: 1.0, spellEagerness: 0.6, lastStandBase: 0.5,
    classPref: ['executioner', 'sentinel', 'quartermaster', 'surgeon', 'oracle', 'commander', 'gambler', 'warden', 'exile'],
  },
}

export const MIXED_ORDER = ['slayer', 'bulwark', 'hoarder', 'sniper']
