import { useState, useEffect, useMemo } from 'react'
import {
  View, Text, ScrollView, TextInput, Pressable, Switch,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { ChevronLeft, Plus, Minus } from 'lucide-react-native'
import { Card, CardContent } from '@/components/ui/card'
import {
  calculateConfigCardCount,
  calculateConfigTotalReps,
  calculateConfigExerciseCount,
  type DeckConfig,
  type RepsMode,
} from '@/lib/deck-config'
import { getDeckConfigs, createDeckConfig, updateDeckConfigById } from '@/lib/db/deck-configs'
import { getSuitSymbol, DEFAULT_EXERCISES, type Suit } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SuitConfig {
  exercise: string
  repsMode: 'card-value' | 'fixed' | 'timed'
  fixedReps: number
  timedSeconds: number
}

const ALL_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const ALL_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

const SUIT_COLORS: Record<Suit, string> = {
  hearts:   '#dc2626',
  diamonds: '#dc2626',
  clubs:    '#171717',
  spades:   '#171717',
}

const PRIMARY = '#16a34a'
const MUTED = '#6b7280'

function defaultSuits(): Record<Suit, SuitConfig> {
  return {
    hearts:   { exercise: DEFAULT_EXERCISES.hearts.name,   repsMode: 'card-value', fixedReps: 10, timedSeconds: 30 },
    diamonds: { exercise: DEFAULT_EXERCISES.diamonds.name, repsMode: 'card-value', fixedReps: 10, timedSeconds: 30 },
    clubs:    { exercise: DEFAULT_EXERCISES.clubs.name,    repsMode: 'card-value', fixedReps: 10, timedSeconds: 30 },
    spades:   { exercise: DEFAULT_EXERCISES.spades.name,   repsMode: 'card-value', fixedReps: 10, timedSeconds: 30 },
  }
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function buildConfig(
  suits: Record<Suit, SuitConfig>,
  includeJokers: boolean,
  jokerCount: number,
  jokerExercise: string,
): DeckConfig {
  const groups = ALL_SUITS.map(suit => {
    const sc = suits[suit]
    const repsMode: RepsMode =
      sc.repsMode === 'fixed' ? { kind: 'fixed', reps: sc.fixedReps } :
      sc.repsMode === 'timed' ? { kind: 'timed', seconds: sc.timedSeconds } :
      { kind: 'card-value' }
    return {
      id: `builder-${suit}`,
      values: ALL_VALUES,
      repsMode,
      assignment: { kind: 'per-suit' as const, exercise: sc.exercise.trim(), suit },
    }
  })

  if (includeJokers) {
    groups.push({
      id: 'builder-joker',
      values: [0],
      repsMode: { kind: 'fixed', reps: 10 },
      assignment: { kind: 'all-suits' as const, exercise: jokerExercise.trim() },
    })
  }

  return { format: 'standard', groups, includeJokers, jokerCount }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, className }: { title: string; className?: string }) {
  return (
    <Text className={`text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1 ${className ?? ''}`}>
      {title}
    </Text>
  )
}

function StepperControl({
  value, min, max, step = 1, onChange,
}: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        onPress={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        className={`w-8 h-8 rounded-lg border border-gray-300 items-center justify-center ${value <= min ? 'opacity-40' : ''}`}
      >
        <Minus size={14} color="#374151" />
      </Pressable>
      <Text className="text-base font-semibold text-gray-900 w-8 text-center">{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        className={`w-8 h-8 rounded-lg border border-gray-300 items-center justify-center ${value >= max ? 'opacity-40' : ''}`}
      >
        <Plus size={14} color="#374151" />
      </Pressable>
    </View>
  )
}

function SuitRow({ suit, config, onChange }: {
  suit: Suit
  config: SuitConfig
  onChange: (partial: Partial<SuitConfig>) => void
}) {
  const symbol = getSuitSymbol(suit)
  const color = SUIT_COLORS[suit]
  const suitLabel = suit.charAt(0).toUpperCase() + suit.slice(1)

  return (
    <Card className="mb-3">
      <CardContent>
        <View className="flex-row items-center gap-2 mb-3">
          <Text style={{ color, fontSize: 22, lineHeight: 26 }}>{symbol}</Text>
          <Text className="font-semibold text-gray-900 text-base">{suitLabel}</Text>
        </View>

        <Text className="text-sm font-medium text-gray-700 mb-1.5">Exercise</Text>
        <TextInput
          className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-base mb-3"
          value={config.exercise}
          onChangeText={v => onChange({ exercise: v })}
          placeholder={DEFAULT_EXERCISES[suit].name}
          returnKeyType="done"
          placeholderTextColor={MUTED}
        />

        <Text className="text-sm font-medium text-gray-700 mb-1.5">Reps Mode</Text>
        <View className="flex-row gap-2 mb-2">
          {(['card-value', 'fixed', 'timed'] as const).map(mode => {
            const labels = { 'card-value': 'Card Value', 'fixed': 'Fixed', 'timed': 'Timed' }
            const active = config.repsMode === mode
            return (
              <Pressable
                key={mode}
                onPress={() => onChange({ repsMode: mode })}
                className={`flex-1 py-2 rounded-lg items-center border ${
                  active ? 'bg-green-600 border-green-600' : 'bg-white border-gray-300'
                }`}
              >
                <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-600'}`}>
                  {labels[mode]}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {config.repsMode === 'fixed' && (
          <View className="flex-row items-center justify-between mt-1">
            <Text className="text-sm text-gray-700">Reps per card</Text>
            <StepperControl
              value={config.fixedReps}
              min={1}
              max={100}
              onChange={v => onChange({ fixedReps: v })}
            />
          </View>
        )}

        {config.repsMode === 'timed' && (
          <View className="flex-row items-center justify-between mt-1">
            <Text className="text-sm text-gray-700">Seconds per card</Text>
            <StepperControl
              value={config.timedSeconds}
              min={5}
              max={300}
              step={5}
              onChange={v => onChange({ timedSeconds: v })}
            />
          </View>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DeckBuilderScreen() {
  const insets = useSafeAreaInsets()
  const { deckId } = useLocalSearchParams<{ deckId?: string }>()
  const isEditing = !!deckId

  const [deckName, setDeckName]           = useState('My Deck')
  const [suits, setSuits]                 = useState<Record<Suit, SuitConfig>>(defaultSuits)
  const [includeJokers, setIncludeJokers] = useState(false)
  const [jokerExercise, setJokerExercise] = useState('Burpees')
  const [jokerCount, setJokerCount]       = useState(2)
  const [loading, setLoading]             = useState(isEditing)
  const [saving, setSaving]               = useState(false)

  // Load existing config when editing
  useEffect(() => {
    if (!deckId) return
    getDeckConfigs()
      .then(rows => {
        const row = rows.find(r => r.id === deckId)
        if (!row) return
        setDeckName(row.name)
        setIncludeJokers(row.config.includeJokers)
        setJokerCount(row.config.jokerCount ?? 2)

        // Extract joker exercise
        const jokerGroup = row.config.groups.find(g => g.values.includes(0))
        if (jokerGroup) setJokerExercise(jokerGroup.assignment.exercise)

        // Extract per-suit configs
        const next = defaultSuits()
        for (const suit of ALL_SUITS) {
          // Pass 1: look for a per-suit group
          let found = row.config.groups.find(g =>
            g.assignment.kind === 'per-suit' &&
            g.assignment.suit === suit &&
            g.values.some(v => v !== 0)
          )
          // Pass 2: fall back to an all-suits group
          if (!found) {
            found = row.config.groups.find(g =>
              g.assignment.kind === 'all-suits' &&
              g.values.some(v => v !== 0) &&
              (!g.assignment.suits || g.assignment.suits.includes(suit))
            )
          }
          if (!found) continue

          const exercise = found.assignment.exercise ?? ''
          let repsMode: SuitConfig['repsMode'] = 'card-value'
          let fixedReps = 10
          let timedSeconds = 30

          if (found.repsMode.kind === 'fixed') {
            repsMode = 'fixed'
            fixedReps = found.repsMode.reps
          } else if (found.repsMode.kind === 'timed') {
            repsMode = 'timed'
            timedSeconds = found.repsMode.seconds
          }

          next[suit] = { exercise, repsMode, fixedReps, timedSeconds }
        }
        setSuits(next)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [deckId])

  // Live preview config
  const previewConfig = useMemo(
    () => buildConfig(suits, includeJokers, jokerCount, jokerExercise),
    [suits, includeJokers, jokerCount, jokerExercise]
  )
  const cardCount     = useMemo(() => calculateConfigCardCount(previewConfig),     [previewConfig])
  const exerciseCount = useMemo(() => calculateConfigExerciseCount(previewConfig), [previewConfig])
  const totalReps     = useMemo(() => calculateConfigTotalReps(previewConfig),     [previewConfig])

  function validate(): string | null {
    if (!deckName.trim()) return 'Deck name is required'
    for (const suit of ALL_SUITS) {
      if (!suits[suit].exercise.trim()) return `Please enter an exercise for ${suit}`
      if (suits[suit].repsMode === 'fixed' && suits[suit].fixedReps < 1) return 'Fixed reps must be at least 1'
      if (suits[suit].repsMode === 'timed' && suits[suit].timedSeconds < 1) return 'Timed seconds must be at least 1'
    }
    if (includeJokers && !jokerExercise.trim()) return 'Please enter an exercise for jokers'
    return null
  }

  async function handleSave() {
    const err = validate()
    if (err) {
      Alert.alert('Incomplete', err)
      return
    }
    setSaving(true)
    try {
      const config = buildConfig(suits, includeJokers, jokerCount, jokerExercise)
      const name = deckName.trim()
      if (isEditing && deckId) {
        await updateDeckConfigById(deckId, name, config)
      } else {
        await createDeckConfig(name, config)
      }
      router.back()
    } catch {
      Alert.alert('Error', 'Could not save deck. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
    >
      {/* Header */}
      <View
        className="bg-white border-b border-gray-200 flex-row items-center px-4 pb-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Pressable onPress={() => router.back()} className="w-9 h-9 items-center justify-center -ml-1">
          <ChevronLeft size={24} color="#374151" />
        </Pressable>
        <Text className="flex-1 text-center text-xl font-bold text-gray-900">
          {isEditing ? 'Edit Deck' : 'New Deck'}
        </Text>
        <View className="w-9" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 96 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Deck Name */}
          <SectionHeader title="Deck Name" />
          <Card className="mb-5">
            <CardContent>
              <TextInput
                className="text-base text-gray-900 py-1"
                value={deckName}
                onChangeText={setDeckName}
                placeholder="My Deck"
                placeholderTextColor={MUTED}
                maxLength={50}
                returnKeyType="done"
              />
            </CardContent>
          </Card>

          {/* Suits */}
          <SectionHeader title="Suits" />
          {ALL_SUITS.map(suit => (
            <SuitRow
              key={suit}
              suit={suit}
              config={suits[suit]}
              onChange={partial => setSuits(prev => ({ ...prev, [suit]: { ...prev[suit], ...partial } }))}
            />
          ))}

          {/* Jokers */}
          <SectionHeader title="Jokers" className="mt-2" />
          <Card className="mb-5">
            <CardContent>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-medium text-gray-900">Include Jokers</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">Add wildcard cards to your deck</Text>
                </View>
                <Switch
                  value={includeJokers}
                  onValueChange={setIncludeJokers}
                  trackColor={{ false: '#d1d5db', true: PRIMARY }}
                  thumbColor="#ffffff"
                />
              </View>

              {includeJokers && (
                <>
                  <View className="h-px bg-gray-100 my-3" />

                  <Text className="text-sm font-medium text-gray-700 mb-1.5">Exercise</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-base mb-3"
                    value={jokerExercise}
                    onChangeText={setJokerExercise}
                    placeholder="e.g. Burpees"
                    placeholderTextColor={MUTED}
                    returnKeyType="done"
                  />

                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-gray-700">Number of jokers</Text>
                    <StepperControl
                      value={jokerCount}
                      min={1}
                      max={8}
                      onChange={setJokerCount}
                    />
                  </View>
                </>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <SectionHeader title="Summary" />
          <Card>
            <CardContent>
              <View className="flex-row justify-around">
                <View className="items-center">
                  <Text className="text-2xl font-bold text-gray-900">{cardCount}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">Cards</Text>
                </View>
                <View className="w-px bg-gray-100" />
                <View className="items-center">
                  <Text className="text-2xl font-bold text-gray-900">{exerciseCount}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">Exercise{exerciseCount !== 1 ? 's' : ''}</Text>
                </View>
                <View className="w-px bg-gray-100" />
                <View className="items-center">
                  <Text className="text-2xl font-bold text-gray-900">{totalReps}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">Est. Reps</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </ScrollView>
      )}

      {/* Sticky footer */}
      {!loading && (
        <View
          className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4"
          style={{ paddingBottom: insets.bottom + 8, paddingTop: 12 }}
        >
          <Pressable
            onPress={handleSave}
            disabled={saving}
            className={`bg-green-600 rounded-xl py-3.5 items-center ${saving ? 'opacity-70' : ''}`}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white font-semibold text-base">
                  {isEditing ? 'Save Changes' : 'Create Deck'}
                </Text>
            }
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}
