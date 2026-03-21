import '../global.css'
import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Stack, router, useRootNavigationState } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { supabase } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const navState = useRootNavigationState()

  useEffect(() => {
    // Check for an existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Redirect once navigation is mounted AND auth state is known
  useEffect(() => {
    if (!navState?.key) return  // navigation not ready yet
    if (session === undefined) return // auth check still in flight
    if (session) {
      router.replace('/(tabs)')
    } else {
      router.replace('/auth')
    }
  }, [session, navState?.key])

  const isLoading = session === undefined || !navState?.key

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/index" options={{ headerShown: false }} />
          <Stack.Screen name="profile/index" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="history/index" options={{ headerShown: false }} />
          <Stack.Screen name="deck-builder" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
        <Toast />

        {/* Overlay spinner while auth state and navigation are initializing */}
        {isLoading && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb',
          }}>
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
