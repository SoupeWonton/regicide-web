// Road events — non-battle happenings with real run impact, resolved through
// the choice picker. TEST-GRADE content (2026-06-11): these exercise the
// mechanic space (deck thinning, card creation, suit chaos, trades) and are
// deliberately not balanced yet.

export interface RunEventOption {
  id: string
  label: string
  detail?: string
}

export interface RunEvent {
  id: string
  name: string
  prompt: string
  options: RunEventOption[]
}

export const RUN_EVENTS: RunEvent[] = [
  {
    id: 'bonepicker',
    name: 'The Bonepicker',
    prompt: 'A gaunt figure picks through battle refuse. “Your deck carries dead weight, friends. I eat dead weight.”',
    options: [
      { id: 'cull', label: 'Let him feed', detail: 'The 4 lowest-value Tavern cards are devoured — gone for the chapter.' },
      { id: 'refuse', label: 'Keep walking', detail: 'He sulks. Nothing happens.' },
    ],
  },
  {
    id: 'counterfeiter',
    name: 'The Counterfeiter',
    prompt: 'A printing press on a cart, inks still wet. “Royal denominations a specialty. Quality... negotiable.”',
    options: [
      { id: 'commission', label: 'Commission forgeries', detail: 'Two counterfeit 10s (random suits) are shuffled into the Tavern.' },
      { id: 'small-bills', label: 'Ask for small bills', detail: 'Three counterfeit 5s (random suits) are shuffled into the Tavern.' },
      { id: 'report', label: 'Tip the guard', detail: 'Nothing enters the deck. He’ll remember you.' },
    ],
  },
  {
    id: 'chaos-font',
    name: 'The Chaos Font',
    prompt: 'A spring bubbles with colour-shifting water. Drinking it does something to the cards you carry. Nobody agrees what.',
    options: [
      { id: 'drink', label: 'Drink deep', detail: 'Every Tavern card of one random suit shifts to another random suit.' },
      { id: 'sip', label: 'Take a sip', detail: '3 random Tavern cards shift to random suits.' },
      { id: 'bottle', label: 'Bottle it for later', detail: 'The bottle leaks. Nothing happens.' },
    ],
  },
  {
    id: 'whetstone',
    name: 'The Wandering Whetstone',
    prompt: 'A grindstone-monk offers to hone your arsenal. “Everything sharpens. Everything thins.”',
    options: [
      { id: 'hone', label: 'Hone the blades', detail: '3 random Tavern cards below 10 are sharpened: +1 value each.' },
      { id: 'temper', label: 'Temper one edge', detail: 'Your single lowest Tavern card becomes a 10 of its suit.' },
      { id: 'decline', label: 'Decline politely', detail: 'He nods. Nothing happens.' },
    ],
  },
  {
    id: 'tithe',
    name: 'The Tithe Collector',
    prompt: 'A robed clerk with a ledger that already knows your names. “The crown taxes passage. The crown rewards... compliance.”',
    options: [
      { id: 'pay', label: 'Pay the tithe', detail: 'Each hero discards their highest card; the team gains a random rare spell.' },
      { id: 'haggle', label: 'Haggle', detail: 'The starting hero discards 1 random card; the team gains a random standard spell.' },
      { id: 'stiff', label: 'Stiff the crown', detail: 'Nothing happens. Probably.' },
    ],
  },
]
