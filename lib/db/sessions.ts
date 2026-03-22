import { createClient } from '@/lib/supabase/client'
import type { Suit } from '@/lib/types'
import { type DeckConfig, configToLegacyExercises, DEFAULT_DECK_CONFIG } from '@/lib/deck-config'

export interface DeckSessionRow {
  id: string
  user_id: string
  completed_at: string
  duration_seconds: number
  cards_completed: number
  total_reps: number
  hearts_exercise: string
  diamonds_exercise: string
  clubs_exercise: string
  spades_exercise: string
  reps_per_minute: number | null
  config_snapshot: DeckConfig | null
}

export interface SaveDeckSessionInput {
  duration_seconds: number
  cards_completed: number
  total_reps: number
  /** Full deck config — preferred. */
  config?: DeckConfig
  /** Legacy suit→exercise map — only used if config is not provided. */
  exercises?: Record<Suit, string>
  reps_per_minute?: number
}

export async function saveDeckSession(input: SaveDeckSessionInput): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Resolve legacy exercise columns from config or fall back to exercises param
  const effectiveConfig = input.config ?? DEFAULT_DECK_CONFIG
  const legacy = input.exercises ?? configToLegacyExercises(effectiveConfig)

  const { error } = await supabase.from('deck_sessions').insert({
    user_id:           user.id,
    duration_seconds:  input.duration_seconds,
    cards_completed:   input.cards_completed,
    total_reps:        input.total_reps,
    hearts_exercise:   legacy.hearts,
    diamonds_exercise: legacy.diamonds,
    clubs_exercise:    legacy.clubs,
    spades_exercise:   legacy.spades,
    reps_per_minute:   input.reps_per_minute ?? null,
    config_snapshot:   input.config ?? null,
  })

  if (error) throw error
}

export async function getDeckSessions(): Promise<DeckSessionRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('deck_sessions')
    .select('*')
    .order('completed_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getDeckSessionById(id: string): Promise<DeckSessionRow | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('deck_sessions')
    .select('*')
    .eq('id', id)
    .single()
  return data ?? null
}
