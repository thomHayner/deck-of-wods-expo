// Card types for Deck of WODs
import { DEFAULT_SUIT_COLORS, type SuitColorConfig } from './suit-colors'
export type { SuitColorConfig } from './suit-colors'
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type CardSuit = Suit | 'joker'

export interface Card {
  suit: CardSuit
  value: number // 0=Joker, 1-13 (Ace to King)
  displayValue: string // 'Joker', 'A', '2', '3', ... 'J', 'Q', 'K'
}

export interface DeckExercise {
  id: string
  user_id: string
  suit: Suit
  exercise_name: string
  description: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface DeckSession {
  id: string
  user_id: string
  workout_id: string | null
  start_time: string
  end_time: string | null
  total_cards: number
  cards_completed: number
  total_reps: number
  deck_order: Card[]
  current_card_index: number
  status: 'in_progress' | 'completed' | 'abandoned'
  exercises_config: Record<Suit, string>
  created_at: string
  updated_at: string
}

export interface DeckCardCompletion {
  id: string
  session_id: string
  card_index: number
  suit: Suit
  card_value: number
  exercise_name: string
  reps_completed: number
  completed_at: string
  duration_seconds: number | null
}

// Workout types
export type WorkoutType = 'running' | 'walking' | 'cycling' | 'hiking' | 'deck_of_wods' | 'other'

export interface Workout {
  id: string
  user_id: string
  type: WorkoutType
  start_time: string
  end_time: string | null
  duration: number | null
  distance: number | null
  calories: number | null
  average_heart_rate: number | null
  max_heart_rate: number | null
  average_pace: number | null
  elevation_gain: number | null
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface WorkoutSample {
  id: string
  workout_id: string
  timestamp: string
  heart_rate: number | null
  speed: number | null
  pace: number | null
  cadence: number | null
  altitude: number | null
  created_at: string
}

export interface GPSPoint {
  id: string
  workout_id: string
  timestamp: string
  latitude: number
  longitude: number
  altitude: number | null
  accuracy: number | null
  speed: number | null
  bearing: number | null
  created_at: string
}

// Health metrics
export type MetricType = 'steps' | 'heart_rate' | 'distance' | 'active_energy' | 'resting_heart_rate'

export interface HealthMetric {
  id: string
  user_id: string
  metric_type: MetricType
  value: number
  unit: string
  date: string
  source: string
  created_at: string
  updated_at: string
}

// User profile
export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  date_of_birth: string | null
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
  height_cm: number | null
  weight_kg: number | null
  distance_unit: 'miles' | 'kilometers'
  weight_unit: 'pounds' | 'kilograms'
  daily_step_goal: number
  daily_calorie_goal: number
  created_at: string
  updated_at: string
}

// Helper functions
export function getCardDisplayValue(value: number): string {
  if (value === 0) return 'Joker'
  if (value === 1) return 'A'
  if (value === 11) return 'J'
  if (value === 12) return 'Q'
  if (value === 13) return 'K'
  return value.toString()
}

export function getRepsForCard(value: number): number {
  // Face cards (J, Q, K) = 10 reps, Ace = 11 reps, number cards = face value
  if (value === 1) return 11
  if (value >= 11) return 10
  return value
}

export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  const deck: Card[] = []
  
  for (const suit of suits) {
    for (let value = 1; value <= 13; value++) {
      deck.push({
        suit,
        value,
        displayValue: getCardDisplayValue(value),
      })
    }
  }
  
  return deck
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function getSuitColor(suit: CardSuit, colors: SuitColorConfig = DEFAULT_SUIT_COLORS): string {
  return colors[suit].text
}

export function getSuitBgColor(suit: CardSuit, colors: SuitColorConfig = DEFAULT_SUIT_COLORS): string {
  return colors[suit].bg
}

export function getSuitSymbol(suit: CardSuit): string {
  switch (suit) {
    case 'hearts':   return '♥'
    case 'diamonds': return '♦'
    case 'clubs':    return '♣'
    case 'spades':   return '♠'
    case 'joker':    return '★'
  }
}

export const DEFAULT_EXERCISES: Record<Suit, { name: string; description: string }> = {
  hearts: { name: 'Push-ups', description: 'Standard push-ups' },
  diamonds: { name: 'Squats', description: 'Bodyweight squats' },
  clubs: { name: 'Sit-ups', description: 'Standard sit-ups or crunches' },
  spades: { name: 'Burpees', description: 'Full burpees with jump' },
}

// Calculate total reps in a full deck
export function calculateTotalDeckReps(): number {
  let total = 0
  for (let value = 1; value <= 13; value++) {
    total += getRepsForCard(value) * 4 // 4 suits
  }
  return total // Should be 340 total reps
}
