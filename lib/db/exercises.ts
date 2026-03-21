import { createClient } from '@/lib/supabase/client'
import { DEFAULT_EXERCISES, type Suit } from '@/lib/types'
import {
  type DeckConfig,
  DEFAULT_DECK_CONFIG,
  legacyExercisesToConfig,
  configToLegacyExercises,
} from '@/lib/deck-config'

export interface ExerciseConfigRow {
  id: string
  user_id: string
  hearts: string
  diamonds: string
  clubs: string
  spades: string
  deck_config: DeckConfig | null
  updated_at: string
}

// ── Legacy helpers (kept for backward compat) ─────────────────────────────────

export async function getExerciseConfig(): Promise<Record<Suit, string>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('exercise_configs')
    .select('hearts, diamonds, clubs, spades')
    .single()

  if (error || !data) {
    return {
      hearts: DEFAULT_EXERCISES.hearts.name,
      diamonds: DEFAULT_EXERCISES.diamonds.name,
      clubs: DEFAULT_EXERCISES.clubs.name,
      spades: DEFAULT_EXERCISES.spades.name,
    }
  }

  return {
    hearts: data.hearts,
    diamonds: data.diamonds,
    clubs: data.clubs,
    spades: data.spades,
  }
}

export async function updateExerciseConfig(config: Record<Suit, string>): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('exercise_configs')
    .upsert({
      user_id: user.id,
      hearts: config.hearts,
      diamonds: config.diamonds,
      clubs: config.clubs,
      spades: config.spades,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) throw error
}

// ── New flexible config helpers ───────────────────────────────────────────────

/**
 * Load the user's DeckConfig.
 * If the row has a deck_config JSONB value, return it directly.
 * If not (legacy row), read the four exercise columns and convert.
 * Falls back to DEFAULT_DECK_CONFIG if no row exists.
 */
export async function getDeckConfig(): Promise<DeckConfig> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('exercise_configs')
    .select('hearts, diamonds, clubs, spades, deck_config')
    .single()

  if (error || !data) return DEFAULT_DECK_CONFIG

  // Prefer the new JSONB column
  if (data.deck_config) return data.deck_config as DeckConfig

  // Legacy row — migrate on the fly
  return legacyExercisesToConfig({
    hearts:   data.hearts   || DEFAULT_EXERCISES.hearts.name,
    diamonds: data.diamonds || DEFAULT_EXERCISES.diamonds.name,
    clubs:    data.clubs    || DEFAULT_EXERCISES.clubs.name,
    spades:   data.spades   || DEFAULT_EXERCISES.spades.name,
  })
}

/**
 * Save the user's DeckConfig.
 * Writes deck_config JSONB and also keeps the four legacy columns in sync
 * so any code still reading the old columns continues to work.
 */
export async function updateDeckConfig(config: DeckConfig): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const legacy = configToLegacyExercises(config)

  const { error } = await supabase
    .from('exercise_configs')
    .upsert({
      user_id:     user.id,
      deck_config: config,
      hearts:      legacy.hearts,
      diamonds:    legacy.diamonds,
      clubs:       legacy.clubs,
      spades:      legacy.spades,
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) throw error
}
