import { useState, useCallback, useMemo } from 'react'
import {
  View, Text, ScrollView, Pressable, Alert, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Layers, Pencil, Play, Plus, Trash2 } from 'lucide-react-native'
import { Card, CardContent } from '@/components/ui/card'
import {
  calculateConfigCardCount,
  calculateConfigTotalReps,
  calculateConfigExerciseCount,
  type DeckConfig,
} from '@/lib/deck-config'
import {
  type DeckConfigRow,
  getDeckConfigs,
  deleteDeckConfig,
} from '@/lib/db/deck-configs'
import { getActiveWorkout } from '@/lib/active-workout'

const PRIMARY = '#16a34a'
const MUTED = '#6b7280'

function formatLabel(config: DeckConfig) {
  if (config.format === 'standard') return 'Standard'
  if (config.format === 'pinochle') return 'Pinochle'
  return 'Custom'
}

function DeckStats({ config }: { config: DeckConfig }) {
  const cards     = useMemo(() => calculateConfigCardCount(config),     [config])
  const reps      = useMemo(() => calculateConfigTotalReps(config),     [config])
  const exercises = useMemo(() => calculateConfigExerciseCount(config), [config])
  return (
    <Text className="text-sm text-gray-500 mt-0.5">
      {cards} cards · {exercises} exercise{exercises !== 1 ? 's' : ''} · {reps} reps
    </Text>
  )
}

export default function DeckScreen() {
  const insets = useSafeAreaInsets()
  const [decks, setDecks]           = useState<DeckConfigRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [hasActive, setHasActive]   = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      getDeckConfigs().then(setDecks).catch(console.error).finally(() => setLoading(false))
      async function checkActive() { setHasActive(!!(await getActiveWorkout())) }
      checkActive()
    }, [])
  )

  function openNew() {
    router.push('/deck-builder')
  }

  function openEdit(deck: DeckConfigRow) {
    router.push({ pathname: '/deck-builder', params: { deckId: deck.id } })
  }

  async function handleDelete(id: string) {
    if (decks.length <= 1) return
    Alert.alert('Delete deck?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeletingId(id)
          await deleteDeckConfig(id).catch(console.error)
          setDecks(prev => prev.filter(d => d.id !== id))
          setDeletingId(null)
        },
      },
    ])
  }

  async function handleStart(deck: DeckConfigRow) {
    await AsyncStorage.setItem('pending_deck_config', JSON.stringify(deck.config))
    router.push('/record')
  }

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-4 pb-3 border-b border-gray-200 bg-white flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-bold text-gray-900">My Decks</Text>
          {!loading && (
            <Text className="text-sm text-gray-500 mt-0.5">
              {decks.length} deck{decks.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <Pressable
          onPress={openNew}
          className="flex-row items-center gap-1.5 bg-green-600 px-3 py-2 rounded-xl"
        >
          <Plus size={16} color="#fff" />
          <Text className="text-white font-semibold text-sm">New Deck</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View className="h-40 items-center justify-center">
            <ActivityIndicator color={PRIMARY} />
          </View>
        )}

        {!loading && decks.length === 0 && (
          <View className="items-center py-16 gap-4">
            <View className="w-16 h-16 rounded-2xl bg-gray-100 items-center justify-center">
              <Layers size={32} color={MUTED} />
            </View>
            <View className="items-center">
              <Text className="font-semibold text-gray-900">No decks yet</Text>
              <Text className="text-sm text-gray-500 mt-1 text-center">
                Create your first deck to start a workout
              </Text>
            </View>
            <Pressable
              onPress={openNew}
              className="flex-row items-center gap-2 bg-green-600 px-4 py-2.5 rounded-xl"
            >
              <Plus size={16} color="#fff" />
              <Text className="text-white font-semibold">Create a Deck</Text>
            </Pressable>
          </View>
        )}

        <View className="gap-3">
          {decks.map(deck => (
            <Card key={deck.id}>
              <CardContent className="pt-4">
                <View className="flex-row items-start gap-3">
                  <View className="w-10 h-10 rounded-xl bg-green-100 items-center justify-center">
                    <Layers size={20} color={PRIMARY} />
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="font-semibold text-gray-900" numberOfLines={1}>{deck.name}</Text>
                      <View className="bg-gray-100 rounded px-1.5 py-0.5">
                        <Text className="text-xs text-gray-600 font-medium">{formatLabel(deck.config)}</Text>
                      </View>
                    </View>
                    <DeckStats config={deck.config} />
                  </View>
                  <View className="flex-row gap-1">
                    <Pressable onPress={() => openEdit(deck)} className="w-8 h-8 items-center justify-center">
                      <Pencil size={14} color={MUTED} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(deck.id)}
                      disabled={deletingId === deck.id || decks.length <= 1}
                      className={`w-8 h-8 items-center justify-center ${decks.length <= 1 ? 'opacity-30' : ''}`}
                    >
                      {deletingId === deck.id
                        ? <ActivityIndicator size="small" color="#ef4444" />
                        : <Trash2 size={14} color="#ef4444" />}
                    </Pressable>
                  </View>
                </View>
                <Pressable
                  onPress={() => handleStart(deck)}
                  disabled={hasActive}
                  className={`flex-row items-center justify-center gap-2 bg-green-600 rounded-xl py-3 mt-3 ${hasActive ? 'opacity-50' : ''}`}
                >
                  <Play size={16} color="#fff" />
                  <Text className="text-white font-semibold text-sm">
                    {hasActive ? 'Finish current workout first' : 'Start Workout'}
                  </Text>
                </Pressable>
              </CardContent>
            </Card>
          ))}
        </View>
      </ScrollView>

    </View>
  )
}
