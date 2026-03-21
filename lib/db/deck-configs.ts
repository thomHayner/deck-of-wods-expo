import { createClient } from '@/lib/supabase/client'
import {
  type DeckConfig,
  DEFAULT_DECK_CONFIG,
  legacyExercisesToConfig,
} from '@/lib/deck-config'
import { DEFAULT_EXERCISES } from '@/lib/types'

export interface DeckConfigRow {
  id: string
  user_id: string
  name: string
  config: DeckConfig
  created_at: string
  updated_at: string
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Load all of the user's saved deck configs, ordered oldest-first.
 *
 * Migration path: if the table is empty we attempt to import a config from
 * the legacy `exercise_configs` row, then fall back to creating a default
 * "Classic Deck" so the user always sees at least one deck.
 */
export async function getDeckConfigs(): Promise<DeckConfigRow[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('deck_configs')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return []
  if (data && data.length > 0) return data as DeckConfigRow[]

  // ── First-time migration ──────────────────────────────────────────────────
  // Try to pull a config from the legacy exercise_configs table first
  const { data: legacyRow } = await supabase
    .from('exercise_configs')
    .select('hearts, diamonds, clubs, spades, deck_config')
    .single()

  let seedConfig: DeckConfig = DEFAULT_DECK_CONFIG
  let seedName   = 'Classic Deck'

  if (legacyRow) {
    if (legacyRow.deck_config) {
      const c = legacyRow.deck_config as DeckConfig
      seedConfig = c
      seedName   = c.name || 'Classic Deck'
    } else if (legacyRow.hearts) {
      seedConfig = legacyExercisesToConfig({
        hearts:   legacyRow.hearts   || DEFAULT_EXERCISES.hearts.name,
        diamonds: legacyRow.diamonds || DEFAULT_EXERCISES.diamonds.name,
        clubs:    legacyRow.clubs    || DEFAULT_EXERCISES.clubs.name,
        spades:   legacyRow.spades   || DEFAULT_EXERCISES.spades.name,
      })
      seedName = 'Classic Deck'
    }
  }

  const created = await createDeckConfig(seedName, seedConfig)
  return created ? [created] : []
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function createDeckConfig(
  name: string,
  config: DeckConfig,
): Promise<DeckConfigRow | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('deck_configs')
    .insert({
      user_id:    user.id,
      name:       name || 'My Deck',
      config:     { ...config, name },
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error || !data) return null
  return data as DeckConfigRow
}

export async function updateDeckConfigById(
  id: string,
  name: string,
  config: DeckConfig,
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('deck_configs')
    .update({
      name:       name || 'My Deck',
      config:     { ...config, name },
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}

export async function deleteDeckConfig(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('deck_configs')
    .delete()
    .eq('id', id)

  if (error) throw error
}
