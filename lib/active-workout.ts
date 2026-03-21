/**
 * AsyncStorage tracker for the one currently-active workout.
 * Used by the Record tab to show a "return to active workout" banner.
 * Only one workout can be active at a time.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

export type ActiveWorkoutKind = 'deck' | 'running' | 'walking' | 'cycling' | 'hiking'

interface ActiveWorkout {
  kind: ActiveWorkoutKind
  startedAt: number  // Date.now() timestamp — lets us show elapsed wall-clock time
}

const KEY = 'active_workout'

export const setActiveWorkout = async (kind: ActiveWorkoutKind): Promise<void> => {
  try {
    const payload: ActiveWorkout = { kind, startedAt: Date.now() }
    await AsyncStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    // Storage errors are non-fatal
  }
}

export const clearActiveWorkout = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(KEY)
  } catch {
    // Storage errors are non-fatal
  }
}

export const getActiveWorkout = async (): Promise<ActiveWorkout | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ActiveWorkout) : null
  } catch {
    return null
  }
}
