import { useState, useEffect } from 'react'
import { ScrollView, View, Text, Pressable } from 'react-native'
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const healthData = useHealthData()
  const [greeting, setGreeting] = useState('Good day')
  const [loading, setLoading] = useState(true)
  const [stepGoal, setStepGoal] = useState(10000)
  const [calorieGoal, setCalorieGoal] = useState(500)
  const [activeMinutesGoal, setActiveMinutesGoal] = useState(30)
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

  const recentMerged = [
    ...allDeckSessions.map(d => ({ id: d.id, completed_at: d.completed_at, kind: 'deck' as const, raw: d })),
    ...allFreeSessions.map(f => ({ id: f.id, completed_at: f.completed_at, kind: 'free' as const, raw: f })),
  ].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()).slice(0, 3)

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
        {/* Quick Actions */}
        <View className="flex-row gap-3">
          <Pressable className="flex-1" onPress={() => router.push('/deck')}>
            <Card>
              <CardContent className="pt-5 pb-4">
                <View className="flex-row items-start justify-between">
                  <View>
                    <View className="w-10 h-10 rounded-xl bg-green-100 items-center justify-center mb-3">
                      <Layers size={20} color={PRIMARY} />
                    </View>
                    <Text className="font-semibold text-gray-900">Deck of WODs</Text>
                    <Text className="text-sm text-gray-500 mt-0.5">Card-based workout</Text>
                  </View>
                  <Play size={18} color={MUTED_FG} />
                </View>
              </CardContent>
            </Card>
          </Pressable>

          <Pressable className="flex-1" onPress={() => router.push('/record')}>
            <Card>
              <CardContent className="pt-5 pb-4">
                <View className="flex-row items-start justify-between">
                  <View>
                    <View className="w-10 h-10 rounded-xl bg-orange-100 items-center justify-center mb-3">
                      <Dumbbell size={20} color={ACCENT} />
                    </View>
                    <Text className="font-semibold text-gray-900">Free Workout</Text>
                    <Text className="text-sm text-gray-500 mt-0.5">Track any activity</Text>
                  </View>
                  <Play size={18} color={MUTED_FG} />
                </View>
              </CardContent>
            </Card>
          </Pressable>
        </View>

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

        {/* Recent Workouts */}
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-gray-900">Recent Workouts</Text>
            <Pressable
              className="flex-row items-center gap-1"
              onPress={() => router.push('/history')}
            >
              <Text className="text-sm text-gray-500">View all</Text>
              <ChevronRight size={16} color={MUTED_FG} />
            </Pressable>
          </View>

          <View className="gap-2">
            {loading ? (
              <Card>
                <CardContent className="py-8 items-center">
                  <Text className="text-gray-500 text-sm">Loading…</Text>
                </CardContent>
              </Card>
            ) : recentMerged.length === 0 ? (
              <Card>
                <CardContent className="py-10 items-center">
                  <View className="w-12 h-12 rounded-xl bg-green-100 items-center justify-center mb-3">
                    <Layers size={24} color={PRIMARY} />
                  </View>
                  <Text className="font-medium text-gray-900">No workouts yet</Text>
                  <Text className="text-sm text-gray-500 mt-1 mb-4 text-center">
                    Complete your first workout to see it here.
                  </Text>
                  <Pressable
                    className="bg-green-600 px-4 py-2 rounded-lg flex-row items-center gap-2"
                    onPress={() => router.push('/deck')}
                  >
                    <Play size={16} color="#fff" />
                    <Text className="text-white font-semibold text-sm">Start your first workout!</Text>
                  </Pressable>
                </CardContent>
              </Card>
            ) : (
              recentMerged.map((item) => {
                if (item.kind === 'deck') {
                  const s = item.raw as DeckSessionRow
                  return (
                    <Card key={item.id}>
                      <CardContent className="py-3">
                        <View className="flex-row items-center gap-3">
                          <View className="w-12 h-12 rounded-xl bg-green-100 items-center justify-center">
                            <Layers size={24} color={PRIMARY} />
                          </View>
                          <View className="flex-1">
                            <Text className="font-medium text-gray-900">Deck of WODs</Text>
                            <Text className="text-sm text-gray-500">
                              {formatDate(s.completed_at)} · {formatDuration(s.duration_seconds)} · {s.total_reps} reps
                            </Text>
                          </View>
                          <ChevronRight size={18} color={MUTED_FG} />
                        </View>
                      </CardContent>
                    </Card>
                  )
                }
                const s = item.raw as FreeSessionRow
                const FreeIcon = s.workout_type === 'cycling' ? Bike : s.workout_type === 'hiking' ? Mountain : Footprints
                return (
                  <Card key={item.id}>
                    <CardContent className="py-3">
                      <View className="flex-row items-center gap-3">
                        <View className="w-12 h-12 rounded-xl bg-orange-100 items-center justify-center">
                          <FreeIcon size={24} color={ACCENT} />
                        </View>
                        <View className="flex-1">
                          <Text className="font-medium text-gray-900 capitalize">{s.workout_type}</Text>
                          <Text className="text-sm text-gray-500">
                            {formatDate(s.completed_at)} · {formatDuration(s.duration_seconds)} · {Math.round(s.calories)} kcal
                          </Text>
                        </View>
                        <ChevronRight size={18} color={MUTED_FG} />
                      </View>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  )
}
