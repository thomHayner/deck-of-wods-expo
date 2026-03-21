import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Layers, Footprints, Bike, Mountain, User, ChevronRight } from 'lucide-react-native'
import { Card, CardContent } from '@/components/ui/card'
import { getDeckSessions, type DeckSessionRow } from '@/lib/db/sessions'
import { getFreeSessions, type FreeSessionRow } from '@/lib/db/free-sessions'
import { supabase } from '@/lib/supabase/client'
import { useSyncHistoryToWatch } from '@/hooks/useWatchSession'

const PRIMARY = '#16a34a'
const ACCENT  = '#f97316'
const MUTED   = '#6b7280'

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

export default function YouScreen() {
  const insets = useSafeAreaInsets()
  useSyncHistoryToWatch()
  const [initials, setInitials] = useState('?')
  const [deckSessions, setDeckSessions] = useState<DeckSessionRow[]>([])
  const [freeSessions, setFreeSessions] = useState<FreeSessionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? ''
      setInitials(email.charAt(0).toUpperCase() || '?')
    })
    Promise.all([
      getDeckSessions().catch(() => [] as DeckSessionRow[]),
      getFreeSessions().catch(() => [] as FreeSessionRow[]),
    ]).then(([deck, free]) => {
      setDeckSessions(deck)
      setFreeSessions(free)
    }).finally(() => setLoading(false))
  }, [])

  const totalWorkouts = deckSessions.length + freeSessions.length
  const totalSeconds  = [...deckSessions, ...freeSessions].reduce((s, x) => s + x.duration_seconds, 0)
  const totalReps     = deckSessions.reduce((s, x) => s + x.total_reps, 0)

  const merged = [
    ...deckSessions.map(d => ({ id: d.id, completed_at: d.completed_at, kind: 'deck' as const, raw: d })),
    ...freeSessions.map(f => ({ id: f.id, completed_at: f.completed_at, kind: 'free' as const, raw: f })),
  ].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-4 pb-3 border-b border-gray-200 bg-white flex-row items-center justify-between">
        <Pressable
          onPress={() => router.push('/profile')}
          className="w-10 h-10 rounded-full bg-green-600 items-center justify-center"
        >
          <Text className="text-white font-bold text-base">{initials}</Text>
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">You</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
      >
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

        {/* Workout history */}
        <Text className="font-semibold text-gray-900 mb-3">Workout History</Text>

        {loading ? (
          <View className="h-32 items-center justify-center">
            <ActivityIndicator color={PRIMARY} />
          </View>
        ) : merged.length === 0 ? (
          <View className="bg-white rounded-xl border border-gray-200 py-12 items-center">
            <User size={32} color={MUTED} />
            <Text className="font-medium text-gray-900 mt-3">No workouts yet</Text>
            <Text className="text-sm text-gray-500 mt-1">Complete a workout to see it here</Text>
          </View>
        ) : (
          <View className="gap-2">
            {merged.map(item => {
              if (item.kind === 'deck') {
                const s = item.raw as DeckSessionRow
                return (
                  <Card key={item.id}>
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
                )
              }
              const s = item.raw as FreeSessionRow
              const Icon = s.workout_type === 'cycling' ? Bike : s.workout_type === 'hiking' ? Mountain : Footprints
              return (
                <Card key={item.id}>
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
              )
            })}
          </View>
        )}

        {/* Sign out */}
        <Pressable
          onPress={async () => { await supabase.auth.signOut(); router.replace('/auth') }}
          className="mt-6 items-center py-3"
        >
          <Text className="text-gray-400 text-sm">Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}
