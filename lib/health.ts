/**
 * Saves a completed workout to HealthKit (iOS) or Health Connect (Android).
 * No-op on web or if the health library is unavailable.
 */
import { Platform } from 'react-native'

export interface WorkoutRecord {
  type: 'deck' | 'running' | 'walking' | 'cycling' | 'hiking'
  startDate: Date
  endDate: Date
  /** Active calories burned (kcal) */
  calories: number
  /** Distance in kilometers (optional, for cardio types) */
  distance_km?: number
}

export async function saveWorkoutToHealth(workout: WorkoutRecord): Promise<void> {
  if (Platform.OS === 'web') return
  if (Platform.OS === 'ios') await saveToHealthKit(workout)
  if (Platform.OS === 'android') await saveToHealthConnect(workout)
}

// ─── iOS HealthKit ────────────────────────────────────────────────────────────

function iosActivity(type: WorkoutRecord['type']): string {
  switch (type) {
    case 'running':  return 'Running'
    case 'walking':  return 'Walking'
    case 'cycling':  return 'Cycling'
    case 'hiking':   return 'Hiking'
    default:         return 'FunctionalStrengthTraining'
  }
}

async function saveToHealthKit(workout: WorkoutRecord): Promise<void> {
  try {
    const AppleHealthKit = require('react-native-health').default
    await new Promise<void>((resolve) => {
      AppleHealthKit.saveWorkout(
        {
          type: iosActivity(workout.type),
          startDate: workout.startDate.toISOString(),
          endDate: workout.endDate.toISOString(),
          energyBurned: workout.calories,
          energyBurnedUnit: 'kilocalorie',
          ...(workout.distance_km
            ? { distance: workout.distance_km * 1000, distanceUnit: 'meter' }
            : {}),
        },
        (err: Error) => {
          if (err) console.warn('[HealthKit] saveWorkout:', err.message)
          resolve()
        }
      )
    })
  } catch {
    // HealthKit unavailable (simulator without entitlements, or not initialised)
  }
}

// ─── Android Health Connect ───────────────────────────────────────────────────

// Numeric constants from Health Connect ExerciseSessionRecord.ExerciseType
const HC_EXERCISE_TYPE: Record<WorkoutRecord['type'], number> = {
  running:  56,  // EXERCISE_TYPE_RUNNING
  walking:  79,  // EXERCISE_TYPE_WALKING
  cycling:  8,   // EXERCISE_TYPE_BIKING
  hiking:   37,  // EXERCISE_TYPE_HIKING
  deck:     45,  // EXERCISE_TYPE_STRENGTH_TRAINING
}

async function saveToHealthConnect(workout: WorkoutRecord): Promise<void> {
  try {
    const { insertRecords } = require('react-native-health-connect')
    const records: object[] = [
      {
        recordType: 'ExerciseSession',
        startTime: workout.startDate.toISOString(),
        endTime: workout.endDate.toISOString(),
        exerciseType: HC_EXERCISE_TYPE[workout.type],
      },
    ]
    if (workout.calories > 0) {
      records.push({
        recordType: 'ActiveCaloriesBurned',
        startTime: workout.startDate.toISOString(),
        endTime: workout.endDate.toISOString(),
        energy: { value: workout.calories, unit: 'kilocalories' },
      })
    }
    await insertRecords(records)
  } catch {
    // Health Connect unavailable
  }
}
