export interface ClassDef {
  id: string
  name: string
  theme: string
  suit: string
  question: string
  text: string
  pillars: [string, number][]
  accent: string
}

export const CLASS_DEFS: ClassDef[] = [
  {
    id: 'sentinel', name: 'Sentinel', theme: 'Shield · Stability', suit: '♠',
    question: 'How do we survive tomorrow?',
    text: 'Once per enemy, your first Spade gains +2 shield value.',
    pillars: [['Shield', 3], ['Recovery', 1]],
    accent: 'sentinel-accent',
  },
  {
    id: 'quartermaster', name: 'Quartermaster', theme: 'Draw · Access', suit: '♦',
    question: 'How do we keep options?',
    text: 'Your first Diamond trigger each enemy draws +1 extra card.',
    pillars: [['Access', 3], ['Consistency', 1]],
    accent: 'quartermaster-accent',
  },
  {
    id: 'surgeon', name: 'Surgeon', theme: 'Recovery · Precision', suit: '♥',
    question: 'How do we recover mistakes?',
    text: 'Your first Heart trigger each enemy recovers +1 additional card.',
    pillars: [['Recovery', 3], ['Consistency', 1]],
    accent: 'surgeon-accent',
  },
  {
    id: 'executioner', name: 'Executioner', theme: 'Thresholds · Initiative', suit: '♣',
    question: 'When should the enemy die?',
    text: 'Once per enemy, if your damage leaves the enemy at 1-2 HP, deal +2 finishing damage.',
    pillars: [['Initiative', 2], ['Consistency', 1]],
    accent: 'executioner-accent',
  },
  {
    id: 'commander', name: 'Commander', theme: 'Initiative · Sequencing', suit: '⚜',
    question: 'Who strikes next?',
    text: 'After your kill, pass the turn to any ally — and draw 1 card.',
    pillars: [['Initiative', 3], ['Access', 1]],
    accent: 'commander-accent',
  },
  {
    id: 'warden', name: 'Warden', theme: 'Death Mitigation', suit: '🕯',
    question: 'Who carries the fallen?',
    text: "Vigil: once per act, your collapse does not spend the party's second wind.",
    pillars: [['Shield', 2], ['Recovery', 2]],
    accent: 'warden-accent',
  },
  {
    id: 'gambler', name: 'Gambler', theme: 'Uncertainty · Tempo', suit: '🎲',
    question: 'What is it worth to you?',
    text: 'Once per chapter, wager: if the enemy dies this turn, draw 2 and choose who acts next; if not, lose a random card.',
    pillars: [['Initiative', 2], ['Access', 2]],
    accent: 'gambler-accent',
  },
  {
    id: 'oracle', name: 'Oracle', theme: 'Hidden Information', suit: '🔮',
    question: 'What does the road hide?',
    text: 'Peek the top 3 Tavern cards each encounter and reorder them. Foresight: your first play after a peek deals +1.',
    pillars: [['Consistency', 3], ['Initiative', 1]],
    accent: 'oracle-accent',
  },
  {
    id: 'exile', name: 'Exile', theme: 'Deck Evolution', suit: '🔥',
    question: 'What must be cut away?',
    text: 'Once per camp, exile one card from the deck for the rest of the chapter.',
    pillars: [['Consistency', 2], ['Recovery', 1]],
    accent: 'exile-accent',
  },
]
