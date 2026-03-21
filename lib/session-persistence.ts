/**
 * AsyncStorage persistence helpers for in-progress workout sessions.
 * Allows workouts to survive app backgrounding and restarts.
 *
 * Both state shapes include `isRunning`/`isPaused` and a `savedAt` timestamp.
 * On restore, if the workout was running we add (Date.now() - savedAt) to
 * elapsedTime so the timer reflects real wall-clock time automatically.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { DeckConfig, ResolvedCard } from '@/lib/deck-config'

// ── Deck session ──────────────────────────────────────────────────────────────

export interface PersistedDeckState {
  deck: ResolvedCard[]                  // full shuffled deck with resolved exercise/repsMode
  deckConfig: DeckConfig                // config snapshot used to build this deck
  completedCards: number[]              // Set<number> serialised as array
  currentIndex: number
  elapsedTime: number                   // active seconds at time of save
  repsByExercise: Record<string, number>
  timedCardProgress?: Record<number, number>  // card index → elapsed seconds
  isRunning: boolean                    // whether timer was running when saved
  savedAt: number                       // Date.now() at save time
}

const DECK_KEY = 'deck_session_state'

export const saveDeckState = async (state: PersistedDeckState): Promise<void> => {
  try {
    await AsyncStorage.setItem(DECK_KEY, JSON.stringify(state))
  } catch {
    // Storage errors are non-fatal
  }
}

export const loadDeckState = async (): Promise<PersistedDeckState | null> => {
  try {
    const raw = await AsyncStorage.getItem(DECK_KEY)
    return raw ? (JSON.parse(raw) as PersistedDeckState) : null
  } catch {
    return null
  }
}

export const clearDeckState = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(DECK_KEY)
  } catch {
    // Storage errors are non-fatal
  }
}

// ── Free workout session ───────────────────────────────────────────────────────

export interface PersistedFreeState {
  elapsedTime: number                   // active seconds at time of save
  distance: number                      // km (internal unit)
  calories: number
  isPaused: boolean                     // whether workout was paused when saved
  savedAt: number                       // Date.now() at save time
  completed?: boolean                   // true once stopped — awaiting save/discard
}

const FREE_KEY = 'free_session_state'

export const saveFreeState = async (state: PersistedFreeState): Promise<void> => {
  try {
    await AsyncStorage.setItem(FREE_KEY, JSON.stringify(state))
  } catch {
    // Storage errors are non-fatal
  }
}

export const loadFreeState = async (): Promise<PersistedFreeState | null> => {
  try {
    const raw = await AsyncStorage.getItem(FREE_KEY)
    return raw ? (JSON.parse(raw) as PersistedFreeState) : null
  } catch {
    return null
  }
}

export const clearFreeState = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(FREE_KEY)
  } catch {
    // Storage errors are non-fatal
  }
}
