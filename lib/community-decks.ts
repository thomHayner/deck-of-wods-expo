import type { DeckConfig } from './deck-config'

export interface CommunityDeck {
  /** Stable slug — used as a React key and for saved-state tracking. */
  id: string
  name: string
  description: string
  /** Display name of the creator / curator. */
  author: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  config: DeckConfig
}

const ALL_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
const CARD_VALUE_MODE = { kind: 'card-value' } as const

// ─────────────────────────────────────────────────────────────────────────────
// Deck 1 — Classic Bodyweight
// ─────────────────────────────────────────────────────────────────────────────
const CLASSIC_BODYWEIGHT: CommunityDeck = {
  id: 'classic-bodyweight',
  name: 'Classic Bodyweight',
  description:
    'The essential deck. Four classic bodyweight moves — one per suit — with reps matching the card value.',
  author: 'Deck of WODs',
  tags: ['Beginner', 'Bodyweight', 'Full Body'],
  difficulty: 'beginner',
  config: {
    name: 'Classic Bodyweight',
    format: 'standard',
    includeJokers: false,
    jokerCount: 2,
    groups: [
      {
        id: 'cb-hearts',
        values: ALL_VALUES,
        repsMode: CARD_VALUE_MODE,
        assignment: { kind: 'per-suit', exercise: 'Push-ups', suit: 'hearts' },
      },
      {
        id: 'cb-diamonds',
        values: ALL_VALUES,
        repsMode: CARD_VALUE_MODE,
        assignment: { kind: 'per-suit', exercise: 'Squats', suit: 'diamonds' },
      },
      {
        id: 'cb-clubs',
        values: ALL_VALUES,
        repsMode: CARD_VALUE_MODE,
        assignment: { kind: 'per-suit', exercise: 'Sit-ups', suit: 'clubs' },
      },
      {
        id: 'cb-spades',
        values: ALL_VALUES,
        repsMode: CARD_VALUE_MODE,
        assignment: { kind: 'per-suit', exercise: 'Burpees', suit: 'spades' },
      },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Deck 2 — Kettlebell Conditioning
// ─────────────────────────────────────────────────────────────────────────────
const KETTLEBELL_CONDITIONING: CommunityDeck = {
  id: 'kettlebell-conditioning',
  name: 'Kettlebell Conditioning',
  description:
    'Four kettlebell staples mapped to each suit. Pair a single bell with this deck for a complete conditioning session.',
  author: 'Deck of WODs',
  tags: ['Intermediate', 'Kettlebell', 'Full Body'],
  difficulty: 'intermediate',
  config: {
    name: 'Kettlebell Conditioning',
    format: 'standard',
    includeJokers: false,
    jokerCount: 2,
    groups: [
      {
        id: 'kb-hearts',
        values: ALL_VALUES,
        repsMode: CARD_VALUE_MODE,
        assignment: { kind: 'per-suit', exercise: 'KB Swings', suit: 'hearts' },
      },
      {
        id: 'kb-diamonds',
        values: ALL_VALUES,
        repsMode: CARD_VALUE_MODE,
        assignment: { kind: 'per-suit', exercise: 'Goblet Squats', suit: 'diamonds' },
      },
      {
        id: 'kb-clubs',
        values: ALL_VALUES,
        repsMode: CARD_VALUE_MODE,
        assignment: { kind: 'per-suit', exercise: 'KB Clean & Press', suit: 'clubs' },
      },
      {
        id: 'kb-spades',
        values: ALL_VALUES,
        repsMode: CARD_VALUE_MODE,
        assignment: { kind: 'per-suit', exercise: 'KB Rows', suit: 'spades' },
      },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Deck 3 — Chipper Challenge
// ─────────────────────────────────────────────────────────────────────────────
const CHIPPER_CHALLENGE: CommunityDeck = {
  id: 'chipper-challenge',
  name: 'Chipper Challenge',
  description:
    'A deck built for pain. Heavy barbell work mapped to each suit, with Jokers sending you out for a 400m run.',
  author: 'Deck of WODs',
  tags: ['Advanced', 'CrossFit', 'Full Body'],
  difficulty: 'advanced',
  config: {
    name: 'Chipper Challenge',
    format: 'standard',
    includeJokers: true,
    jokerCount: 2,
    groups: [
      {
        id: 'cc-hearts',
        values: ALL_VALUES,
        repsMode: CARD_VALUE_MODE,
        assignment: { kind: 'per-suit', exercise: 'Thrusters', suit: 'hearts' },
      },
      {
        id: 'cc-diamonds',
        values: ALL_VALUES,
        repsMode: CARD_VALUE_MODE,
        assignment: { kind: 'per-suit', exercise: 'Box Jumps', suit: 'diamonds' },
      },
      {
        id: 'cc-clubs',
        values: ALL_VALUES,
        repsMode: CARD_VALUE_MODE,
        assignment: { kind: 'per-suit', exercise: 'Toes-to-Bar', suit: 'clubs' },
      },
      {
        id: 'cc-spades',
        values: ALL_VALUES,
        repsMode: CARD_VALUE_MODE,
        assignment: { kind: 'per-suit', exercise: 'Deadlifts', suit: 'spades' },
      },
      {
        id: 'cc-joker',
        values: [0],
        repsMode: { kind: 'fixed', reps: 1 },
        assignment: { kind: 'all-suits', exercise: '400m Run' },
      },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported registry
// ─────────────────────────────────────────────────────────────────────────────
export const COMMUNITY_DECKS: CommunityDeck[] = [
  CLASSIC_BODYWEIGHT,
  KETTLEBELL_CONDITIONING,
  CHIPPER_CHALLENGE,
]
