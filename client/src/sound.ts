// Procedural sound: every effect is synthesized (oscillators + filtered
// noise), no audio files. Autoplay-safe — the context is created lazily and
// resumed on the first user-gesture-driven call; calls before that no-op.

let ctx: AudioContext | null = null
let master: GainNode | null = null

export const sound = {
  muted: localStorage.getItem('regicide-muted') === '1',
}

export function toggleMute(): boolean {
  sound.muted = !sound.muted
  localStorage.setItem('regicide-muted', sound.muted ? '1' : '0')
  return sound.muted
}

function ac(): AudioContext | null {
  if (sound.muted) return null
  if (!ctx) {
    try {
      ctx = new AudioContext()
      master = ctx.createGain()
      master.gain.value = 0.55
      master.connect(ctx.destination)
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx.state === 'running' || ctx.state === 'suspended' ? ctx : null
}

let noiseBuf: AudioBuffer | null = null
function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

// one enveloped oscillator
function tone(opts: {
  type?: OscillatorType
  from: number
  to?: number
  dur: number
  vol?: number
  delay?: number
  curve?: 'exp' | 'lin'
}) {
  const c = ac()
  if (!c || !master) return
  const t0 = c.currentTime + (opts.delay ?? 0)
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = opts.type ?? 'sine'
  o.frequency.setValueAtTime(opts.from, t0)
  if (opts.to !== undefined) {
    if (opts.curve === 'lin') o.frequency.linearRampToValueAtTime(opts.to, t0 + opts.dur)
    else o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.dur)
  }
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(opts.vol ?? 0.2, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur)
  o.connect(g).connect(master)
  o.start(t0)
  o.stop(t0 + opts.dur + 0.02)
}

// enveloped filtered noise burst
function hiss(opts: {
  dur: number
  vol?: number
  delay?: number
  filter?: BiquadFilterType
  freq?: number
  freqTo?: number
  q?: number
}) {
  const c = ac()
  if (!c || !master) return
  const t0 = c.currentTime + (opts.delay ?? 0)
  const src = c.createBufferSource()
  src.buffer = noise(c)
  const f = c.createBiquadFilter()
  f.type = opts.filter ?? 'bandpass'
  f.frequency.setValueAtTime(opts.freq ?? 1200, t0)
  if (opts.freqTo) f.frequency.exponentialRampToValueAtTime(opts.freqTo, t0 + opts.dur)
  f.Q.value = opts.q ?? 0.9
  const g = c.createGain()
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(opts.vol ?? 0.15, t0 + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur)
  src.connect(f).connect(g).connect(master)
  src.start(t0, Math.random() * 0.2)
  src.stop(t0 + opts.dur + 0.02)
}

// a trumpet "bam": detuned sawtooth pair + a quiet sub-octave for body
function brass(freq: number, dur: number, delay: number, vol = 0.12) {
  tone({ type: 'sawtooth', from: freq, dur, vol, delay })
  tone({ type: 'sawtooth', from: freq * 1.006, dur, vol: vol * 0.55, delay })
  tone({ type: 'square', from: freq / 2, dur, vol: vol * 0.3, delay })
}

// ── The game's voice ─────────────────────────────────────────────────────────

export const sfx = {
  /** picking a card up off the fan */
  cardSnap() {
    hiss({ dur: 0.05, vol: 0.12, filter: 'highpass', freq: 3500 })
    tone({ type: 'triangle', from: 2200, to: 1600, dur: 0.04, vol: 0.05 })
  },
  /** cards hitting the table */
  cardPlay() {
    hiss({ dur: 0.14, vol: 0.2, filter: 'bandpass', freq: 700, freqTo: 2600 })
    tone({ type: 'sine', from: 150, to: 70, dur: 0.12, vol: 0.18 })
  },
  /** damage lands */
  damage(big = false) {
    tone({ type: 'sine', from: big ? 200 : 160, to: big ? 48 : 60, dur: big ? 0.22 : 0.15, vol: big ? 0.4 : 0.26 })
    hiss({ dur: 0.1, vol: big ? 0.22 : 0.13, filter: 'lowpass', freq: 900 })
  },
  /** spades clink onto the shield */
  shield() {
    tone({ type: 'triangle', from: 880, dur: 0.12, vol: 0.1 })
    tone({ type: 'triangle', from: 1318, dur: 0.16, vol: 0.07, delay: 0.02 })
  },
  /** paper draw / recovery */
  draw() {
    hiss({ dur: 0.08, vol: 0.09, filter: 'highpass', freq: 2400 })
  },
  /** an enemy falls */
  kill() {
    tone({ type: 'sine', from: 120, to: 50, dur: 0.2, vol: 0.3 })
    tone({ type: 'triangle', from: 784, dur: 0.18, vol: 0.12, delay: 0.08 })
    tone({ type: 'triangle', from: 1046, dur: 0.22, vol: 0.1, delay: 0.16 })
  },
  /** exact kill — the royal slides under the tavern */
  exactKill() {
    for (const [i, f] of [659, 784, 988, 1318].entries())
      tone({ type: 'triangle', from: f, dur: 0.25, vol: 0.11, delay: i * 0.07 })
  },
  /** counterattack incoming */
  counter() {
    tone({ type: 'sawtooth', from: 110, to: 70, dur: 0.22, vol: 0.16 })
    hiss({ dur: 0.18, vol: 0.12, filter: 'bandpass', freq: 300, freqTo: 150 })
  },
  /** a hero dies */
  death() {
    tone({ type: 'sine', from: 90, to: 38, dur: 1.1, vol: 0.35 })
    hiss({ dur: 0.7, vol: 0.1, filter: 'lowpass', freq: 500, freqTo: 120 })
  },
  /** ability / item proc sparkle */
  proc() {
    tone({ type: 'triangle', from: 1568, dur: 0.09, vol: 0.07 })
    tone({ type: 'triangle', from: 2093, dur: 0.12, vol: 0.05, delay: 0.05 })
  },
  /** a new royal steps forward */
  reveal() {
    hiss({ dur: 0.2, vol: 0.14, filter: 'bandpass', freq: 500, freqTo: 1800 })
    tone({ type: 'sine', from: 70, to: 110, dur: 0.18, vol: 0.12, curve: 'lin' })
  },
  /** spell / relic / wager — arcane shimmer */
  arcane() {
    for (const [i, f] of [523, 740, 1047].entries())
      tone({ type: 'sine', from: f, to: f * 1.06, dur: 0.3, vol: 0.07, delay: i * 0.05 })
  },
  /** encounter cleared — victory trumpets: bam bam bam baaaam, bam bam baaam */
  victory() {
    const C5 = 523.25, Ab4 = 415.3, Bb4 = 466.16
    brass(C5, 0.11, 0)            // bam
    brass(C5, 0.11, 0.15)         // bam
    brass(C5, 0.11, 0.30)         // bam
    brass(C5, 0.5, 0.45, 0.15)    // baaaam
    brass(Ab4, 0.3, 1.0)          // bam
    brass(Bb4, 0.3, 1.3)          // bam
    brass(C5, 0.75, 1.6, 0.16)    // baaaam
  },
  /** a BOSS falls — the same trumpets, but the whole brass section */
  triumph() {
    const C5 = 523.25, Ab4 = 415.3, Bb4 = 466.16, E5 = 659.25, G5 = 783.99
    brass(C5, 0.11, 0)
    brass(C5, 0.11, 0.15)
    brass(C5, 0.11, 0.30)
    brass(C5, 0.5, 0.45, 0.16)
    brass(Ab4, 0.3, 1.0)
    brass(Bb4, 0.3, 1.3)
    // final chord — held, with the section joining in
    brass(C5, 1.2, 1.6, 0.15)
    brass(E5, 1.2, 1.66, 0.1)
    brass(G5, 1.2, 1.72, 0.09)
    // low brass swell under it all
    tone({ type: 'sawtooth', from: 130.8, dur: 1.4, vol: 0.07 })
    tone({ type: 'sawtooth', from: 130.8, dur: 1.5, vol: 0.08, delay: 1.6 })
    // shimmer tail
    hiss({ dur: 1.1, vol: 0.05, filter: 'highpass', freq: 5000, delay: 1.7 })
  },
  /** committing to a road node — boots on gravel */
  footsteps() {
    for (let i = 0; i < 3; i++)
      hiss({ dur: 0.07, vol: 0.1 - i * 0.02, filter: 'lowpass', freq: 700, delay: i * 0.14 })
  },
  /** generic UI tick */
  click() {
    tone({ type: 'triangle', from: 1200, to: 900, dur: 0.05, vol: 0.06 })
  },
}
