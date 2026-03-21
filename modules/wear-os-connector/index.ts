/**
 * JS/TS interface for the WearOsConnector Expo native module.
 *
 * Phone → Watch:  sendWorkoutState / sendHistoryToWatch
 * Watch → Phone:  'onWatchMessage' events (addWatchActionListener)
 *
 * All functions are no-ops on non-Android platforms.
 * In Expo SDK 52+, native modules that define Events() are already EventEmitters.
 */

import { Platform } from 'react-native'
import { requireNativeModule, type EventSubscription } from 'expo-modules-core'

type WatchMessageEvent = { action: string }

// Guard: only load on Android. On iOS/web this module won't be compiled in.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NativeModule: any =
  Platform.OS === 'android' ? requireNativeModule('WearOsConnector') : null

// ─────────────────────────────────────────────────────────────────────────────

/** Sends the current workout state to all connected Wear OS nodes. */
export function sendWorkoutState(state: Record<string, unknown>): void {
  if (!NativeModule) return
  NativeModule.sendWorkoutState(state).catch(() => {})
}

/** Sends recent session history to the watch for the idle screen. */
export function sendHistoryToWatch(history: Record<string, unknown>[]): void {
  if (!NativeModule) return
  NativeModule.sendHistoryToWatch(history).catch(() => {})
}

/**
 * Listens for action messages from the watch ('completeCard', 'previousCard').
 * Returns an unsubscribe function.
 */
export function addWatchActionListener(
  callback: (action: string) => void
): () => void {
  if (!NativeModule) return () => {}
  const sub: EventSubscription = NativeModule.addListener(
    'onWatchMessage',
    (event: WatchMessageEvent) => callback(event.action)
  )
  return () => sub.remove()
}
