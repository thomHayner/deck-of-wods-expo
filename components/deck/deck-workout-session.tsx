import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Play, Pause, RotateCcw, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { PlayingCard } from '@/components/deck/playing-card'
import { Progress } from '@/components/ui/progress'
import {
  buildDeckFromConfig,
  resolveReps,
  isTimed as isTimedMode,
  type DeckConfig,
  type ResolvedCard,
} from '@/lib/deck-config'
import {
  saveDeckState,
  loadDeckState,
  clearDeckState,
} from '@/lib/session-persistence'
import { setActiveWorkout, clearActiveWorkout } from '@/lib/active-workout'
import { useWatchSession, useWatchMessageListener } from '@/hooks/useWatchSession'
import { useWorkoutStore } from '@/store/workout'

const PRIMARY = '#16a34a'

interface DeckSessionStats {
  totalCards: number
  completedCards: number
  totalReps: number
  durationSeconds: number
  repsByExercise: Record<string, number>
  deckConfig: DeckConfig
}

interface Props {
  config: DeckConfig
  onComplete?: (stats: DeckSessionStats) => void
  onCancel?: () => void
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function DeckWorkoutSession({ config, onComplete, onCancel }: Props) {
  const insets = useSafeAreaInsets()

  const [deck, setDeck] = useState<ResolvedCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedCards, setCompletedCards] = useState<Set<number>>(new Set())
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [repsByExercise, setRepsByExercise] = useState<Record<string, number>>({})
  const [timedCardElapsed, setTimedCardElapsed] = useState(0)
  const [initialized, setInitialized] = useState(false)

  // Sync to Zustand store (for watch connectivity)
  const store = useWorkoutStore()

  // Timer ref to avoid stale closures
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Register watch message listener
  useWatchMessageListener()

  // Initialize: restore saved state or build fresh deck
  useEffect(() => {
    async function init() {
      const saved = await loadDeckState()
      if (saved) {
        const elapsed = saved.isRunning
          ? saved.elapsedTime + Math.round((Date.now() - saved.savedAt) / 1000)
          : saved.elapsedTime
        setDeck(saved.deck)
        setCurrentIndex(saved.currentIndex)
        setCompletedCards(new Set(saved.completedCards))
        setElapsedTime(elapsed)
        setRepsByExercise(saved.repsByExercise)
        setIsRunning(saved.isRunning)
      } else {
        const built = buildDeckFromConfig(config)
        setDeck(built)
        setIsRunning(true)
        await setActiveWorkout('deck')
        // Save immediately so navigating away before completing any card still allows resumption
        await saveDeckState({
          deck: built,
          deckConfig: config,
          completedCards: [],
          currentIndex: 0,
          elapsedTime: 0,
          repsByExercise: {},
          isRunning: true,
          savedAt: Date.now(),
        })
      }
      setInitialized(true)
    }
    init()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // Timer
  useEffect(() => {
    if (!initialized) return
    if (timerRef.current) clearInterval(timerRef.current)
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedTime(t => t + 1)
        setTimedCardElapsed(t => t + 1)
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isRunning, initialized])

  // Sync store state for watch
  useEffect(() => {
    if (!initialized || deck.length === 0) return
    store.startDeckWorkout(deck, config)
  }, [initialized])

  useEffect(() => {
    if (deck.length > 0) {
      store.setElapsedTime(elapsedTime)
    }
  }, [elapsedTime])

  // Persist on key state changes
  const persist = useCallback(async (running: boolean) => {
    if (deck.length === 0) return
    await saveDeckState({
      deck,
      deckConfig: config,
      completedCards: Array.from(completedCards),
      currentIndex,
      elapsedTime,
      repsByExercise,
      isRunning: running,
      savedAt: Date.now(),
    })
  }, [deck, config, completedCards, currentIndex, elapsedTime, repsByExercise])

  const currentCard = deck[currentIndex]
  const isComplete = completedCards.size === deck.length && deck.length > 0
  const isTimed = currentCard ? isTimedMode(currentCard.repsMode) : false
  const timedDuration = currentCard?.repsMode.kind === 'timed' ? currentCard.repsMode.seconds : 30
  const resolvedRepsForCard = currentCard ? resolveReps(currentCard, currentCard.repsMode) : 0
  const progressPct = deck.length > 0 ? (completedCards.size / deck.length) * 100 : 0
  const totalReps = Object.values(repsByExercise).reduce((s, v) => s + v, 0)

  async function handleCompleteCard() {
    if (!currentCard || completedCards.has(currentIndex)) return
    const reps = resolveReps(currentCard, currentCard.repsMode)
    const newCompleted = new Set(completedCards)
    newCompleted.add(currentIndex)
    const newReps = {
      ...repsByExercise,
      [currentCard.exercise]: (repsByExercise[currentCard.exercise] ?? 0) + reps,
    }
    setCompletedCards(newCompleted)
    setRepsByExercise(newReps)
    setTimedCardElapsed(0)

    const nextIndex = currentIndex + 1
    if (nextIndex >= deck.length) {
      // Workout complete
      setIsRunning(false)
      await clearDeckState()
      await clearActiveWorkout()
      onComplete?.({
        totalCards: deck.length,
        completedCards: newCompleted.size,
        totalReps: Object.values(newReps).reduce((s, v) => s + v, 0),
        durationSeconds: elapsedTime,
        repsByExercise: newReps,
        deckConfig: config,
      })
    } else {
      setCurrentIndex(nextIndex)
      await persist(isRunning)
    }
  }

  async function handlePrevCard() {
    if (currentIndex === 0) return
    setCurrentIndex(i => i - 1)
    setTimedCardElapsed(0)
  }

  async function handleShuffle() {
    const built = buildDeckFromConfig(config)
    setDeck(built)
    setCurrentIndex(0)
    setCompletedCards(new Set())
    setRepsByExercise({})
    setElapsedTime(0)
    setTimedCardElapsed(0)
    setIsRunning(true)
    await clearDeckState()
    await setActiveWorkout('deck')
  }

  async function handlePauseResume() {
    const newRunning = !isRunning
    setIsRunning(newRunning)
    await persist(newRunning)
  }

  async function handleEndSave() {
    setIsRunning(false)
    await clearDeckState()
    await clearActiveWorkout()
    onComplete?.({
      totalCards: deck.length,
      completedCards: completedCards.size,
      totalReps,
      durationSeconds: elapsedTime,
      repsByExercise,
      deckConfig: config,
    })
  }

  // Exercise legend
  const legend = Object.entries(repsByExercise).filter(([, v]) => v > 0)
  const allExercises = [...new Set(deck.map(c => c.exercise))].filter(Boolean)

  if (!initialized || deck.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">Loading deck…</Text>
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Progress bar */}
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-sm font-medium text-gray-700">
            {completedCards.size}/{deck.length} cards  ·  {formatTime(elapsedTime)}
          </Text>
          <Text className="text-sm text-gray-500">{totalReps} reps</Text>
        </View>
        <Progress value={progressPct} className="h-2" />
        <Text className="text-xs text-gray-400 mt-1">{Math.round(progressPct)}% complete</Text>
      </View>

      {!isComplete ? (
        <>
          {/* Current card */}
          <View className="items-center mt-4 mb-4">
            {currentCard && (
              <PlayingCard
                card={currentCard}
                exerciseName={currentCard.exercise}
                resolvedReps={isTimed ? undefined : resolvedRepsForCard}
                isTimed={isTimed}
                durationSeconds={timedDuration}
                isCurrent
                size="lg"
              />
            )}
          </View>

          {/* Exercise info */}
          {currentCard && (
            <View className="mx-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-4">
              {isTimed ? (
                <>
                  <Text className="text-5xl font-bold text-gray-900 text-center mb-1">
                    {formatTime(Math.max(0, timedDuration - timedCardElapsed))}
                  </Text>
                  <Text className="text-lg font-semibold text-gray-700 text-center">{currentCard.exercise}</Text>
                  <Text className="text-sm text-gray-500 text-center mt-1">
                    Hold for {timedDuration} seconds
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-6xl font-bold text-green-600 text-center mb-1">
                    {resolvedRepsForCard}
                  </Text>
                  <Text className="text-lg font-semibold text-gray-700 text-center">{currentCard.exercise}</Text>
                  <Text className="text-sm text-gray-500 text-center mt-1">
                    {currentCard.displayValue} of {currentCard.suit}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Card navigation */}
          <View className="flex-row items-center justify-between px-6 mb-4">
            <Pressable
              onPress={handlePrevCard}
              disabled={currentIndex === 0}
              className={`flex-row items-center gap-1 p-2 ${currentIndex === 0 ? 'opacity-30' : ''}`}
            >
              <ChevronLeft size={20} color="#6b7280" />
              <Text className="text-gray-500 text-sm">Prev</Text>
            </Pressable>
            <Text className="text-sm text-gray-500">Card {currentIndex + 1} of {deck.length}</Text>
            <Pressable
              onPress={handleCompleteCard}
              disabled={completedCards.has(currentIndex)}
              className={`flex-row items-center gap-1 p-2 ${completedCards.has(currentIndex) ? 'opacity-30' : ''}`}
            >
              <Text className="text-green-600 text-sm font-medium">Next</Text>
              <ChevronRight size={20} color={PRIMARY} />
            </Pressable>
          </View>

          {/* Controls */}
          <View className="px-4 gap-3">
            {/* Complete card button */}
            <Pressable
              onPress={handleCompleteCard}
              disabled={completedCards.has(currentIndex)}
              className={`bg-green-600 rounded-xl py-4 items-center ${completedCards.has(currentIndex) ? 'opacity-50' : ''}`}
            >
              <View className="flex-row items-center gap-2">
                <CheckCircle size={20} color="#fff" />
                <Text className="text-white font-semibold text-base">Complete Card</Text>
              </View>
            </Pressable>

            {/* Pause/Resume */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={handlePauseResume}
                className="flex-1 bg-gray-200 rounded-xl py-3.5 items-center flex-row justify-center gap-2"
              >
                {isRunning ? <Pause size={18} color="#374151" /> : <Play size={18} color="#374151" />}
                <Text className="text-gray-700 font-semibold">{isRunning ? 'Pause' : 'Resume'}</Text>
              </Pressable>

              {completedCards.size > 0 ? (
                <Pressable
                  onPress={handleEndSave}
                  className="flex-1 bg-gray-100 border border-gray-300 rounded-xl py-3.5 items-center"
                >
                  <Text className="text-gray-700 font-semibold">End & Save</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleShuffle}
                  className="flex-1 bg-gray-100 border border-gray-300 rounded-xl py-3.5 items-center flex-row justify-center gap-2"
                >
                  <RotateCcw size={16} color="#374151" />
                  <Text className="text-gray-700 font-semibold">Shuffle</Text>
                </Pressable>
              )}
            </View>

          </View>
        </>
      ) : (
        /* Complete state */
        <View className="px-4 mt-4">
          <View className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4 items-center">
            <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-3">
              <CheckCircle size={36} color={PRIMARY} />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-1">Workout Complete!</Text>
            <Text className="text-gray-500 text-sm">Amazing work! 🎉</Text>
          </View>

          {/* Stats */}
          <View className="flex-row flex-wrap gap-3 mb-4">
            {[
              { label: 'Time', value: formatTime(elapsedTime) },
              { label: 'Cards', value: `${completedCards.size}/${deck.length}` },
              { label: 'Total Reps', value: totalReps.toString() },
              { label: 'Reps/Min', value: elapsedTime > 0 ? Math.round((totalReps / elapsedTime) * 60).toString() : '—' },
            ].map(({ label, value }) => (
              <View key={label} className="flex-1 min-w-[40%] bg-white rounded-xl border border-gray-200 p-4 items-center">
                <Text className="text-2xl font-bold text-gray-900">{value}</Text>
                <Text className="text-xs text-gray-500 mt-0.5">{label}</Text>
              </View>
            ))}
          </View>

          {/* Exercise breakdown */}
          {legend.length > 0 && (
            <View className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">
              <Text className="font-semibold text-gray-900 mb-3">Exercise Breakdown</Text>
              {legend.map(([exercise, reps]) => (
                <View key={exercise} className="flex-row items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <Text className="text-gray-700">{exercise}</Text>
                  <Text className="font-semibold text-gray-900">{reps} reps</Text>
                </View>
              ))}
            </View>
          )}

          {/* Shuffle button for another round */}
          <Pressable
            onPress={handleShuffle}
            className="flex-row items-center justify-center gap-2 bg-gray-100 border border-gray-300 rounded-xl py-3.5"
          >
            <RotateCcw size={16} color="#374151" />
            <Text className="text-gray-700 font-semibold">New Deck</Text>
          </Pressable>
        </View>
      )}

      {/* Exercises legend (always visible) */}
      {allExercises.length > 0 && !isComplete && (
        <View className="mx-4 mt-2 bg-white rounded-xl border border-gray-100 px-4 py-3">
          <Text className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Exercises</Text>
          <View className="flex-row flex-wrap gap-y-1.5">
            {allExercises.map(ex => (
              <View key={ex} className="w-1/2">
                <Text className="text-sm text-gray-600">{ex}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Cancel — always last */}
      {onCancel && !isComplete && (
        <View className="px-4 mt-3 mb-2">
          <Pressable onPress={onCancel} className="bg-red-600 rounded-xl py-4 items-center">
            <Text className="text-white font-semibold text-base">Cancel Workout</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  )
}
