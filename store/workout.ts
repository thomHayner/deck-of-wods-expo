import { create } from 'zustand'
import { resolveReps, type ResolvedCard, type DeckConfig } from '@/lib/deck-config'

export interface WorkoutState {
  // Mode
  mode: 'idle' | 'deck-active' | 'free-active' | 'deck-complete' | 'free-complete'

  // Deck workout
  deck: ResolvedCard[]
  deckConfig: DeckConfig | null
  currentIndex: number
  completedCards: Set<number>
  repsByExercise: Record<string, number>
  elapsedTime: number  // seconds
  isRunning: boolean

  // Actions
  setMode: (mode: WorkoutState['mode']) => void
  startDeckWorkout: (deck: ResolvedCard[], config: DeckConfig) => void
  completeCard: () => void
  previousCard: () => void
  setElapsedTime: (t: number) => void
  setIsRunning: (v: boolean) => void
  resetWorkout: () => void
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  mode: 'idle',
  deck: [],
  deckConfig: null,
  currentIndex: 0,
  completedCards: new Set(),
  repsByExercise: {},
  elapsedTime: 0,
  isRunning: false,

  setMode: (mode) => set({ mode }),

  startDeckWorkout: (deck, config) => set({
    mode: 'deck-active',
    deck,
    deckConfig: config,
    currentIndex: 0,
    completedCards: new Set(),
    repsByExercise: {},
    elapsedTime: 0,
    isRunning: true,
  }),

  completeCard: () => set((s) => {
    const completed = new Set(s.completedCards)
    completed.add(s.currentIndex)
    const card = s.deck[s.currentIndex]
    const exercise = card?.exercise ?? ''
    const reps = card ? resolveReps(card, card.repsMode) : 0
    const repsByExercise = { ...s.repsByExercise, [exercise]: (s.repsByExercise[exercise] ?? 0) + reps }
    const nextIndex = s.currentIndex + 1
    const allDone = nextIndex >= s.deck.length
    return {
      completedCards: completed,
      repsByExercise,
      currentIndex: allDone ? s.currentIndex : nextIndex,
      mode: allDone ? 'deck-complete' : s.mode,
      isRunning: allDone ? false : s.isRunning,
    }
  }),

  previousCard: () => set((s) => ({
    currentIndex: Math.max(0, s.currentIndex - 1),
  })),

  setElapsedTime: (t) => set({ elapsedTime: t }),
  setIsRunning: (v) => set({ isRunning: v }),

  resetWorkout: () => set({
    mode: 'idle',
    deck: [],
    deckConfig: null,
    currentIndex: 0,
    completedCards: new Set(),
    repsByExercise: {},
    elapsedTime: 0,
    isRunning: false,
  }),
}))
