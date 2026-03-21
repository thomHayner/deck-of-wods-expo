/**
 * Syncs active workout state to the paired Apple Watch.
 * - During active workout: sendMessage (real-time, requires reachability)
 *   with fallback to updateApplicationContext.
 * - During idle / summary: updateApplicationContext (best-effort delivery).
 * - Web / Android: no-op (Platform.OS guard).
 *
 * Also exports:
 *  useWatchMessageListener() — receives completeCard / previousCard from watch.
 *  useSyncHistoryToWatch()   — sends recent sessions to watch idle screen.
 */

import { useEffect, useCallback } from 'react'
import { Platform } from 'react-native'
import { useWorkoutStore } from '@/store/workout'
import { resolveReps }     from '@/lib/deck-config'
import { getDeckSessions } from '@/lib/db/sessions'
import { getFreeSessions } from '@/lib/db/free-sessions'

// ── Types ─────────────────────────────────────────────────────────────────────

interface WatchPayload {
  mode: string
  exercise?: string
  reps?: number
  cardDisplay?: string
  cardIndex?: number
  totalCards?: number
  elapsedSeconds?: number
  summary?: Record<string, unknown>
  recentHistory?: Record<string, unknown>[]
}

// ── Primary hook: outbound sync ───────────────────────────────────────────────

export function useWatchSession() {
  const { mode, deck, currentIndex, elapsedTime, completedCards, repsByExercise } =
    useWorkoutStore()

  useEffect(() => {
    if (Platform.OS === 'web') return

    const card = deck[currentIndex]

    if (mode === 'deck-active') {
      const payload: WatchPayload = {
        mode:           'deck-active',
        exercise:       card?.exercise ?? '',
        reps:           card ? resolveReps(card, card.repsMode) : 0,
        cardDisplay:    card ? buildCardDisplay(card) : '',
        cardIndex:      currentIndex,
        totalCards:     deck.length,
        elapsedSeconds: Math.floor(elapsedTime),
      }
      if (Platform.OS === 'ios') sendRealtime(payload)
      else syncToWearOS(payload)
    } else if (mode === 'free-active') {
      const payload: WatchPayload = {
        mode:           'free-active',
        elapsedSeconds: Math.floor(elapsedTime),
      }
      if (Platform.OS === 'ios') sendContext(payload)
      else syncToWearOS(payload)
    } else if (mode === 'deck-complete') {
      const totalReps = Object.values(repsByExercise).reduce((a, b) => a + b, 0)
      const payload: WatchPayload = {
        mode: 'deck-complete',
        summary: {
          workoutType:     'deck',
          totalReps,
          completedCards:  completedCards.size,
          totalCards:      deck.length,
          durationSeconds: Math.floor(elapsedTime),
          calories:        0,
        },
      }
      if (Platform.OS === 'ios') sendContext(payload)
      else syncToWearOS(payload)
    } else {
      if (Platform.OS === 'ios') sendContext({ mode: 'idle' })
    }
  }, [mode, currentIndex, elapsedTime])
}

// ── Inbound hook: handle watch swipe actions ──────────────────────────────────

export function useWatchMessageListener() {
  const { completeCard, previousCard } = useWorkoutStore()

  useEffect(() => {
    if (Platform.OS === 'web') return

    let unsub: (() => void) | undefined

    if (Platform.OS === 'ios') {
      try {
        const Watch = require('react-native-watch-connectivity').default
        unsub = Watch.addMessageListener((msg: Record<string, string>) => {
          if (msg.action === 'completeCard') completeCard()
          if (msg.action === 'previousCard') previousCard()
        })
      } catch {
        // not available
      }
    } else if (Platform.OS === 'android') {
      try {
        const { addWatchActionListener } = require('wear-os-connector')
        unsub = addWatchActionListener((action: string) => {
          if (action === 'completeCard') completeCard()
          if (action === 'previousCard') previousCard()
        })
      } catch {
        // not available
      }
    }

    return () => unsub?.()
  }, [completeCard, previousCard])
}

// ── History sync: call from You/History screen on mount ───────────────────────

export function useSyncHistoryToWatch() {
  const sync = useCallback(async () => {
    if (Platform.OS === 'web') return
    try {
      const [deckSess, freeSess] = await Promise.all([
        getDeckSessions().catch(() => []),
        getFreeSessions().catch(()  => []),
      ])
      const history = [
        ...deckSess.slice(0, 5).map((s) => ({
          id:              s.id,
          workoutType:     'deck',
          date:            formatHistoryDate(s.completed_at),
          totalReps:       s.total_reps,
          calories:        0,
          durationSeconds: s.duration_seconds,
        })),
        ...freeSess.slice(0, 5).map((s) => ({
          id:              s.id,
          workoutType:     s.workout_type,
          date:            formatHistoryDate(s.completed_at),
          totalReps:       0,
          calories:        s.calories,
          durationSeconds: s.duration_seconds,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8)

      if (Platform.OS === 'ios') {
        sendContext({ mode: 'idle', recentHistory: history })
      } else {
        syncToWearOS({ mode: 'idle', recentHistory: history })
      }
    } catch {
      // Supabase not reachable
    }
  }, [])

  useEffect(() => { sync() }, [sync])
}

// ── Transport helpers ─────────────────────────────────────────────────────────

function sendRealtime(payload: WatchPayload) {
  try {
    const Watch = require('react-native-watch-connectivity').default
    Watch.getReachability().then((reachable: boolean) => {
      if (reachable) {
        Watch.sendMessage(payload, null, () => {
          // Not reachable after all — fall back to context
          Watch.updateApplicationContext(payload).catch(() => {})
        })
      } else {
        Watch.updateApplicationContext(payload).catch(() => {})
      }
    }).catch(() => {
      Watch.updateApplicationContext(payload).catch(() => {})
    })
  } catch {
    // not available
  }
}

function syncToWearOS(payload: WatchPayload) {
  try {
    const { sendWorkoutState } = require('wear-os-connector')
    sendWorkoutState(payload as unknown as Record<string, unknown>)
  } catch {
    // Expo module not available (iOS build / web)
  }
}

function sendContext(payload: WatchPayload) {
  try {
    const Watch = require('react-native-watch-connectivity').default
    Watch.updateApplicationContext(payload).catch(() => {})
  } catch {
    // not available
  }
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function buildCardDisplay(card: { value: string | number; suit: string }): string {
  const SUIT_SYMBOLS: Record<string, string> = {
    hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠', joker: '★',
  }
  return `${card.value}${SUIT_SYMBOLS[card.suit] ?? ''}`
}

function formatHistoryDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}
