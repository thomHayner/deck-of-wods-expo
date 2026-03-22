import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, AppState } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Layers, Footprints, Bike, Mountain, User, ChevronRight, Settings, TrendingUp, Activity, Flame, Dumbbell, Shield, Leaf } from 'lucide-react-native'
import { Card, CardContent } from '@/components/ui/card'
import { getDeckSessions, type DeckSessionRow } from '@/lib/db/sessions'
import { getFreeSessions, type FreeSessionRow } from '@/lib/db/free-sessions'
import { supabase } from '@/lib/supabase/client'

const PRIMARY = '#16a34a'
const ACCENT  = '#f97316'
const MUTED   = '#6b7280'

type Tab = 'progress' | 'workouts' | 'activities'

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// ── Coming soon placeholder ───────────────────────────────────────────────────

function ComingSoon({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-24">
      <View className="w-16 h-16 rounded-2xl bg-gray-100 items-center justify-center mb-4">
        {icon}
      </View>
      <Text className="text-lg font-bold text-gray-900 mb-2 text-center">{title}</Text>
      <Text className="text-sm text-gray-500 text-center leading-5">{description}</Text>
      <View className="mt-4 px-4 py-1.5 bg-green-100 rounded-full">
        <Text className="text-xs font-semibold text-green-700">Coming Soon</Text>
      </View>
    </View>
  )
}

// ── Activities tab ────────────────────────────────────────────────────────────

function ActivitiesTab({
  loading,
  merged,
}: {
  loading: boolean
  merged: { id: string; completed_at: string; kind: 'deck' | 'free'; raw: DeckSessionRow | FreeSessionRow }[]
}) {
  if (loading) {
    return (
      <View className="h-40 items-center justify-center">
        <ActivityIndicator color={PRIMARY} />
      </View>
    )
  }

  if (merged.length === 0) {
    return (
      <View className="bg-white rounded-xl border border-gray-200 py-12 items-center">
        <User size={32} color={MUTED} />
        <Text className="font-medium text-gray-900 mt-3">No workouts yet</Text>
        <Text className="text-sm text-gray-500 mt-1">Complete a workout to see it here</Text>
      </View>
    )
  }

  return (
    <View className="gap-2">
      {merged.map(item => {
        if (item.kind === 'deck') {
          const s = item.raw as DeckSessionRow
          return (
            <Pressable
              key={item.id}
              onPress={() => router.push({ pathname: '/workout-detail/[id]', params: { id: item.id, type: 'deck' } })}
              className="active:opacity-70"
            >
              <Card>
                <CardContent className="py-3">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-xl bg-green-100 items-center justify-center">
                      <Layers size={20} color={PRIMARY} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-medium text-gray-900">Deck of WODs</Text>
                      <Text className="text-sm text-gray-500">
                        {formatDate(s.completed_at)} · {formatDuration(s.duration_seconds)} · {s.total_reps} reps
                      </Text>
                    </View>
                    <ChevronRight size={16} color={MUTED} />
                  </View>
                </CardContent>
              </Card>
            </Pressable>
          )
        }
        const s = item.raw as FreeSessionRow
        const Icon = s.workout_type === 'cycling' ? Bike : s.workout_type === 'hiking' ? Mountain : Footprints
        return (
          <Pressable
            key={item.id}
            onPress={() => router.push({ pathname: '/workout-detail/[id]', params: { id: item.id, type: 'free' } })}
            className="active:opacity-70"
          >
            <Card>
              <CardContent className="py-3">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl bg-orange-100 items-center justify-center">
                    <Icon size={20} color={ACCENT} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-gray-900 capitalize">{s.workout_type}</Text>
                    <Text className="text-sm text-gray-500">
                      {formatDate(s.completed_at)} · {formatDuration(s.duration_seconds)} · {Math.round(s.calories)} kcal
                    </Text>
                  </View>
                  <ChevronRight size={16} color={MUTED} />
                </View>
              </CardContent>
            </Card>
          </Pressable>
        )
      })}
    </View>
  )
}

// ── Workouts tab ──────────────────────────────────────────────────────────────

const WORKOUT_CATEGORIES = [
  { id: 'burn',     label: 'Burn',     Icon: Flame,    color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  { id: 'build',    label: 'Build',    Icon: Dumbbell, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'maintain', label: 'Maintain', Icon: Shield,   color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'recover',  label: 'Recover',  Icon: Leaf,     color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
] as const

type WorkoutCategory = typeof WORKOUT_CATEGORIES[number]['id']

function WorkoutsTab() {
  const [selected, setSelected] = useState<WorkoutCategory>('burn')
  const active = WORKOUT_CATEGORIES.find(c => c.id === selected)!

  return (
    <View className="flex-1">
      {/* Category buttons */}
      <View className="flex-row gap-3 mb-4">
        {WORKOUT_CATEGORIES.map(({ id, label, Icon, color, bg, border }) => {
          const isSelected = selected === id
          return (
            <Pressable
              key={id}
              onPress={() => setSelected(id)}
              className="flex-1 items-center py-3 rounded-xl border"
              style={{ backgroundColor: isSelected ? bg : '#fff', borderColor: isSelected ? border : '#e5e7eb' }}
            >
              <Icon size={22} color={isSelected ? color : MUTED} />
              <Text
                className="text-xs font-semibold mt-1.5"
                style={{ color: isSelected ? color : MUTED }}
              >
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Expanding card */}
      <Card className="flex-1">
        <CardContent className="flex-1 items-center justify-center">
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
            style={{ backgroundColor: active.bg }}
          >
            <active.Icon size={30} color={active.color} />
          </View>
          <Text className="text-lg font-bold text-gray-900 mb-2">{active.label} Workouts</Text>
          <Text className="text-sm text-gray-500 text-center leading-5 mb-4">
            Curated {active.label.toLowerCase()} programs and plans{'\n'}are on their way.
          </Text>
          <View className="px-4 py-1.5 bg-gray-100 rounded-full">
            <Text className="text-xs font-semibold text-gray-500">Coming Soon</Text>
          </View>
        </CardContent>
      </Card>
    </View>
  )
}

// ── Progress tab ──────────────────────────────────────────────────────────────
function ProgressTab({
  deckSessions,
  freeSessions,
  loading,
}: {
  deckSessions: DeckSessionRow[]
  freeSessions: FreeSessionRow[]
  loading: boolean
}) {
  if (loading) {
    return (
      <View className="h-40 items-center justify-center">
        <ActivityIndicator color={PRIMARY} />
      </View>
    )
  }
  // useEffect(() => {
  //   function loadData() {
  //     setLoading(true)
  //     Promise.all([
  //       getDeckSessions().catch(() => [] as DeckSessionRow[]),
  //       getFreeSessions().catch(() => [] as FreeSessionRow[]),
  //     ]).then(([deck, free]) => {
  //       setDeckSessions(deck)
  //       setFreeSessions(free)
  //     }).finally(() => setLoading(false))
  //   }

  //   loadData()

  //   const subscription = AppState.addEventListener('change', state => {
  //     if (state === 'active') loadData()
  //   })

  //   return () => subscription.remove()
  // }, [])

  const totalWorkouts = deckSessions.length + freeSessions.length
  const totalSeconds  = [...deckSessions, ...freeSessions].reduce((s, x) => s + x.duration_seconds, 0)
  const totalReps     = deckSessions.reduce((s, x) => s + x.total_reps, 0)

  return (
    <View >
      {/* Stats summary */}
      <View className="flex-row gap-3 mb-5">
        <View className="flex-1 bg-white rounded-xl border border-gray-200 p-4 items-center">
          <Text className="text-2xl font-bold text-gray-900">{totalWorkouts}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">Workouts</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl border border-gray-200 p-4 items-center">
          <Text className="text-2xl font-bold text-gray-900">
            {(totalSeconds / 3600).toFixed(1)}h
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">Total Time</Text>
        </View>
        <View className="flex-1 bg-white rounded-xl border border-gray-200 p-4 items-center">
          <Text className="text-2xl font-bold text-gray-900">{totalReps}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">Total Reps</Text>
        </View>
      </View>
      <ComingSoon
        icon={<TrendingUp size={28} color={MUTED} />}
        title="Progress Tracking"
        description="Charts and trends showing how your fitness is improving over time."
      />
    </View>
  )
}
// ── Main screen ───────────────────────────────────────────────────────────────

export default function YouScreen() {
  const insets = useSafeAreaInsets()
  const [initials, setInitials] = useState('?')
  const [activeTab, setActiveTab] = useState<Tab>('activities')
  const [deckSessions, setDeckSessions] = useState<DeckSessionRow[]>([])
  const [freeSessions, setFreeSessions] = useState<FreeSessionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? ''
      setInitials(email.charAt(0).toUpperCase() || '?')
    })
  }, [])

  useEffect(() => {
    function loadData() {
      setLoading(true)
      Promise.all([
        getDeckSessions().catch(() => [] as DeckSessionRow[]),
        getFreeSessions().catch(() => [] as FreeSessionRow[]),
      ]).then(([deck, free]) => {
        setDeckSessions(deck)
        setFreeSessions(free)
      }).finally(() => setLoading(false))
    }

    loadData()

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') loadData()
    })

    return () => subscription.remove()
  }, [])

  const totalWorkouts = deckSessions.length + freeSessions.length
  const totalSeconds  = [...deckSessions, ...freeSessions].reduce((s, x) => s + x.duration_seconds, 0)
  const totalReps     = deckSessions.reduce((s, x) => s + x.total_reps, 0)

  const merged = [
    ...deckSessions.map(d => ({ id: d.id, completed_at: d.completed_at, kind: 'deck' as const, raw: d })),
    ...freeSessions.map(f => ({ id: f.id, completed_at: f.completed_at, kind: 'free' as const, raw: f })),
  ].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
        {/* Top row: avatar · title · settings */}
        <View className="flex-row items-center justify-between mb-3">
          <Pressable
            onPress={() => router.push('/profile')}
            className="w-10 h-10 rounded-full bg-green-600 items-center justify-center"
          >
            <Text className="text-white font-bold text-base">{initials}</Text>
          </Pressable>
          <Text className="text-xl font-bold text-gray-900">You</Text>
          <Pressable
            onPress={() => router.push('/profile')}
            className="w-10 h-10 items-center justify-center"
          >
            <Settings size={22} color={MUTED} />
          </Pressable>
        </View>

        {/* Tab pills */}
        <View className="flex-row bg-gray-100 rounded-xl p-1 gap-1">
          {([
            { id: 'progress',   label: 'Progress' },
            { id: 'workouts',   label: 'Workouts' },
            { id: 'activities', label: 'Activities' },
          ] as { id: Tab; label: string }[]).map(tab => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className="flex-1 py-2 rounded-lg items-center"
              style={activeTab === tab.id ? { backgroundColor: 'white' } : undefined}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: activeTab === tab.id ? '#111827' : '#6b7280' }}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        key={activeTab}
        scrollEnabled={activeTab !== 'workouts'}
        contentContainerStyle={
          activeTab === 'workouts'
            ? { flex: 1, padding: 16, paddingBottom: insets.bottom + 16 }
            : { padding: 16, paddingBottom: insets.bottom + 16 }
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'progress' && (
          <ProgressTab deckSessions={deckSessions} freeSessions={freeSessions} loading={loading} />
        )}

        {activeTab === 'workouts' && <WorkoutsTab />}

        {activeTab === 'activities' && (
          <ActivitiesTab loading={loading} merged={merged} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
