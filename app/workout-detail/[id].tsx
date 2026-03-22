import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import {
  ChevronLeft,
  Layers,
  Footprints,
  Bike,
  Mountain,
  MapPin,
  Clock,
  Zap,
  BarChart2,
  Activity,
} from 'lucide-react-native'
import { Card, CardContent } from '@/components/ui/card'
import { getDeckSessionById, type DeckSessionRow } from '@/lib/db/sessions'
import { getFreeSessionById, type FreeSessionRow } from '@/lib/db/free-sessions'

const PRIMARY  = '#16a34a'
const ACCENT   = '#f97316'
const MUTED    = '#6b7280'

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// ── Metric tile ───────────────────────────────────────────────────────────────

function MetricTile({ label, value, unit, icon }: {
  label: string
  value: string
  unit?: string
  icon: React.ReactNode
}) {
  return (
    <View className="flex-1 bg-white rounded-2xl border border-gray-100 p-4 items-center">
      <View className="mb-1">{icon}</View>
      <Text className="text-xs text-gray-500 mb-1 text-center">{label}</Text>
      <Text className="text-xl font-bold text-gray-900 text-center">
        {value}
        {unit && <Text className="text-sm font-normal text-gray-500"> {unit}</Text>}
      </Text>
    </View>
  )
}

// ── Deck detail ───────────────────────────────────────────────────────────────

function DeckDetail({ session }: { session: DeckSessionRow }) {
  const exercises = [
    { suit: 'Hearts',   name: session.hearts_exercise },
    { suit: 'Diamonds', name: session.diamonds_exercise },
    { suit: 'Clubs',    name: session.clubs_exercise },
    { suit: 'Spades',   name: session.spades_exercise },
  ]

  const repsPerMin = session.reps_per_minute != null
    ? session.reps_per_minute.toFixed(0)
    : session.duration_seconds > 0
      ? ((session.total_reps / session.duration_seconds) * 60).toFixed(0)
      : '—'

  return (
    <>
      {/* Metrics */}
      <View className="flex-row gap-3 mb-4">
        <MetricTile
          label="Duration"
          value={formatDuration(session.duration_seconds)}
          icon={<Clock size={18} color={PRIMARY} />}
        />
        <MetricTile
          label="Cards"
          value={`${session.cards_completed}`}
          icon={<Layers size={18} color={PRIMARY} />}
        />
      </View>
      <View className="flex-row gap-3 mb-5">
        <MetricTile
          label="Total Reps"
          value={session.total_reps.toLocaleString()}
          icon={<BarChart2 size={18} color={PRIMARY} />}
        />
        <MetricTile
          label="Reps / Min"
          value={repsPerMin}
          icon={<Zap size={18} color={PRIMARY} />}
        />
      </View>

      {/* Exercise breakdown */}
      <Card className="mb-5">
        <CardContent className="pt-4 pb-3">
          <Text className="font-semibold text-gray-900 mb-3">Exercise Breakdown</Text>
          {exercises.map(ex => (
            <View key={ex.suit} className="flex-row justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <Text className="text-sm text-gray-500">{ex.suit}</Text>
              <Text className="text-sm font-medium text-gray-900">{ex.name}</Text>
            </View>
          ))}
          <View className="flex-row justify-between items-center pt-3 mt-1 border-t border-gray-100">
            <Text className="text-sm font-semibold text-gray-700">Total Reps</Text>
            <Text className="text-sm font-bold text-gray-900">{session.total_reps.toLocaleString()}</Text>
          </View>
        </CardContent>
      </Card>
    </>
  )
}

// ── Free workout detail ───────────────────────────────────────────────────────

function FreeDetail({ session }: { session: FreeSessionRow }) {
  const distanceKm = session.distance_km
  const pace = session.duration_seconds > 0 && distanceKm > 0
    ? session.duration_seconds / 60 / distanceKm   // min/km
    : null
  const paceStr = pace != null
    ? `${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2, '0')}`
    : '—'

  const speed = session.avg_speed_kmh != null
    ? session.avg_speed_kmh.toFixed(1)
    : distanceKm > 0 && session.duration_seconds > 0
      ? ((distanceKm / session.duration_seconds) * 3600).toFixed(1)
      : '—'

  const showsPace = session.workout_type === 'running' || session.workout_type === 'walking'

  return (
    <>
      {/* Metrics */}
      <View className="flex-row gap-3 mb-4">
        <MetricTile
          label="Duration"
          value={formatDuration(session.duration_seconds)}
          icon={<Clock size={18} color={ACCENT} />}
        />
        <MetricTile
          label="Distance"
          value={distanceKm.toFixed(2)}
          unit="km"
          icon={<Activity size={18} color={ACCENT} />}
        />
      </View>
      <View className="flex-row gap-3 mb-5">
        <MetricTile
          label="Calories"
          value={Math.round(session.calories).toLocaleString()}
          unit="kcal"
          icon={<Zap size={18} color={ACCENT} />}
        />
        <MetricTile
          label={showsPace ? 'Pace' : 'Avg Speed'}
          value={showsPace ? paceStr : speed}
          unit={showsPace ? 'min/km' : 'km/h'}
          icon={<BarChart2 size={18} color={ACCENT} />}
        />
      </View>
    </>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function WorkoutDetailScreen() {
  const insets = useSafeAreaInsets()
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>()

  const [loading, setLoading] = useState(true)
  const [deckSession, setDeckSession] = useState<DeckSessionRow | null>(null)
  const [freeSession, setFreeSession] = useState<FreeSessionRow | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return }
    if (type === 'deck') {
      getDeckSessionById(id)
        .then(s => { if (s) setDeckSession(s); else setNotFound(true) })
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false))
    } else {
      getFreeSessionById(id)
        .then(s => { if (s) setFreeSession(s); else setNotFound(true) })
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false))
    }
  }, [id, type])

  // Derive display info
  const isDeck = type === 'deck'
  const completedAt = deckSession?.completed_at ?? freeSession?.completed_at
  const freeType = freeSession?.workout_type
  const accentColor = isDeck ? PRIMARY : ACCENT

  const TypeIcon = isDeck
    ? Layers
    : freeType === 'cycling' ? Bike : freeType === 'hiking' ? Mountain : Footprints

  const title = isDeck
    ? 'Deck of WODs'
    : freeType
      ? freeType.charAt(0).toUpperCase() + freeType.slice(1)
      : 'Workout'

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 items-center justify-center rounded-full bg-gray-100 mr-3"
        >
          <ChevronLeft size={20} color="#374151" />
        </Pressable>
        <View
          className="w-9 h-9 rounded-xl items-center justify-center mr-2"
          style={{ backgroundColor: isDeck ? '#dcfce7' : '#ffedd5' }}
        >
          <TypeIcon size={18} color={accentColor} />
        </View>
        <Text className="text-lg font-bold text-gray-900 flex-1">{title}</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : notFound ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-gray-500 text-center">Workout not found.</Text>
          <Pressable onPress={() => router.back()} className="mt-4">
            <Text className="text-green-600 font-medium">Go back</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Date / time hero */}
          {completedAt && (
            <View className="mb-5">
              <Text className="text-base font-semibold text-gray-900">{formatFullDate(completedAt)}</Text>
              <Text className="text-sm text-gray-500 mt-0.5">{formatTime(completedAt)}</Text>
            </View>
          )}

          {/* Type-specific metrics + breakdown */}
          {isDeck && deckSession && <DeckDetail session={deckSession} />}
          {!isDeck && freeSession && <FreeDetail session={freeSession} />}

          {/* Map placeholder */}
          <Card>
            <CardContent className="py-6 items-center">
              <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center mb-3">
                <MapPin size={26} color={MUTED} />
              </View>
              <Text className="font-medium text-gray-700 mb-1">Route map coming soon</Text>
              <Text className="text-xs text-gray-400 text-center">
                Location and GPS route tracking will be available in a future update
              </Text>
            </CardContent>
          </Card>
        </ScrollView>
      )}
    </View>
  )
}
