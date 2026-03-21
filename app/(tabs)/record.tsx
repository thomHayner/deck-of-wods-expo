import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  Layers, Footprints, Bike, Mountain, Play, Pause, Square, Trophy,
} from 'lucide-react-native'
import { DeckWorkoutSession } from '@/components/deck/deck-workout-session'
import { Card, CardContent } from '@/components/ui/card'
import { type DeckConfig } from '@/lib/deck-config'
import {
  saveFreeState, loadFreeState, clearFreeState,
  loadDeckState, clearDeckState,
} from '@/lib/session-persistence'
import { setActiveWorkout, getActiveWorkout, clearActiveWorkout } from '@/lib/active-workout'
import { getProfile } from '@/lib/db/profiles'
import { saveDeckSession } from '@/lib/db/sessions'
import { saveFreeSession, type FreeWorkoutType } from '@/lib/db/free-sessions'
import { saveWorkoutToHealth } from '@/lib/health'

const PRIMARY = '#16a34a'
const ACCENT  = '#f97316'
const KM_TO_MILES = 0.621371

type PageView = 'hub' | 'deck-active' | 'free-active' | 'deck-complete' | 'free-complete'

interface DeckStats {
  totalCards: number
  completedCards: number
  totalReps: number
  durationSeconds: number
  repsByExercise: Record<string, number>
  deckConfig: DeckConfig
}

interface FreeSummary {
  type: FreeWorkoutType
  duration: number
  distance: number
  calories: number
  avgPace: number
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 bg-white rounded-xl border border-gray-200 p-4 items-center">
      <Text className="text-2xl font-bold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-500 mt-0.5 text-center">{label}</Text>
    </View>
  )
}

const FREE_TYPES: { type: FreeWorkoutType; label: string; Icon: typeof Footprints }[] = [
  { type: 'running',  label: 'Running',  Icon: Footprints },
  { type: 'walking',  label: 'Walking',  Icon: Footprints },
  { type: 'cycling',  label: 'Cycling',  Icon: Bike       },
  { type: 'hiking',   label: 'Hiking',   Icon: Mountain   },
]

export default function RecordScreen() {
  const insets = useSafeAreaInsets()
  const [view, setView]               = useState<PageView>('hub')
  const [deckConfig, setDeckConfig]   = useState<DeckConfig | null>(null)
  const [deckStats, setDeckStats]     = useState<DeckStats | null>(null)
  const [saving, setSaving]           = useState(false)
  const [freeType, setFreeType]       = useState<FreeWorkoutType>('running')
  const [isPaused, setIsPaused]       = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [distance, setDistance]       = useState(0)
  const [calories, setCalories]       = useState(0)
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'miles'>('km')
  const [freeSummary, setFreeSummary] = useState<FreeSummary | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Use refs to avoid stale closure in timer
  const distanceRef   = useRef(0)
  const caloriesRef   = useRef(0)
  const elapsedRef    = useRef(0)
  const workoutStart  = useRef<Date>(new Date())

  distanceRef.current = distance
  caloriesRef.current = calories
  elapsedRef.current  = elapsedTime

  useFocusEffect(
    useCallback(() => {
      async function init() {
        const active = await getActiveWorkout()
        if (active?.kind === 'deck') {
          const pendingRaw = await AsyncStorage.getItem('pending_deck_config')
          if (pendingRaw) {
            setDeckConfig(JSON.parse(pendingRaw) as DeckConfig)
            await AsyncStorage.removeItem('pending_deck_config')
            workoutStart.current = new Date()
            setView('deck-active')
            return
          }
          const saved = await loadDeckState()
          if (saved) { setDeckConfig(saved.deckConfig); workoutStart.current = new Date(); setView('deck-active'); return }
        } else if (active) {
          const saved = await loadFreeState()
          if (saved && !saved.completed) {
            const resume = saved.isPaused ? saved.elapsedTime : saved.elapsedTime + Math.round((Date.now() - saved.savedAt) / 1000)
            setFreeType(active.kind as FreeWorkoutType)
            setElapsedTime(resume); distanceRef.current = saved.distance
            setDistance(saved.distance); caloriesRef.current = saved.calories
            setCalories(saved.calories); setIsPaused(saved.isPaused)
            setView('free-active')
            return
          }
        }
        const pendingRaw = await AsyncStorage.getItem('pending_deck_config')
        if (pendingRaw) {
          setDeckConfig(JSON.parse(pendingRaw) as DeckConfig)
          await AsyncStorage.removeItem('pending_deck_config')
          workoutStart.current = new Date()
          setView('deck-active')
        }
        getProfile().then(p => { if (p) setDistanceUnit(p.unit_system === 'imperial' ? 'miles' : 'km') }).catch(() => {})
      }
      init()
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }, [])
  )

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (view === 'free-active' && !isPaused) {
      timerRef.current = setInterval(() => {
        const speed = freeType === 'cycling' ? 0.007 : freeType === 'running' ? 0.003 : 0.002
        const calRate = freeType === 'cycling' ? 0.12 : freeType === 'running' ? 0.15 : 0.08
        setElapsedTime(t => t + 1)
        setDistance(d => d + speed)
        setCalories(c => c + calRate)
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [view, isPaused, freeType])

  async function startFreeWorkout(type: FreeWorkoutType) {
    setFreeType(type); setElapsedTime(0); setDistance(0); setCalories(0); setIsPaused(false)
    distanceRef.current = 0; caloriesRef.current = 0; elapsedRef.current = 0
    workoutStart.current = new Date()
    await setActiveWorkout(type)
    setView('free-active')
  }

  async function handleFreeStop() {
    if (timerRef.current) clearInterval(timerRef.current)
    const avgPace = distanceRef.current > 0 ? (elapsedRef.current / 60) / distanceRef.current : 0
    setFreeSummary({ type: freeType, duration: elapsedRef.current, distance: distanceRef.current, calories: caloriesRef.current, avgPace })
    setView('free-complete')
  }

  async function handleFreeSave() {
    if (!freeSummary) return
    setSaving(true)
    const endDate = new Date()
    try {
      await saveFreeSession({
        workout_type: freeSummary.type,
        duration_seconds: freeSummary.duration,
        distance_km: freeSummary.distance,
        calories: Math.round(freeSummary.calories),
      })
      await saveWorkoutToHealth({
        type: freeSummary.type,
        startDate: workoutStart.current,
        endDate,
        calories: Math.round(freeSummary.calories),
        distance_km: freeSummary.distance,
      })
    } catch (e) { console.error(e) }
    await clearFreeState(); await clearActiveWorkout()
    setSaving(false); router.push('/you')
  }

  async function handleDeckComplete(stats: DeckStats) {
    setDeckStats(stats); setView('deck-complete')
  }

  async function handleDeckSave() {
    if (!deckStats) return
    setSaving(true)
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - deckStats.durationSeconds * 1000)
    try {
      await saveDeckSession({
        config: deckStats.deckConfig,
        cards_completed: deckStats.completedCards,
        total_reps: deckStats.totalReps,
        duration_seconds: deckStats.durationSeconds,
        reps_per_minute: deckStats.durationSeconds > 0
          ? Math.round((deckStats.totalReps / deckStats.durationSeconds) * 60)
          : 0,
      })
      await saveWorkoutToHealth({
        type: 'deck',
        startDate,
        endDate,
        calories: Math.round(deckStats.totalReps * 0.5),
      })
    } catch (e) { console.error(e) }
    await clearDeckState(); await clearActiveWorkout(); await AsyncStorage.removeItem('pending_deck_config')
    setSaving(false); router.push('/you')
  }

  // ── Hub ─────────────────────────────────────────────────────────────────────
  if (view === 'hub') {
    return (
      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}
      >
        <Text className="text-xl font-bold text-gray-900 mb-4">Start Workout</Text>

        <Pressable onPress={() => router.push('/deck')} className="mb-5">
          <Card>
            <CardContent className="pt-4">
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 rounded-xl bg-green-100 items-center justify-center">
                  <Layers size={24} color={PRIMARY} />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900">Deck of WODs</Text>
                  <Text className="text-sm text-gray-500">Card-based workout · choose a deck</Text>
                </View>
                <Play size={20} color={PRIMARY} />
              </View>
            </CardContent>
          </Card>
        </Pressable>

        <Text className="font-semibold text-gray-900 mb-3">Free Workout</Text>
        <View className="flex-row flex-wrap gap-3">
          {FREE_TYPES.map(({ type, label, Icon }) => (
            <Pressable
              key={type}
              onPress={() => startFreeWorkout(type)}
              className="bg-white rounded-xl border border-gray-200 p-4 items-center gap-2"
              style={{ width: '47%' }}
            >
              <View className="w-12 h-12 rounded-xl bg-orange-100 items-center justify-center">
                <Icon size={24} color={ACCENT} />
              </View>
              <Text className="font-medium text-gray-900">{label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    )
  }

  // ── Deck active ─────────────────────────────────────────────────────────────
  if (view === 'deck-active' && deckConfig) {
    return (
      <View className="flex-1" style={{ paddingTop: insets.top }}>
        <View className="px-4 py-3 border-b border-gray-200 bg-white">
          <Text className="text-lg font-bold text-gray-900">Deck of WODs</Text>
        </View>
        <DeckWorkoutSession
          config={deckConfig}
          onComplete={handleDeckComplete}
          onCancel={() => { clearActiveWorkout(); setView('hub') }}
        />
      </View>
    )
  }

  // ── Free active ─────────────────────────────────────────────────────────────
  if (view === 'free-active') {
    const displayDist = distanceUnit === 'miles' ? distance * KM_TO_MILES : distance
    const pace = distance > 0 ? (elapsedTime / 60) / distance : 0
    return (
      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}
      >
        <Text className="text-xl font-bold text-gray-900 capitalize mb-4">{freeType}</Text>

        <View className="bg-white rounded-2xl border border-gray-200 p-6 items-center mb-4">
          <Text className="text-6xl font-mono font-bold text-gray-900">{formatTime(elapsedTime)}</Text>
          <Text className="text-gray-500 mt-1">{isPaused ? 'Paused' : 'Active'}</Text>
        </View>

        <View className="flex-row gap-3 mb-3">
          <View className="flex-1 bg-white rounded-xl border border-gray-200 p-4">
            <Text className="text-sm text-gray-500">Distance</Text>
            <Text className="text-2xl font-bold text-gray-900 mt-1">{displayDist.toFixed(2)}</Text>
            <Text className="text-xs text-gray-400">{distanceUnit}</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl border border-gray-200 p-4">
            <Text className="text-sm text-gray-500">Calories</Text>
            <Text className="text-2xl font-bold text-gray-900 mt-1">{Math.round(calories)}</Text>
            <Text className="text-xs text-gray-400">kcal</Text>
          </View>
        </View>
        <View className="flex-row gap-3 mb-5">
          <View className="flex-1 bg-white rounded-xl border border-gray-200 p-4">
            <Text className="text-sm text-gray-500">Pace</Text>
            <Text className="text-2xl font-bold text-gray-900 mt-1">{pace > 0 ? pace.toFixed(1) : '—'}</Text>
            <Text className="text-xs text-gray-400">min/{distanceUnit}</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl border border-gray-200 p-4">
            <Text className="text-sm text-gray-500">Avg Speed</Text>
            <Text className="text-2xl font-bold text-gray-900 mt-1">
              {elapsedTime > 0 ? ((distance / elapsedTime) * 3600).toFixed(1) : '—'}
            </Text>
            <Text className="text-xs text-gray-400">{distanceUnit}/h</Text>
          </View>
        </View>

        <View className="flex-row gap-3">
          <Pressable
            onPress={() => setIsPaused(p => !p)}
            className="flex-1 flex-row items-center justify-center gap-2 bg-gray-200 rounded-xl py-4"
          >
            {isPaused ? <Play size={20} color="#374151" /> : <Pause size={20} color="#374151" />}
            <Text className="text-gray-700 font-semibold">{isPaused ? 'Resume' : 'Pause'}</Text>
          </Pressable>
          <Pressable
            onPress={handleFreeStop}
            className="flex-1 flex-row items-center justify-center gap-2 bg-red-500 rounded-xl py-4"
          >
            <Square size={20} color="#fff" />
            <Text className="text-white font-semibold">Stop</Text>
          </Pressable>
        </View>
      </ScrollView>
    )
  }

  // ── Deck complete ────────────────────────────────────────────────────────────
  if (view === 'deck-complete' && deckStats) {
    return (
      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}
      >
        <View className="bg-white rounded-2xl border border-gray-200 p-6 items-center mb-4">
          <View className="w-16 h-16 rounded-full bg-yellow-100 items-center justify-center mb-3">
            <Trophy size={36} color="#eab308" />
          </View>
          <Text className="text-2xl font-bold text-gray-900">Awesome Work!</Text>
          <Text className="text-gray-500 mt-1">You crushed that deck! 💪</Text>
        </View>

        <View className="flex-row flex-wrap gap-3 mb-4">
          <StatCard value={formatDuration(deckStats.durationSeconds)} label="Time" />
          <StatCard value={`${deckStats.completedCards}/${deckStats.totalCards}`} label="Cards" />
          <StatCard value={deckStats.totalReps.toString()} label="Total Reps" />
          <StatCard
            value={deckStats.durationSeconds > 0 ? Math.round((deckStats.totalReps / deckStats.durationSeconds) * 60).toString() : '—'}
            label="Reps/Min"
          />
        </View>

        {Object.keys(deckStats.repsByExercise).length > 0 && (
          <View className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
            <Text className="font-semibold text-gray-900 mb-3">Exercise Breakdown</Text>
            {Object.entries(deckStats.repsByExercise).map(([ex, reps]) => (
              <View key={ex} className="flex-row justify-between py-1.5 border-b border-gray-100">
                <Text className="text-gray-700">{ex}</Text>
                <Text className="font-semibold text-gray-900">{reps} reps</Text>
              </View>
            ))}
          </View>
        )}

        <Pressable
          onPress={handleDeckSave}
          disabled={saving}
          className={`bg-green-600 rounded-xl py-4 items-center ${saving ? 'opacity-60' : ''}`}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold text-base">Save Workout</Text>}
        </Pressable>
      </ScrollView>
    )
  }

  // ── Free complete ────────────────────────────────────────────────────────────
  if (view === 'free-complete' && freeSummary) {
    const displayDist = distanceUnit === 'miles' ? freeSummary.distance * KM_TO_MILES : freeSummary.distance
    return (
      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}
      >
        <View className="bg-white rounded-2xl border border-gray-200 p-6 items-center mb-4">
          <View className="w-16 h-16 rounded-full bg-yellow-100 items-center justify-center mb-3">
            <Trophy size={36} color="#eab308" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 capitalize">{freeSummary.type} Done!</Text>
          <Text className="text-gray-500 mt-1">Great effort! Keep it up 🏃</Text>
        </View>

        <View className="flex-row flex-wrap gap-3 mb-5">
          <StatCard value={formatDuration(freeSummary.duration)} label="Duration" />
          <StatCard value={`${displayDist.toFixed(2)} ${distanceUnit}`} label="Distance" />
          <StatCard value={`${Math.round(freeSummary.calories)}`} label="Calories (kcal)" />
          <StatCard
            value={freeSummary.avgPace > 0 ? freeSummary.avgPace.toFixed(1) : '—'}
            label={`min/${distanceUnit}`}
          />
        </View>

        <Pressable
          onPress={handleFreeSave}
          disabled={saving}
          className={`bg-green-600 rounded-xl py-4 items-center mb-3 ${saving ? 'opacity-60' : ''}`}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold text-base">Save Workout</Text>}
        </Pressable>
        <Pressable
          onPress={async () => { await clearFreeState(); await clearActiveWorkout(); setView('hub') }}
          className="items-center py-3"
        >
          <Text className="text-gray-400 text-sm">Discard</Text>
        </Pressable>
      </ScrollView>
    )
  }

  return <View className="flex-1 items-center justify-center"><ActivityIndicator color={PRIMARY} /></View>
}
