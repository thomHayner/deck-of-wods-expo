/**
 * Flexible deck configuration types and helpers.
 *
 * A DeckConfig is made up of CardGroupConfigs — each group covers a set of
 * card values and defines which exercise(s) and reps mode apply.
 *
 * Examples:
 *   - All 2s → "Plyometric Upper", reps = card value
 *   - 10-A per suit → different exercise per suit, reps = card value
 *   - Jokers → "Isometric Plank", timed 30s
 */

import {
  type Suit,
  type Card,
  type CardSuit,
  getRepsForCard,
  getCardDisplayValue,
  DEFAULT_EXERCISES,
} from '@/lib/types'

// ── Format ────────────────────────────────────────────────────────────────────

/**
 * The base card set this deck is built from.
 * standard  — 52 cards, all 13 values, 1 copy per suit
 * pinochle  — 48 cards, 6 values (A/9/10/J/Q/K), 2 copies per suit
 * custom    — fully user-defined (any subset of values, any copy count)
 */
export type DeckFormat = 'standard' | 'pinochle' | 'custom'

export const STANDARD_VALID_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
export const PINOCHLE_VALID_VALUES  = [1, 9, 10, 11, 12, 13]   // A, 9, 10, J, Q, K

export function getValidValuesForFormat(format: DeckFormat): number[] {
  return format === 'pinochle' ? PINOCHLE_VALID_VALUES : STANDARD_VALID_VALUES
}

// ── Core types ────────────────────────────────────────────────────────────────

/**
 * How reps/work are prescribed for a card group.
 * card-value: reps = card face value (classic behavior)
 * fixed: same rep count for every card in the group
 * timed: hold for N seconds (planks, etc.) — not counted as reps
 */
export type FaceValues = {
  A?: number  // default 11
  J?: number  // default 10
  Q?: number  // default 10
  K?: number  // default 10
}

export type RepsMode =
  | { kind: 'card-value'; faceValues?: FaceValues; valueOffset?: number }
  | { kind: 'fixed'; reps: number }
  | { kind: 'timed'; seconds: number }

/**
 * Whether all suits in a group share one exercise, or the group targets one specific suit.
 */
export type ExerciseAssignment =
  | { kind: 'all-suits'; exercise: string; suits?: Suit[] }  // suits undefined = all four
  | { kind: 'per-suit'; exercise: string; suit: Suit }

/**
 * A set of card values that share the same exercise assignment and reps mode.
 * value 0 = Joker.
 */
export interface CardGroupConfig {
  id: string
  label?: string
  values: number[]
  repsMode: RepsMode
  assignment: ExerciseAssignment
}

/** The full configuration for a custom deck. */
export interface DeckConfig {
  name?: string
  /** Which base card set this deck uses. Undefined means 'custom'. */
  format?: DeckFormat
  groups: CardGroupConfig[]
  includeJokers: boolean
  /** Number of joker cards to include. Min 1, max 8. Default 2. */
  jokerCount: number
  /** How many copies of each non-joker card to include. Default 1; Pinochle uses 2. */
  copiesPerCard?: number
}

/** A Card with exercise and reps already resolved — used at workout time. */
export interface ResolvedCard extends Card {
  exercise: string
  repsMode: RepsMode
}

// ── Default config (reproduces classic 52-card behavior) ─────────────────────

const ALL_STANDARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

export const DEFAULT_DECK_CONFIG: DeckConfig = {
  name: 'Classic Deck',
  format: 'standard',
  groups: [
    { id: 'default-hearts',   values: ALL_STANDARD_VALUES, repsMode: { kind: 'card-value' }, assignment: { kind: 'per-suit', exercise: DEFAULT_EXERCISES.hearts.name,   suit: 'hearts'   } },
    { id: 'default-diamonds', values: ALL_STANDARD_VALUES, repsMode: { kind: 'card-value' }, assignment: { kind: 'per-suit', exercise: DEFAULT_EXERCISES.diamonds.name, suit: 'diamonds' } },
    { id: 'default-clubs',    values: ALL_STANDARD_VALUES, repsMode: { kind: 'card-value' }, assignment: { kind: 'per-suit', exercise: DEFAULT_EXERCISES.clubs.name,    suit: 'clubs'    } },
    { id: 'default-spades',   values: ALL_STANDARD_VALUES, repsMode: { kind: 'card-value' }, assignment: { kind: 'per-suit', exercise: DEFAULT_EXERCISES.spades.name,   suit: 'spades'   } },
  ],
  includeJokers: false,
  jokerCount: 2,
}

const ALL_PINOCHLE_VALUES = [1, 9, 10, 11, 12, 13]  // A, 9, 10, J, Q, K

export const PINOCHLE_DECK_CONFIG: DeckConfig = {
  name: 'Pinochle Deck',
  format: 'pinochle',
  copiesPerCard: 2,
  groups: [
    { id: 'pinochle-hearts',   values: ALL_PINOCHLE_VALUES, repsMode: { kind: 'card-value' }, assignment: { kind: 'per-suit', exercise: DEFAULT_EXERCISES.hearts.name,   suit: 'hearts'   } },
    { id: 'pinochle-diamonds', values: ALL_PINOCHLE_VALUES, repsMode: { kind: 'card-value' }, assignment: { kind: 'per-suit', exercise: DEFAULT_EXERCISES.diamonds.name, suit: 'diamonds' } },
    { id: 'pinochle-clubs',    values: ALL_PINOCHLE_VALUES, repsMode: { kind: 'card-value' }, assignment: { kind: 'per-suit', exercise: DEFAULT_EXERCISES.clubs.name,    suit: 'clubs'    } },
    { id: 'pinochle-spades',   values: ALL_PINOCHLE_VALUES, repsMode: { kind: 'card-value' }, assignment: { kind: 'per-suit', exercise: DEFAULT_EXERCISES.spades.name,   suit: 'spades'   } },
  ],
  includeJokers: false,
  jokerCount: 2,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function localShuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/** Build and shuffle a deck of ResolvedCards from a DeckConfig. */
export function buildDeckFromConfig(config: DeckConfig): ResolvedCard[] {
  const standardSuits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  const cards: ResolvedCard[] = []

  for (const group of config.groups) {
    for (const value of group.values) {
      if (value === 0) {
        // Joker
        if (!config.includeJokers) continue
        const exercise =
          group.assignment.kind === 'all-suits' ? group.assignment.exercise : ''
        for (let i = 0; i < config.jokerCount; i++) {
          cards.push({
            suit: 'joker',
            value: 0,
            displayValue: 'Joker',
            exercise,
            repsMode: group.repsMode,
          })
        }
      } else {
        // Standard card — determine which suits are covered
        const suits: CardSuit[] =
          group.assignment.kind === 'per-suit'
            ? [group.assignment.suit]
            : (group.assignment.suits ?? standardSuits)

        const exercise = group.assignment.exercise

        const copies = config.copiesPerCard ?? 1
        for (const suit of suits) {
          for (let copy = 0; copy < copies; copy++) {
            cards.push({
              suit,
              value,
              displayValue: getCardDisplayValue(value),
              exercise,
              repsMode: group.repsMode,
            })
          }
        }
      }
    }
  }

  return localShuffle(cards)
}

/** Find the exercise name for a card given the current config. */
export function getExerciseForCard(card: Card, config: DeckConfig): string {
  const standardSuits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  for (const group of config.groups) {
    if (!group.values.includes(card.value)) continue
    if (group.assignment.kind === 'all-suits') {
      // Jokers have no standard suit — always match joker groups
      if (card.suit === 'joker') return group.assignment.exercise
      const suits = group.assignment.suits ?? standardSuits
      if (suits.includes(card.suit as Suit)) return group.assignment.exercise
    } else {
      if (group.assignment.suit === (card.suit as Suit)) return group.assignment.exercise
    }
  }
  return ''
}

/** Find the RepsMode for a card given the current config. */
export function getRepsModeForCard(card: Card, config: DeckConfig): RepsMode {
  for (const group of config.groups) {
    if (group.values.includes(card.value)) {
      return group.repsMode
    }
  }
  return { kind: 'card-value' }
}

/** Resolve the card-value rep count for a numeric card value, respecting custom face overrides and offset. */
function cardValueReps(value: number, faceValues?: FaceValues, valueOffset = 0): number {
  if (value === 11) return faceValues?.J ?? 11
  if (value === 12) return faceValues?.Q ?? 12
  if (value === 13) return faceValues?.K ?? 13
  if (value === 1)  return faceValues?.A ?? 14  // Ace is high
  return value + valueOffset
}

/** Resolve a concrete rep count. Timed holds count as 1 rep. */
export function resolveReps(card: Card, repsMode: RepsMode): number {
  if (repsMode.kind === 'card-value') return cardValueReps(card.value, repsMode.faceValues, repsMode.valueOffset)
  if (repsMode.kind === 'fixed') return repsMode.reps
  return 1  // timed hold = 1 rep
}

export function isTimed(repsMode: RepsMode): boolean {
  return repsMode.kind === 'timed'
}

/** Total rep count across the deck (timed holds count as 1 rep each). */
export function calculateConfigTotalReps(config: DeckConfig): number {
  let total = 0
  const copies = config.copiesPerCard ?? 1
  for (const group of config.groups) {
    const standardSuits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
    for (const value of group.values) {
      if (value === 0) {
        if (!config.includeJokers) continue
        if (group.repsMode.kind === 'timed') {
          total += 1 * config.jokerCount
        } else {
          const fv = group.repsMode.kind === 'card-value' ? group.repsMode.faceValues : undefined
          const vo = group.repsMode.kind === 'card-value' ? (group.repsMode.valueOffset ?? 0) : 0
          const reps = group.repsMode.kind === 'fixed' ? group.repsMode.reps : cardValueReps(0, fv, vo)
          total += reps * config.jokerCount
        }
      } else {
        const suitCount = group.assignment.kind === 'per-suit' ? 1 : (group.assignment.suits?.length ?? 4)
        if (group.repsMode.kind === 'timed') {
          total += 1 * suitCount * copies
        } else {
          const fv = group.repsMode.kind === 'card-value' ? group.repsMode.faceValues : undefined
          const vo = group.repsMode.kind === 'card-value' ? (group.repsMode.valueOffset ?? 0) : 0
          const reps = group.repsMode.kind === 'fixed' ? group.repsMode.reps : cardValueReps(value, fv, vo)
          total += reps * suitCount * copies
        }
      }
    }
  }
  return total
}

/** Count total cards the config will produce (for the summary display). */
export function calculateConfigCardCount(config: DeckConfig): number {
  const standardSuits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  const copies = config.copiesPerCard ?? 1
  let count = 0
  for (const group of config.groups) {
    for (const value of group.values) {
      if (value === 0) {
        if (config.includeJokers) count += config.jokerCount
      } else {
        const suitCount = group.assignment.kind === 'per-suit' ? 1 : (group.assignment.suits?.length ?? 4)
        count += suitCount * copies
      }
    }
  }
  return count
}

/** Count distinct exercises in the config. */
export function calculateConfigExerciseCount(config: DeckConfig): number {
  const names = new Set<string>()
  for (const group of config.groups) {
    if (group.assignment.exercise) names.add(group.assignment.exercise)
  }
  return names.size
}

// ── Migration helpers ─────────────────────────────────────────────────────────

/** Convert legacy { suit: exercise } map to a DeckConfig (one group per suit). */
export function legacyExercisesToConfig(exercises: Record<Suit, string>): DeckConfig {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  return {
    groups: suits.map(suit => ({
      id: `legacy-${suit}`,
      values: ALL_STANDARD_VALUES,
      repsMode: { kind: 'card-value' } as const,
      assignment: { kind: 'per-suit' as const, exercise: exercises[suit], suit },
    })),
    includeJokers: false,
    jokerCount: 2,
  }
}

/**
 * Extract a legacy { suit: exercise } map from a DeckConfig.
 * Used for backward-compat DB writes (keeps four _exercise columns populated).
 */
export function configToLegacyExercises(config: DeckConfig): Record<Suit, string> {
  const standardSuits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  const result: Partial<Record<Suit, string>> = {}

  for (const suit of standardSuits) {
    for (const group of config.groups) {
      if (group.assignment.kind === 'all-suits') {
        result[suit] = group.assignment.exercise
        break
      } else if (group.assignment.kind === 'per-suit' && group.assignment.suit === suit) {
        result[suit] = group.assignment.exercise
        break
      }
    }
    if (!result[suit]) result[suit] = DEFAULT_EXERCISES[suit].name
  }

  return result as Record<Suit, string>
}
