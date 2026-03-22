import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, Pressable, TextInput, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { User, Target, Ruler, Activity, LogOut, ChevronLeft, Shield, ChevronRight } from 'lucide-react-native'
import { Card, CardContent } from '@/components/ui/card'
import { getProfile, updateProfile, type ProfileRow } from '@/lib/db/profiles'
import { supabase } from '@/lib/supabase/client'

const PRIMARY = '#16a34a'
const MUTED   = '#6b7280'

// ── Unit helpers ─────────────────────────────────────────────────────────────
const cmToFtIn = (cm: number) => {
  const totalInches = cm / 2.54
  const ft = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return { ft, inches }
}
const ftInToCm = (ft: number, inches: number) => ft * 30.48 + inches * 2.54
const kgToLbs  = (kg: number) => Math.round(kg * 2.20462 * 10) / 10
const lbsToKg  = (lbs: number) => Math.round((lbs / 2.20462) * 100) / 100

// ── BMI helpers ───────────────────────────────────────────────────────────────
const calcBMI = (weightKg: number, heightCm: number) =>
  weightKg / Math.pow(heightCm / 100, 2)

const getBMICategory = (bmi: number): { label: string; color: string } => {
  if (bmi < 18.5) return { label: 'Underweight', color: '#3b82f6' }
  if (bmi < 25)   return { label: 'Normal',      color: '#16a34a' }
  if (bmi < 30)   return { label: 'Overweight',  color: '#d97706' }
  return               { label: 'Obese',          color: '#dc2626' }
}

const getBmiSegmentId = (bmi: number) => {
  if (bmi < 18.5) return 'underweight'
  if (bmi < 25)   return 'normal'
  if (bmi < 30)   return 'overweight'
  return 'obese'
}

const BMI_SEGMENTS = [
  { id: 'underweight', label: 'Underweight', range: '< 18.5',    flex: 2.5, color: '#60a5fa',
    desc: 'May indicate insufficient nutrition. A doctor can help identify causes and suggest a path forward.' },
  { id: 'normal',      label: 'Normal',      range: '18.5–24.9', flex: 6.5, color: '#4ade80',
    desc: 'Lowest health risk for most adults. Maintain it through balanced nutrition and regular activity.' },
  { id: 'overweight',  label: 'Overweight',  range: '25–29.9',   flex: 5,   color: '#fbbf24',
    desc: 'Modest increased risk for heart disease and diabetes. Diet and consistent movement help.' },
  { id: 'obese',       label: 'Obese',       range: '≥ 30',      flex: 10,  color: '#f87171',
    desc: 'Elevated risk for chronic conditions. Working with a healthcare provider is recommended.' },
] as const

const HR_ZONES = [
  { zone: 'Z1', label: 'Recovery',  min: 0.50, max: 0.60, bg: '#dbeafe', text: '#1d4ed8' },
  { zone: 'Z2', label: 'Fat Burn',  min: 0.60, max: 0.70, bg: '#dcfce7', text: '#15803d' },
  { zone: 'Z3', label: 'Aerobic',   min: 0.70, max: 0.80, bg: '#fef9c3', text: '#a16207' },
  { zone: 'Z4', label: 'Anaerobic', min: 0.80, max: 0.90, bg: '#ffedd5', text: '#c2410c' },
  { zone: 'Z5', label: 'Max',       min: 0.90, max: 1.00, bg: '#fee2e2', text: '#b91c1c' },
]

const MAF_BANDS = [
  { label: 'Recovery', desc: 'below MAF', bg: '#f1f5f9', text: '#64748b', highlight: false },
  { label: 'Aerobic Base', desc: 'MAF zone', bg: '#d1fae5', text: '#065f46', highlight: true },
  { label: 'Anaerobic', desc: 'above MAF', bg: '#ffedd5', text: '#9a3412', highlight: false },
]

const calcAge = (dob: string) => {
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// ── Reusable input row ────────────────────────────────────────────────────────
function InputRow({
  label, value, onChangeText, placeholder, suffix, keyboardType = 'numeric',
}: {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  suffix?: string
  keyboardType?: 'numeric' | 'default'
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1.5">{label}</Text>
      <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-xl px-4">
        <TextInput
          className="flex-1 py-3 text-base text-gray-900"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType={keyboardType}
        />
        {suffix && <Text className="text-sm text-gray-500 ml-1">{suffix}</Text>}
      </View>
    </View>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title }: { icon: typeof User; title: string }) {
  return (
    <View className="flex-row items-center gap-2 mb-4">
      <Icon size={16} color={PRIMARY} />
      <Text className="font-semibold text-gray-900">{title}</Text>
    </View>
  )
}

// ── SaveButton ────────────────────────────────────────────────────────────────
function SaveButton({ onPress, saving, label }: { onPress: () => void; saving: boolean; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={saving}
      className={`border border-gray-300 rounded-xl py-3 items-center ${saving ? 'opacity-60' : ''}`}
    >
      {saving
        ? <ActivityIndicator size="small" color={MUTED} />
        : <Text className="font-medium text-gray-700">{label}</Text>
      }
    </Pressable>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const [email, setEmail]       = useState('')
  const [profile, setProfile]   = useState<ProfileRow | null>(null)

  // Goals
  const [stepGoal, setStepGoal]               = useState('10000')
  const [calorieGoal, setCalorieGoal]         = useState('500')
  const [activeMinutesGoal, setActiveMinutesGoal] = useState('30')
  const [weeklyWorkoutGoal, setWeeklyWorkoutGoal] = useState('3')
  const [savingGoals, setSavingGoals]         = useState(false)

  // Units
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric')

  // Physical
  const [dateOfBirth, setDateOfBirth]     = useState('')
  const [biologicalSex, setBiologicalSex] = useState<'male' | 'female' | 'other' | ''>('')
  const [mafAdjust, setMafAdjust]         = useState<-10 | -5 | 0 | 5>(0)
  const [heightCm, setHeightCm]           = useState('')
  const [heightFt, setHeightFt]           = useState('')
  const [heightIn, setHeightIn]           = useState('')
  const [weightDisplay, setWeightDisplay] = useState('')
  const [savingPhysical, setSavingPhysical] = useState(false)

  // BMI interaction
  const [activeSeg, setActiveSeg] = useState<string | null>(null)

  // Sex picker open state
  const [sexPickerOpen, setSexPickerOpen]   = useState(false)
  const [mafPickerOpen, setMafPickerOpen]   = useState(false)

  const initFromProfile = (p: ProfileRow) => {
    setStepGoal(String(p.step_goal))
    setCalorieGoal(String(p.calorie_goal))
    setActiveMinutesGoal(String(p.active_minutes_goal ?? 30))
    setWeeklyWorkoutGoal(String(p.weekly_workout_goal ?? 3))
    const sys: 'metric' | 'imperial' =
      p.unit_system ?? (p.weight_unit === 'pounds' ? 'imperial' : 'metric')
    setUnitSystem(sys)
    setDateOfBirth(p.date_of_birth ?? '')
    setBiologicalSex(p.biological_sex ?? '')
    setMafAdjust((p.maf_adjustment ?? 0) as -10 | -5 | 0 | 5)
    if (p.height_cm) {
      if (sys === 'imperial') {
        const { ft, inches } = cmToFtIn(p.height_cm)
        setHeightFt(String(ft)); setHeightIn(String(inches))
      } else {
        setHeightCm(String(Math.round(p.height_cm)))
      }
    }
    if (p.weight_kg) {
      setWeightDisplay(sys === 'imperial' ? String(kgToLbs(p.weight_kg)) : String(p.weight_kg))
    }
    if (p.height_cm && p.weight_kg) {
      setActiveSeg(getBmiSegmentId(calcBMI(p.weight_kg, p.height_cm)))
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
    getProfile().then(p => { if (p) { setProfile(p); initFromProfile(p) } })
  }, [])

  const handleSaveGoals = async () => {
    setSavingGoals(true)
    await updateProfile({
      step_goal:            Number(stepGoal)            || 10000,
      calorie_goal:         Number(calorieGoal)         || 500,
      active_minutes_goal:  Number(activeMinutesGoal)   || 30,
      weekly_workout_goal:  Number(weeklyWorkoutGoal)   || 3,
    }).catch(console.error)
    setSavingGoals(false)
  }

  const handleUnitSystemChange = async (sys: 'metric' | 'imperial') => {
    setUnitSystem(sys)
    await updateProfile({ unit_system: sys }).catch(console.error)
    if (profile) {
      if (sys === 'imperial') {
        if (profile.height_cm) {
          const { ft, inches } = cmToFtIn(profile.height_cm)
          setHeightFt(String(ft)); setHeightIn(String(inches))
        }
        if (profile.weight_kg) setWeightDisplay(String(kgToLbs(profile.weight_kg)))
      } else {
        if (profile.height_cm) setHeightCm(String(Math.round(profile.height_cm)))
        if (profile.weight_kg) setWeightDisplay(String(profile.weight_kg))
      }
    }
  }

  const handleSavePhysical = async () => {
    setSavingPhysical(true)
    let height_cm: number | null = null
    if (unitSystem === 'imperial') {
      const total = ftInToCm(Number(heightFt) || 0, Number(heightIn) || 0)
      if (total > 0) height_cm = Math.round(total * 10) / 10
    } else {
      const cm = Number(heightCm)
      if (cm > 0) height_cm = cm
    }
    const w = Number(weightDisplay)
    const weight_kg = w > 0 ? (unitSystem === 'imperial' ? lbsToKg(w) : w) : null

    await updateProfile({
      date_of_birth:   dateOfBirth || null,
      biological_sex:  (biologicalSex || null) as 'male' | 'female' | 'other' | null,
      maf_adjustment:  mafAdjust,
      height_cm,
      weight_kg,
    }).catch(console.error)

    const updated = await getProfile().catch(() => null)
    if (updated) {
      setProfile(updated)
      if (updated.height_cm && updated.weight_kg) {
        setActiveSeg(getBmiSegmentId(calcBMI(updated.weight_kg, updated.height_cm)))
      }
    }
    setSavingPhysical(false)
  }

  // ── Computed metrics ───────────────────────────────────────────────────────
  const bmi       = profile?.height_cm && profile?.weight_kg ? calcBMI(profile.weight_kg, profile.height_cm) : null
  const bmiCat    = bmi ? getBMICategory(bmi) : null
  const age       = profile?.date_of_birth ? calcAge(profile.date_of_birth) : null
  const maxHR     = age !== null ? 220 - age : null
  const mafHR     = age !== null ? (180 - age) + mafAdjust : null
  const initials  = email ? email[0].toUpperCase() : '?'
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : ''

  const SEX_OPTIONS: Array<{ value: 'male' | 'female' | 'other' | ''; label: string }> = [
    { value: '', label: 'Prefer not to say' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ]
  const MAF_OPTIONS: Array<{ value: -10 | -5 | 0 | 5; label: string }> = [
    { value: -10, label: '−10 · Illness, rehab, medication, or burnout' },
    { value: -5,  label: '−5 · Injured, inconsistent, not improving' },
    { value: 0,   label: '±0 · Consistent training 4×/wk for 2+ yrs' },
    { value: 5,   label: '+5 · 2+ yrs training, injury-free & improving' },
  ]

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-4 pb-3 border-b border-gray-200 bg-white flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <ChevronLeft size={24} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">Profile & Settings</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── User card ── */}
        <Card>
          <CardContent>
            <View className="flex-row items-center gap-4">
              <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center">
                <Text className="text-2xl font-bold text-green-600">{initials}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900">
                  {profile?.display_name || email}
                </Text>
                {profile?.display_name && (
                  <Text className="text-sm text-gray-500">{email}</Text>
                )}
                {memberSince !== '' && (
                  <Text className="text-xs text-gray-400 mt-1">Member since {memberSince}</Text>
                )}
              </View>
            </View>
          </CardContent>
        </Card>

        <View className="h-3" />

        {/* ── Physical Details ── */}
        <Card>
          <CardContent>
            <SectionHeader icon={User} title="Physical Details" />

            {/* Date of birth */}
            <InputRow
              label="Date of Birth (YYYY-MM-DD)"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="1990-01-15"
              keyboardType="default"
            />

            {/* Biological sex picker */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Biological Sex</Text>
              <Pressable
                onPress={() => setSexPickerOpen(o => !o)}
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between"
              >
                <Text className="text-base text-gray-900">
                  {SEX_OPTIONS.find(o => o.value === biologicalSex)?.label ?? 'Prefer not to say'}
                </Text>
                <ChevronRight size={16} color={MUTED} />
              </Pressable>
              {sexPickerOpen && (
                <View className="mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden">
                  {SEX_OPTIONS.map(opt => (
                    <Pressable
                      key={opt.value}
                      onPress={() => { setBiologicalSex(opt.value); setSexPickerOpen(false) }}
                      className={`px-4 py-3 ${biologicalSex === opt.value ? 'bg-green-50' : ''}`}
                    >
                      <Text className={`text-base ${biologicalSex === opt.value ? 'text-green-700 font-medium' : 'text-gray-900'}`}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <Text className="text-xs text-gray-400 mt-1">Used for more accurate health calculations.</Text>
            </View>

            {/* Height */}
            {unitSystem === 'imperial' ? (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1.5">Height</Text>
                <View className="flex-row gap-3">
                  <View className="flex-1 flex-row items-center bg-gray-50 border border-gray-300 rounded-xl px-4">
                    <TextInput
                      className="flex-1 py-3 text-base text-gray-900"
                      value={heightFt}
                      onChangeText={setHeightFt}
                      placeholder="5"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                    />
                    <Text className="text-sm text-gray-500">ft</Text>
                  </View>
                  <View className="flex-1 flex-row items-center bg-gray-50 border border-gray-300 rounded-xl px-4">
                    <TextInput
                      className="flex-1 py-3 text-base text-gray-900"
                      value={heightIn}
                      onChangeText={setHeightIn}
                      placeholder="10"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                    />
                    <Text className="text-sm text-gray-500">in</Text>
                  </View>
                </View>
              </View>
            ) : (
              <InputRow
                label="Height"
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder="175"
                suffix="cm"
              />
            )}

            {/* Weight */}
            <InputRow
              label="Weight"
              value={weightDisplay}
              onChangeText={setWeightDisplay}
              placeholder={unitSystem === 'imperial' ? '165' : '75'}
              suffix={unitSystem === 'imperial' ? 'lbs' : 'kg'}
            />

            {/* MAF adjustment picker */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">MAF Training Status</Text>
              <Pressable
                onPress={() => setMafPickerOpen(o => !o)}
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between"
              >
                <Text className="text-base text-gray-900 flex-1 mr-2" numberOfLines={1}>
                  {MAF_OPTIONS.find(o => o.value === mafAdjust)?.label}
                </Text>
                <ChevronRight size={16} color={MUTED} />
              </Pressable>
              {mafPickerOpen && (
                <View className="mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden">
                  {MAF_OPTIONS.map(opt => (
                    <Pressable
                      key={opt.value}
                      onPress={() => { setMafAdjust(opt.value); setMafPickerOpen(false) }}
                      className={`px-4 py-3 ${mafAdjust === opt.value ? 'bg-green-50' : ''}`}
                    >
                      <Text className={`text-sm ${mafAdjust === opt.value ? 'text-green-700 font-medium' : 'text-gray-900'}`}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <Text className="text-xs text-gray-400 mt-1">
                Adjusts your MAF heart rate target (Maffetone method).
              </Text>
            </View>

            <SaveButton onPress={handleSavePhysical} saving={savingPhysical} label="Save Physical Details" />
          </CardContent>
        </Card>

        {/* ── Body Metrics ── */}
        {(age !== null || bmi !== null || maxHR !== null) && (
          <>
            <View className="h-3" />
            <Card>
              <CardContent>
                <SectionHeader icon={Activity} title="Body Metrics" />

                {/* Age */}
                {age !== null && (
                  <View className="flex-row gap-4 mb-5">
                    <View className="flex-1 bg-gray-50 rounded-xl p-4 items-center">
                      <Text className="text-xs text-gray-500 mb-1">Chronological</Text>
                      <View className="flex-row items-baseline gap-1">
                        <Text className="text-3xl font-bold text-gray-900">{age}</Text>
                        <Text className="text-sm text-gray-500">yrs</Text>
                      </View>
                    </View>
                    <View className="flex-1 bg-gray-50 rounded-xl p-4 items-center">
                      <Text className="text-xs text-gray-500 mb-1">Body Age</Text>
                      <Text className="text-3xl font-bold text-gray-300">—</Text>
                      <Text className="text-xs text-gray-400 mt-1 text-center">Needs resting HR</Text>
                    </View>
                  </View>
                )}

                {/* BMI */}
                {bmi !== null && bmiCat !== null && (
                  <View className="mb-5">
                    <View className="flex-row items-center gap-3 mb-3">
                      <Text className="text-3xl font-bold text-gray-900">{bmi.toFixed(1)}</Text>
                      <View className="rounded-full px-3 py-1" style={{ backgroundColor: bmiCat.color + '22' }}>
                        <Text className="text-xs font-semibold" style={{ color: bmiCat.color }}>{bmiCat.label}</Text>
                      </View>
                    </View>
                    {/* BMI bar */}
                    <View className="flex-row h-3 rounded-full overflow-hidden gap-px mb-1">
                      {BMI_SEGMENTS.map(seg => (
                        <Pressable
                          key={seg.id}
                          style={{ flex: seg.flex, backgroundColor: seg.color, opacity: activeSeg && activeSeg !== seg.id ? 0.3 : 1 }}
                          onPress={() => setActiveSeg(prev => prev === seg.id ? null : seg.id)}
                        />
                      ))}
                    </View>
                    <View className="flex-row justify-between mb-2">
                      {['16', '18.5', '25', '30', '40'].map(v => (
                        <Text key={v} className="text-xs text-gray-400">{v}</Text>
                      ))}
                    </View>
                    {/* Segment info */}
                    {(() => {
                      const segId = activeSeg ?? getBmiSegmentId(bmi)
                      const seg = BMI_SEGMENTS.find(s => s.id === segId)!
                      return (
                        <View className="rounded-xl p-3 border border-gray-200 bg-gray-50">
                          <Text className="text-sm font-semibold text-gray-900">
                            {seg.label} · BMI {seg.range}
                          </Text>
                          <Text className="text-xs text-gray-600 mt-1 leading-5">{seg.desc}</Text>
                        </View>
                      )
                    })()}
                  </View>
                )}

                {/* Heart rate zones */}
                {maxHR !== null && mafHR !== null && age !== null && (
                  <View>
                    <Text className="text-sm font-medium text-gray-500 mb-3">Heart Rate Zones</Text>
                    <View className="flex-row gap-3">
                      {/* Traditional */}
                      <View className="flex-1">
                        <Text className="text-xs text-gray-400 text-center mb-2">Traditional · {maxHR} max</Text>
                        <View className="gap-1">
                          {HR_ZONES.map(z => {
                            const lo = Math.round(maxHR * z.min)
                            const hi = z.max === 1.00 ? maxHR : Math.round(maxHR * z.max)
                            return (
                              <View key={z.zone} className="flex-row items-center justify-between px-2 py-1.5 rounded-lg"
                                style={{ backgroundColor: z.bg }}>
                                <View className="flex-row items-center gap-1">
                                  <Text className="text-xs font-bold" style={{ color: z.text }}>{z.zone}</Text>
                                  <Text className="text-xs opacity-70" style={{ color: z.text }}>{z.label}</Text>
                                </View>
                                <Text className="text-xs font-semibold" style={{ color: z.text }}>{lo}–{hi}</Text>
                              </View>
                            )
                          })}
                        </View>
                      </View>
                      {/* MAF */}
                      <View className="flex-1">
                        <Text className="text-xs text-gray-400 text-center mb-2">
                          MAF · {mafHR} target{mafAdjust !== 0 ? ` (${mafAdjust > 0 ? '+' : ''}${mafAdjust})` : ''}
                        </Text>
                        <View className="gap-1">
                          {MAF_BANDS.map(b => {
                            const rangeTxt =
                              b.desc === 'below MAF' ? `< ${mafHR - 10}` :
                              b.desc === 'MAF zone'  ? `${mafHR - 10}–${mafHR}` :
                                                       `> ${mafHR}`
                            return (
                              <View key={b.label}
                                className={`flex-row items-center justify-between px-2 py-1.5 rounded-lg ${b.highlight ? 'border border-green-300' : ''}`}
                                style={{ backgroundColor: b.bg }}>
                                <Text className="text-xs font-semibold" style={{ color: b.text }}>{b.label}</Text>
                                <Text className="text-xs font-semibold" style={{ color: b.text }}>{rangeTxt}</Text>
                              </View>
                            )
                          })}
                        </View>
                        <Text className="text-xs text-gray-400 mt-2 leading-4">
                          Builds fat-burning efficiency with minimal stress.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <View className="h-3" />

        {/* ── Daily Goals ── */}
        <Card>
          <CardContent>
            <SectionHeader icon={Target} title="Daily Goals" />
            <InputRow label="Daily Step Goal"           value={stepGoal}          onChangeText={setStepGoal}          placeholder="10000" />
            <InputRow label="Daily Active Calorie Goal" value={calorieGoal}       onChangeText={setCalorieGoal}       placeholder="500" />
            <InputRow label="Daily Active Minutes Goal" value={activeMinutesGoal} onChangeText={setActiveMinutesGoal} placeholder="30" />
            <InputRow label="Weekly Workout Goal"       value={weeklyWorkoutGoal} onChangeText={setWeeklyWorkoutGoal} placeholder="3" suffix="workouts/wk" />
            <SaveButton onPress={handleSaveGoals} saving={savingGoals} label="Save Goals" />
          </CardContent>
        </Card>

        <View className="h-3" />

        {/* ── Units ── */}
        <Card>
          <CardContent>
            <SectionHeader icon={Ruler} title="Units" />
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-medium text-gray-900">Unit System</Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  {unitSystem === 'metric' ? 'km · kg · cm' : 'miles · lbs · ft/in'}
                </Text>
              </View>
              <View className="flex-row rounded-xl overflow-hidden border border-gray-200">
                {(['metric', 'imperial'] as const).map(sys => (
                  <Pressable
                    key={sys}
                    onPress={() => handleUnitSystemChange(sys)}
                    className={`px-4 py-2 ${unitSystem === sys ? 'bg-green-600' : 'bg-white'}`}
                  >
                    <Text className={`text-sm font-medium capitalize ${unitSystem === sys ? 'text-white' : 'text-gray-500'}`}>
                      {sys === 'metric' ? 'Metric' : 'Imperial'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </CardContent>
        </Card>

        <View className="h-3" />

        {/* ── Account ── */}
        <Card>
          <CardContent className="py-1">
            <Pressable className="flex-row items-center justify-between py-4">
              <View className="flex-row items-center gap-3">
                <Shield size={16} color={MUTED} />
                <Text className="text-gray-900">Privacy & Security</Text>
              </View>
              <ChevronRight size={16} color={MUTED} />
            </Pressable>
            <View className="h-px bg-gray-100" />
            <Pressable
              onPress={async () => { await supabase.auth.signOut(); router.replace('/auth') }}
              className="flex-row items-center gap-3 py-4"
            >
              <LogOut size={16} color="#ef4444" />
              <Text className="text-red-500">Sign Out</Text>
            </Pressable>
          </CardContent>
        </Card>

        <View className="h-5" />
        <Text className="text-center text-xs text-gray-400">Deck of WODs v1.0.0</Text>
        <Text className="text-center text-xs text-gray-400 mt-1">Made with care for fitness enthusiasts</Text>
      </ScrollView>
    </View>
  )
}
