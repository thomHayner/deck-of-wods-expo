import { useState, useEffect, useMemo } from 'react'
import { ScrollView, View, Text, Pressable } from 'react-native'
import Svg, { Polyline, Circle as SvgCircle } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import {
  Layers,
  Dumbbell,
  TrendingUp,
  Flame,
  Footprints,
  Heart,
  ChevronRight,
  Play,
  Bike,
  Mountain,
} from 'lucide-react-native'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { getDeckSessions, type DeckSessionRow } from '@/lib/db/sessions'
import { getFreeSessions, type FreeSessionRow } from '@/lib/db/free-sessions'
import { getProfile } from '@/lib/db/profiles'
import { useHealthData } from '@/hooks/useHealthData'

const PRIMARY = '#16a34a'
const MUTED_FG = '#6b7280'
const ACCENT = '#f97316'

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)} min`
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatDurationShort(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDistance(km: number, unitSystem: 'metric' | 'imperial') {
  if (unitSystem === 'imperial') return `${(km * 0.621371).toFixed(1)} mi`
  return `${km.toFixed(1)} km`
}

const WORKOUT_TYPE_LABELS: Record<string, string> = {
  running:  'Run',
  walking:  'Walk',
  cycling:  'Bike',
  hiking:   'Hike',
  deck:     'Deck',
}

const DISTANCE_TYPES = new Set(['running', 'walking', 'cycling', 'hiking'])

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function toDateKey(dateStr: string) {
  return dateStr.slice(0, 10) // "YYYY-MM-DD"
}

const NUM_WEEKS = 8

function ThisWeekCard({
  deckSessions,
  freeSessions,
  unitSystem,
}: {
  deckSessions: DeckSessionRow[]
  freeSessions: FreeSessionRow[]
  unitSystem: 'metric' | 'imperial'
}) {
  const [selectedType, setSelectedType] = useState('all')
  const [chartWidth, setChartWidth] = useState(0)

  const today = new Date()
  const weekStart = getWeekStart(today)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  // Sessions this week
  const thisWeekDeck = deckSessions.filter(s => {
    const d = new Date(s.completed_at); return d >= weekStart && d <= weekEnd
  })
  const thisWeekFree = freeSessions.filter(s => {
    const d = new Date(s.completed_at); return d >= weekStart && d <= weekEnd
  })

  // Pills: "all" + each type present this week, in a fixed display order
  const TYPE_ORDER = ['deck', 'running', 'walking', 'cycling', 'hiking']
  const typesThisWeek = new Set<string>()
  if (thisWeekDeck.length > 0) typesThisWeek.add('deck')
  thisWeekFree.forEach(s => typesThisWeek.add(s.workout_type))
  const pills = ['all', ...TYPE_ORDER.filter(t => typesThisWeek.has(t))]

  // Filtered sessions based on selected pill
  const filteredDeck = selectedType === 'all' || selectedType === 'deck' ? thisWeekDeck : []
  const filteredFree = selectedType === 'all'
    ? thisWeekFree
    : selectedType === 'deck' ? []
    : thisWeekFree.filter(s => s.workout_type === selectedType)

  // Metrics
  const totalActivities = filteredDeck.length + filteredFree.length
  const totalSeconds    = [...filteredDeck, ...filteredFree].reduce((sum, s) => sum + s.duration_seconds, 0)
  const totalDistanceKm = filteredFree.reduce((sum, s) => sum + s.distance_km, 0)
  const totalReps       = filteredDeck.reduce((sum, s) => sum + s.total_reps, 0)

  const showDistance = DISTANCE_TYPES.has(selectedType) ||
    (selectedType === 'all' && filteredFree.length > 0)
  const showReps = selectedType === 'deck' ||
    (selectedType === 'all' && filteredDeck.length > 0)

  // Line chart: last NUM_WEEKS weeks
  const weeklyData = useMemo(() => {
    return Array.from({ length: NUM_WEEKS }, (_, i) => {
      const offset = NUM_WEEKS - 1 - i
      const wStart = getWeekStart(today)
      wStart.setDate(wStart.getDate() - offset * 7)
      const wEnd = new Date(wStart)
      wEnd.setDate(wEnd.getDate() + 6)
      wEnd.setHours(23, 59, 59, 999)
      const inRange = (dateStr: string) => { const d = new Date(dateStr); return d >= wStart && d <= wEnd }

      const dc = (selectedType === 'all' || selectedType === 'deck')
        ? deckSessions.filter(s => inRange(s.completed_at)).length : 0
      const fc = selectedType === 'all'
        ? freeSessions.filter(s => inRange(s.completed_at)).length
        : selectedType !== 'deck'
          ? freeSessions.filter(s => s.workout_type === selectedType && inRange(s.completed_at)).length
          : 0
      return { count: dc + fc, isCurrentWeek: i === NUM_WEEKS - 1 }
    })
  }, [deckSessions, freeSessions, selectedType])

  const maxCount = Math.max(...weeklyData.map(d => d.count), 1)
  const CHART_H = 72
  const PAD_Y   = 8

  const getPoint = (i: number, count: number) => ({
    x: chartWidth === 0 ? 0 : (i / (NUM_WEEKS - 1)) * chartWidth,
    y: PAD_Y + (1 - count / maxCount) * (CHART_H - PAD_Y * 2),
  })
  const points = weeklyData.map((d, i) => getPoint(i, d.count))
  const polylinePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        {/* Title */}
        <Text className="font-semibold text-gray-900 text-base mb-3">This Week</Text>

        {/* Filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 -mx-1">
          <View className="flex-row gap-2 px-1">
            {pills.map(type => (
              <Pressable
                key={type}
                onPress={() => setSelectedType(type)}
                className={`px-3 py-1 rounded-full border ${
                  selectedType === type
                    ? 'bg-green-600 border-green-600'
                    : 'bg-white border-gray-200'
                }`}
              >
                <Text className={`text-xs font-medium ${selectedType === type ? 'text-white' : 'text-gray-600'}`}>
                  {type === 'all' ? 'All' : (WORKOUT_TYPE_LABELS[type] ?? type)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Metrics row */}
        <View className="flex-row gap-5 mb-4">
          <View>
            <Text className="text-xs text-gray-500 mb-0.5">Activities</Text>
            <Text className="text-xl font-bold text-gray-900">{totalActivities}</Text>
          </View>
          <View>
            <Text className="text-xs text-gray-500 mb-0.5">Time</Text>
            <Text className="text-xl font-bold text-gray-900">{formatDurationShort(totalSeconds)}</Text>
          </View>
          {showDistance && (
            <View>
              <Text className="text-xs text-gray-500 mb-0.5">Distance</Text>
              <Text className="text-xl font-bold text-gray-900">{formatDistance(totalDistanceKm, unitSystem)}</Text>
            </View>
          )}
          {showReps && (
            <View>
              <Text className="text-xs text-gray-500 mb-0.5">Reps</Text>
              <Text className="text-xl font-bold text-gray-900">{totalReps.toLocaleString()}</Text>
            </View>
          )}
        </View>

        {/* Line chart */}
        <View onLayout={e => setChartWidth(e.nativeEvent.layout.width)} style={{ height: CHART_H }}>
          {chartWidth > 0 && (
            <Svg width={chartWidth} height={CHART_H}>
              <Polyline
                points={polylinePoints}
                fill="none"
                stroke={PRIMARY}
                strokeWidth={1.5}
              />
              {points.map((p, i) => (
                <SvgCircle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={weeklyData[i].isCurrentWeek ? 4 : 3}
                  fill={weeklyData[i].isCurrentWeek ? PRIMARY : '#fff'}
                  stroke={PRIMARY}
                  strokeWidth={1.5}
                />
              ))}
            </Svg>
          )}
        </View>

        {/* X-axis labels */}
        <View className="flex-row justify-between mt-1">
          <Text className="text-xs text-gray-400">{NUM_WEEKS - 1}w ago</Text>
          <Text className="text-xs text-green-600 font-medium">Now</Text>
        </View>
      </CardContent>
    </Card>
  )
}

/** Returns the Monday (midnight local) of the week containing `date`. */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sun
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

function computeStreak(
  deckSessions: DeckSessionRow[],
  freeSessions: FreeSessionRow[],
  weeklyGoal: number,
): { streak: number; streakActivities: number } {
  // Build map: Monday-date-key → workout count for that week
  const weekCounts = new Map<string, number>()
  const allDates = [
    ...deckSessions.map(s => new Date(s.completed_at)),
    ...freeSessions.map(s => new Date(s.completed_at)),
  ]
  for (const d of allDates) {
    const key = toDateKey(getWeekStart(d).toISOString())
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1)
  }

  const today = new Date()
  let streak = 0
  let streakActivities = 0

  // Start check from Monday of the current week
  let cursor = getWeekStart(today)

  // Include current week only if its goal is already met
  const currentKey = toDateKey(cursor.toISOString())
  if ((weekCounts.get(currentKey) ?? 0) >= weeklyGoal) {
    streak++
    streakActivities += weekCounts.get(currentKey)!
  }

  // Walk backwards through previous full weeks
  cursor.setDate(cursor.getDate() - 7)
  while (true) {
    const key = toDateKey(cursor.toISOString())
    const count = weekCounts.get(key) ?? 0
    if (count >= weeklyGoal) {
      streak++
      streakActivities += count
      cursor.setDate(cursor.getDate() - 7)
    } else {
      break
    }
  }

  return { streak, streakActivities }
}

function WorkoutCalendar({
  deckSessions,
  freeSessions,
  weeklyWorkoutGoal,
}: {
  deckSessions: DeckSessionRow[]
  freeSessions: FreeSessionRow[]
  weeklyWorkoutGoal: number
}) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  const workoutDays = useMemo(() => {
    const days = new Set<string>()
    deckSessions.forEach(s => days.add(toDateKey(s.completed_at)))
    freeSessions.forEach(s => days.add(toDateKey(s.completed_at)))
    return days
  }, [deckSessions, freeSessions])

  const { streak, streakActivities } = useMemo(
    () => computeStreak(deckSessions, freeSessions, weeklyWorkoutGoal),
    [deckSessions, freeSessions, weeklyWorkoutGoal],
  )

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const todayKey = toDateKey(today.toISOString())
  const monthLabel = today.toLocaleString('default', { month: 'long', year: 'numeric' })

  // Build flat cell array: nulls for leading blank days, then 1–daysInMonth
  const cells: (number | null)[] = Array(firstDayOfWeek).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks = Array.from({ length: cells.length / 7 }, (_, i) =>
    cells.slice(i * 7, i * 7 + 7)
  )

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        {/* Month title */}
        <Text className="font-semibold text-gray-900 text-sm mb-3 pl-1">{monthLabel}</Text>

        {/* Streak metrics */}
        <View className="flex-row gap-6 mb-3 pl-1">
          <View>
            <Text className="text-xs text-gray-500 mb-0.5">Current Streak</Text>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-xl font-bold text-gray-900">{streak}</Text>
              <Text className="text-xs text-gray-500">{streak === 1 ? 'wk' : 'wks'}</Text>
            </View>
          </View>
          <View>
            <Text className="text-xs text-gray-500 mb-0.5">Streak Activities</Text>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-xl font-bold text-gray-900">{streakActivities}</Text>
              <Text className="text-xs text-gray-500">{streakActivities === 1 ? 'workout' : 'workouts'}</Text>
            </View>
          </View>
        </View>

        {/* Day-of-week headers — 7 day cols + 1 empty goal indicator col */}
        <View className="flex-row mb-1">
          {DAY_LABELS.map((label, i) => (
            <View key={i} className="flex-1 items-center">
              <Text className="text-xs text-gray-400 font-medium">{label}</Text>
            </View>
          ))}
          <View className="w-8" />
        </View>

        {/* Calendar grid */}
        {weeks.map((week, wi) => {
          // Count workouts in this week row
          const weekWorkouts = week.filter((day): day is number => day !== null).filter(day => {
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            return workoutDays.has(key)
          }).length

          const goalMet = weekWorkouts >= weeklyWorkoutGoal
          const indicatorColor = goalMet ? '#16a34a' : '#e5e7eb'

          return (
            <View key={wi} className="flex-row">
              {week.map((day, di) => {
                if (!day) return <View key={di} className="flex-1 py-1" />
                const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const hasWorkout = workoutDays.has(key)
                const isToday = key === todayKey
                return (
                  <View key={di} className="flex-1 items-center py-1">
                    <View
                      className={`w-7 h-7 rounded-full items-center justify-center${isToday ? ' bg-green-600' : ''}`}
                    >
                      <Text className={`text-xs${isToday ? ' text-white font-bold' : ' text-gray-700'}`}>
                        {day}
                      </Text>
                    </View>
                    {/* Dot — always reserve space so rows stay uniform height */}
                    <View className="h-1.5 w-1.5 rounded-full mt-0.5" style={hasWorkout ? { backgroundColor: isToday ? '#86efac' : '#16a34a' } : undefined} />
                  </View>
                )
              })}
              {/* Goal indicator — 8th column */}
              <View className="w-8 items-center justify-center pb-1.5">
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: indicatorColor }} />
              </View>
            </View>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const healthData = useHealthData()
  const [greeting, setGreeting] = useState('Good day')
  const [loading, setLoading] = useState(true)
  const [stepGoal, setStepGoal] = useState(10000)
  const [calorieGoal, setCalorieGoal] = useState(500)
  const [activeMinutesGoal, setActiveMinutesGoal] = useState(30)
  const [weeklyWorkoutGoal, setWeeklyWorkoutGoal] = useState(3)
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric')
  const [allDeckSessions, setAllDeckSessions] = useState<DeckSessionRow[]>([])
  const [allFreeSessions, setAllFreeSessions] = useState<FreeSessionRow[]>([])

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  useEffect(() => {
    Promise.all([
      getDeckSessions().catch(() => [] as DeckSessionRow[]),
      getFreeSessions().catch(() => [] as FreeSessionRow[]),
    ]).then(([deck, free]) => {
      setAllDeckSessions(deck)
      setAllFreeSessions(free)
    }).finally(() => setLoading(false))

    getProfile().then((p) => {
      if (p) {
        setStepGoal(p.step_goal)
        setCalorieGoal(p.calorie_goal)
        setActiveMinutesGoal(p.active_minutes_goal ?? 30)
        setWeeklyWorkoutGoal(p.weekly_workout_goal ?? 3)
        setUnitSystem(p.unit_system ?? 'metric')
      }
    }).catch(() => {})
  }, [])

  const todayStr = new Date().toDateString()
  const todayDeck = allDeckSessions.filter(s => new Date(s.completed_at).toDateString() === todayStr)
  const todayFree = allFreeSessions.filter(s => new Date(s.completed_at).toDateString() === todayStr)

  const todayActiveMinutes = Math.round(
    [...todayDeck, ...todayFree].reduce((sum, s) => sum + s.duration_seconds, 0) / 60
  )
  const sessionCalories = Math.round(
    todayDeck.reduce((sum, s) => sum + s.total_reps * 0.5, 0) +
    todayFree.reduce((sum, s) => sum + s.calories, 0)
  )
  // Prefer live HealthKit/Health Connect calories when available
  const todayCalories = healthData.calories > 0 ? healthData.calories : sessionCalories

return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="px-4 pb-6 bg-green-50" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-gray-500 text-sm">{greeting}</Text>
        <Text className="text-2xl font-bold text-gray-900 mt-1">Ready to work out?</Text>
      </View>

      <View className="px-4 gap-5 mt-4">
        {/* Start Workout Banner */}
        <Pressable onPress={() => router.push('/record')}>
          <Card className="bg-green-600 border-green-700">
            <CardContent className="pt-5 pb-4">
              {/* Top row */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1 mr-3">
                  <Text className="text-white font-bold text-xl">Start a Workout</Text>
                  <Text className="text-green-100 text-sm mt-1">
                    Choose from card-based decks or track a free activity
                  </Text>
                </View>
                <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                  <Play size={20} color="white" />
                </View>
              </View>
              {/* Workout type pills */}
              <View className="flex-row flex-wrap gap-2">
                <View className="flex-row items-center bg-white/20 rounded-full px-3 py-1">
                  <Layers size={12} color="white" />
                  <Text className="text-white text-xs font-medium ml-1">Deck of WODs</Text>
                </View>
                <View className="flex-row items-center bg-white/20 rounded-full px-3 py-1">
                  <Footprints size={12} color="white" />
                  <Text className="text-white text-xs font-medium ml-1">Running</Text>
                </View>
                <View className="flex-row items-center bg-white/20 rounded-full px-3 py-1">
                  <Bike size={12} color="white" />
                  <Text className="text-white text-xs font-medium ml-1">Cycling</Text>
                </View>
                <View className="flex-row items-center bg-white/20 rounded-full px-3 py-1">
                  <Mountain size={12} color="white" />
                  <Text className="text-white text-xs font-medium ml-1">& more</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </Pressable>

        {/* Today's Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex-row items-center gap-2">
              <TrendingUp size={16} color={PRIMARY} />
              <Text className="text-base font-semibold text-gray-900 ml-2">{"Today's Activity"}</Text>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <View className="flex-row flex-wrap gap-y-4">
              {/* Steps */}
              <View className="w-1/2 pr-2">
                <View className="flex-row items-center gap-1 mb-1">
                  <Footprints size={14} color="#3b82f6" />
                  <Text className="text-xs text-gray-500 ml-1">Steps</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-900">
                  {healthData.steps.toLocaleString()}<Text className="text-sm font-normal text-gray-500">/{stepGoal.toLocaleString()}</Text>
                </Text>
                <Progress value={Math.min((healthData.steps / stepGoal) * 100, 100)} className="h-2 mt-1" />
              </View>

              {/* Calories */}
              <View className="w-1/2 pl-2">
                <View className="flex-row items-center gap-1 mb-1">
                  <Flame size={14} color="#f97316" />
                  <Text className="text-xs text-gray-500 ml-1">Calories</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-900">
                  {todayCalories}<Text className="text-sm font-normal text-gray-500">/{calorieGoal}</Text>
                </Text>
                <Progress value={Math.min((todayCalories / calorieGoal) * 100, 100)} className="h-2 mt-1" />
              </View>

              {/* Heart Rate */}
              <View className="w-1/2 pr-2">
                <View className="flex-row items-center gap-1 mb-1">
                  <Heart size={14} color="#ef4444" />
                  <Text className="text-xs text-gray-500 ml-1">Heart Rate</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-900">
                  {healthData.heartRate != null ? `${Math.round(healthData.heartRate)}` : '—'}
                  {healthData.heartRate != null && <Text className="text-sm font-normal text-gray-500"> bpm</Text>}
                </Text>
              </View>

              {/* Active Minutes */}
              <View className="w-1/2 pl-2">
                <View className="flex-row items-center gap-1 mb-1">
                  <Dumbbell size={14} color="#22c55e" />
                  <Text className="text-xs text-gray-500 ml-1">Active</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-900">
                  {todayActiveMinutes}<Text className="text-sm font-normal text-gray-500">/{activeMinutesGoal} min</Text>
                </Text>
                <Progress value={Math.min((todayActiveMinutes / activeMinutesGoal) * 100, 100)} className="h-2 mt-1" />
              </View>
            </View>
          </CardContent>
        </Card>

        {/* This Week */}
        <ThisWeekCard deckSessions={allDeckSessions} freeSessions={allFreeSessions} unitSystem={unitSystem} />

        {/* Workout Calendar */}
        <WorkoutCalendar deckSessions={allDeckSessions} freeSessions={allFreeSessions} weeklyWorkoutGoal={weeklyWorkoutGoal} />

      </View>
    </ScrollView>
  )
}
