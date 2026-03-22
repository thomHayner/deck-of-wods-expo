import { createClient } from '@/lib/supabase/client'

export type FreeWorkoutType = 'running' | 'walking' | 'cycling' | 'hiking'

export interface FreeSessionRow {
  id: string
  user_id: string
  completed_at: string
  workout_type: FreeWorkoutType
  duration_seconds: number
  distance_km: number
  calories: number
  avg_speed_kmh: number | null
}

export interface SaveFreeSessionInput {
  workout_type: FreeWorkoutType
  duration_seconds: number
  distance_km: number
  calories: number
}

export async function saveFreeSession(input: SaveFreeSessionInput): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const avg_speed_kmh = input.duration_seconds > 0
    ? (input.distance_km / input.duration_seconds) * 3600
    : null

  const { error } = await supabase.from('free_sessions').insert({
    user_id: user.id,
    workout_type: input.workout_type,
    duration_seconds: input.duration_seconds,
    distance_km: input.distance_km,
    calories: Math.round(input.calories),
    avg_speed_kmh,
  })

  if (error) throw error
}

export async function getFreeSessions(): Promise<FreeSessionRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('free_sessions')
    .select('*')
    .order('completed_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getFreeSessionById(id: string): Promise<FreeSessionRow | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('free_sessions')
    .select('*')
    .eq('id', id)
    .single()
  return data ?? null
}
