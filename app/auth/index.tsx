import { useState } from 'react'
import {
  View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase/client'

type Tab = 'signin' | 'signup'

export default function AuthScreen() {
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSignIn() {
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.replace('/')
    setLoading(false)
  }

  async function handleSignUp() {
    setLoading(true); setError(null); setMessage(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else setMessage('Check your email for a confirmation link.')
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 max-w-sm w-full mx-auto">
          {/* Logo */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-2xl bg-green-600 items-center justify-center mb-4">
              <Text className="text-white text-2xl font-bold">♠</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">Deck of WODs</Text>
            <Text className="text-gray-500 text-sm mt-1">Track your card workouts</Text>
          </View>

          {/* Tabs */}
          <View className="flex-row bg-gray-200 rounded-xl p-1 mb-6">
            {(['signin', 'signup'] as Tab[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => { setTab(t); setError(null); setMessage(null) }}
                className={`flex-1 py-2 rounded-lg items-center ${tab === t ? 'bg-white shadow-sm' : ''}`}
              >
                <Text className={`font-semibold text-sm ${tab === t ? 'text-gray-900' : 'text-gray-500'}`}>
                  {t === 'signin' ? 'Sign In' : 'Sign Up'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Form */}
          <View className="gap-3">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Email</Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-base"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Password</Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-base"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              />
            </View>

            {error && (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <Text className="text-red-700 text-sm">{error}</Text>
              </View>
            )}

            {message && (
              <View className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <Text className="text-green-700 text-sm">{message}</Text>
              </View>
            )}

            <Pressable
              onPress={tab === 'signin' ? handleSignIn : handleSignUp}
              disabled={loading || !email || !password}
              className={`bg-green-600 rounded-xl py-3.5 items-center mt-1 ${(loading || !email || !password) ? 'opacity-50' : ''}`}
            >
              <Text className="text-white font-semibold text-base">
                {loading ? 'Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
