import { createClient } from '@/lib/supabase/client'

export interface ProfileRow {
  id: string
  display_name: string | null
  unit_system: 'metric' | 'imperial'
  /** @deprecated use unit_system */
  distance_unit: 'km' | 'miles'
  /** @deprecated use unit_system */
  weight_unit: 'kg' | 'pounds'
  step_goal: number
  calorie_goal: number
  active_minutes_goal: number
  weekly_workout_goal: number
  date_of_birth: string | null   // YYYY-MM-DD
  biological_sex: 'male' | 'female' | 'other' | null
  maf_adjustment: -10 | -5 | 0 | 5
  height_cm: number | null
  weight_kg: number | null
  created_at: string
  updated_at: string
}

export interface UpdateProfileInput {
  display_name?: string
  unit_system?: 'metric' | 'imperial'
  /** @deprecated use unit_system */
  distance_unit?: 'km' | 'miles'
  /** @deprecated use unit_system */
  weight_unit?: 'kg' | 'pounds'
  step_goal?: number
  calorie_goal?: number
  active_minutes_goal?: number
  weekly_workout_goal?: number
  date_of_birth?: string | null
  biological_sex?: 'male' | 'female' | 'other' | null
  maf_adjustment?: -10 | -5 | 0 | 5
  height_cm?: number | null
  weight_kg?: number | null
}

export async function getProfile(): Promise<ProfileRow | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .single()

  if (error) return null
  return data
}

export async function updateProfile(input: UpdateProfileInput): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')

  if (error) throw error
}
