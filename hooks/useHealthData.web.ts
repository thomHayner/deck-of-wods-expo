/**
 * Web stub — Metro uses this file instead of useHealthData.ts on web.
 * HealthKit and Health Connect are native-only; return zeros on web.
 */

export function useHealthData() {
  return { steps: 0, calories: 0, heartRate: null }
}
