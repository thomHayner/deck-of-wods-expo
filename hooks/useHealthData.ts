/**
 * Reads today's health metrics from HealthKit (iOS) or Health Connect (Android).
 * Returns no-op zeros on web.
 */
import React, { useState, useEffect } from 'react'
import { Platform } from 'react-native'

interface HealthData {
  steps: number
  calories: number
  heartRate: number | null
}

export function useHealthData(): HealthData {
  const [data, setData] = useState<HealthData>({ steps: 0, calories: 0, heartRate: null })

  useEffect(() => {
    if (Platform.OS === 'web') return
    if (Platform.OS === 'ios') loadiOSHealth(setData as React.Dispatch<React.SetStateAction<HealthData>>)
    if (Platform.OS === 'android') loadAndroidHealth(setData)
  }, [])

  return data
}

function loadiOSHealth(setData: React.Dispatch<React.SetStateAction<HealthData>>) {
  try {
    const AppleHealthKit = require('react-native-health').default
    const PERMS = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.StepCount,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.HeartRate,
        ],
        write: [
          AppleHealthKit.Constants.Permissions.Workout,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
        ],
      },
    }
    AppleHealthKit.initHealthKit(PERMS, (err: Error) => {
      if (err) return
      const today = new Date().toISOString()
      AppleHealthKit.getStepCount({ date: today }, (_: Error, result: { value: number }) => {
        if (result) setData(prev => ({ ...prev, steps: result.value }))
      })
      AppleHealthKit.getActiveEnergyBurned(
        { startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(), endDate: today },
        (_: Error, results: Array<{ value: number }>) => {
          const total = results?.reduce((sum, r) => sum + r.value, 0) ?? 0
          setData(prev => ({ ...prev, calories: Math.round(total) }))
        }
      )
    })
  } catch {
    // HealthKit not available in simulator without entitlements
  }
}

async function loadAndroidHealth(setData: (d: HealthData) => void) {
  try {
    const { initialize, requestPermission, readRecords } = require('react-native-health-connect')
    await initialize()
    await requestPermission([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
    ])
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const [stepsResult, calResult] = await Promise.all([
      readRecords('Steps', { timeRangeFilter: { operator: 'between', startTime: startOfDay.toISOString(), endTime: new Date().toISOString() } }),
      readRecords('ActiveCaloriesBurned', { timeRangeFilter: { operator: 'between', startTime: startOfDay.toISOString(), endTime: new Date().toISOString() } }),
    ])
    const steps = stepsResult.records.reduce((sum: number, r: { count: number }) => sum + r.count, 0)
    const calories = calResult.records.reduce((sum: number, r: { energy: { inKilocalories: number } }) => sum + r.energy.inKilocalories, 0)
    setData({ steps, calories: Math.round(calories), heartRate: null })
  } catch {
    // Health Connect not available
  }
}
