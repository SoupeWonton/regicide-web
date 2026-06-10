// Deterministic seeded RNG (mulberry32). Campaign canon requires deterministic seeds.
// State is a plain number so it can be serialized into campaign saves.

export interface Rng {
  next(): number                 // [0, 1)
  int(maxExclusive: number): number
  pick<T>(arr: T[]): T
  shuffle<T>(arr: T[]): T[]
  state(): number
}

export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

export function createRng(seedOrState: string | number): Rng {
  let a = typeof seedOrState === 'string' ? hashSeed(seedOrState) : seedOrState >>> 0

  function next(): number {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    int: (max: number) => Math.floor(next() * max),
    pick: <T>(arr: T[]): T => arr[Math.floor(next() * arr.length)]!,
    shuffle<T>(arr: T[]): T[] {
      const out = [...arr]
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[out[i], out[j]] = [out[j]!, out[i]!]
      }
      return out
    },
    state: () => a >>> 0,
  }
}
