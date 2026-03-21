import { useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Check, Store, Gift } from 'lucide-react-native'
import { Card, CardContent } from '@/components/ui/card'
import { COMMUNITY_DECKS } from '@/lib/community-decks'
import { createDeckConfig } from '@/lib/db/deck-configs'
import {
  calculateConfigCardCount,
  calculateConfigTotalReps,
  calculateConfigExerciseCount,
} from '@/lib/deck-config'

const PRIMARY = '#16a34a'
const MUTED   = '#6b7280'

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠', joker: '★',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced:     'bg-red-100 text-red-700',
}

function CommunityDeckCard({ deck }: { deck: typeof COMMUNITY_DECKS[number] }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  const cards     = calculateConfigCardCount(deck.config)
  const reps      = calculateConfigTotalReps(deck.config)
  const exercises = calculateConfigExerciseCount(deck.config)

  const uniqueExercises = [...new Set(
    deck.config.groups.flatMap(g =>
      g.assignment.kind === 'per-suit'
        ? [{ suit: g.assignment.suit, exercise: g.assignment.exercise }]
        : (g.assignment.suits ?? ['hearts', 'diamonds', 'clubs', 'spades']).map(s => ({ suit: s, exercise: g.assignment.exercise }))
    ).map(x => JSON.stringify(x))
  )].slice(0, 4).map(x => JSON.parse(x) as { suit: string; exercise: string })

  async function handleSave() {
    if (saved) return
    setSaving(true)
    const result = await createDeckConfig(deck.name, deck.config).catch(() => null)
    if (result === null) {
      router.push('/auth')
      return
    }
    setSaved(true)
    setSaving(false)
  }

  const difficultyLabel = (deck as { difficulty?: string }).difficulty ?? 'beginner'
  const diffClass = DIFFICULTY_COLORS[difficultyLabel] ?? DIFFICULTY_COLORS.beginner

  return (
    <Card>
      <CardContent className="pt-4">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="font-semibold text-gray-900 text-base">{deck.name}</Text>
            {(deck as { author?: string }).author && (
              <Text className="text-xs text-gray-400 mt-0.5">by {(deck as { author?: string }).author}</Text>
            )}
          </View>
          <View className={`rounded-full px-2.5 py-1 ${diffClass}`}>
            <Text className="text-xs font-medium capitalize">{difficultyLabel}</Text>
          </View>
        </View>

        {(deck as { description?: string }).description && (
          <Text className="text-sm text-gray-500 mb-3">{(deck as { description?: string }).description}</Text>
        )}

        {/* Exercise preview */}
        <View className="flex-row flex-wrap gap-2 mb-3">
          {uniqueExercises.map(({ suit, exercise }) => (
            <View key={`${suit}-${exercise}`} className="flex-row items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
              <Text className="text-sm" style={{ color: ['hearts', 'diamonds'].includes(suit) ? '#dc2626' : '#171717' }}>
                {SUIT_SYMBOLS[suit] ?? ''}
              </Text>
              <Text className="text-xs text-gray-700">{exercise}</Text>
            </View>
          ))}
        </View>

        {/* Stats */}
        <Text className="text-xs text-gray-400 mb-3">
          {cards} cards · {exercises} exercise{exercises !== 1 ? 's' : ''} · {reps} reps
        </Text>

        <Pressable
          onPress={handleSave}
          disabled={saving || saved}
          className={`flex-row items-center justify-center gap-2 rounded-xl py-3 ${
            saved ? 'bg-gray-100 border border-gray-200' : 'bg-green-600'
          } ${saving ? 'opacity-60' : ''}`}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : saved ? (
            <>
              <Check size={16} color="#16a34a" />
              <Text className="font-semibold text-green-600">Saved</Text>
            </>
          ) : (
            <Text className="text-white font-semibold">Save to My Decks</Text>
          )}
        </Pressable>
      </CardContent>
    </Card>
  )
}

function PartnerOffersTab() {
  return (
    <View className="items-center py-16 px-6">
      <View className="w-16 h-16 rounded-2xl bg-green-100 items-center justify-center mb-4">
        <Gift size={28} color={PRIMARY} />
      </View>
      <Text className="font-semibold text-gray-900 text-base mb-1">Partner Offers</Text>
      <Text className="text-sm text-gray-500 text-center">
        Exclusive deals from fitness brands and partners are coming soon.
      </Text>
    </View>
  )
}

type Tab = 'community' | 'partners'

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState<Tab>('community')

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-4 pb-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center gap-2 mb-3">
          <Store size={20} color={MUTED} />
          <Text className="text-xl font-bold text-gray-900">Marketplace</Text>
        </View>

        {/* Tab pills */}
        <View className="flex-row bg-gray-100 rounded-xl p-1 gap-1">
          {([
            { id: 'community', label: 'Community Decks' },
            { id: 'partners',  label: 'Partner Offers' },
          ] as { id: Tab; label: string }[]).map(tab => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg items-center ${activeTab === tab.id ? 'bg-white shadow-sm' : ''}`}
            >
              <Text className={`text-sm font-semibold ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-500'}`}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
        key={activeTab}
      >
        {activeTab === 'community' ? (
          <>
            <Text className="text-sm text-gray-500 mb-4">
              Curated by the Deck of WODs team
            </Text>
            <View className="gap-3">
              {COMMUNITY_DECKS.slice(0, 10).map((deck, i) => (
                <CommunityDeckCard key={i} deck={deck} />
              ))}
            </View>
          </>
        ) : (
          <PartnerOffersTab />
        )}
      </ScrollView>
    </View>
  )
}
