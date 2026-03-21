import { useEffect } from 'react'
import { View, Text, Pressable } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated'
import type { Card, CardSuit } from '@/lib/types'

const SUIT_SYMBOL: Record<CardSuit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
  joker: '★',
}

const SUIT_COLOR: Record<CardSuit, string> = {
  hearts: '#dc2626',
  diamonds: '#dc2626',
  clubs: '#171717',
  spades: '#171717',
  joker: '#7c3aed',
}

type Size = 'sm' | 'md' | 'lg'

const SIZES: Record<Size, { width: number; height: number; valueSize: number; suitSize: number; centerSize: number }> = {
  sm: { width: 64,  height: 96,  valueSize: 12, suitSize: 12, centerSize: 24 },
  md: { width: 96,  height: 144, valueSize: 16, suitSize: 16, centerSize: 36 },
  lg: { width: 128, height: 192, valueSize: 20, suitSize: 20, centerSize: 52 },
}

interface PlayingCardProps {
  card: Card
  exerciseName?: string
  resolvedReps?: number
  isTimed?: boolean
  durationSeconds?: number
  isFlipped?: boolean
  isCompleted?: boolean
  isCurrent?: boolean
  size?: Size
  onPress?: () => void
}

export function PlayingCard({
  card,
  exerciseName,
  resolvedReps,
  isTimed,
  durationSeconds,
  isFlipped = false,
  isCompleted = false,
  isCurrent = false,
  size = 'md',
  onPress,
}: PlayingCardProps) {
  const dims = SIZES[size]
  const suitColor = SUIT_COLOR[card.suit]
  const suitSymbol = SUIT_SYMBOL[card.suit]

  // Flip animation
  const rotation = useSharedValue(isFlipped ? 180 : 0)

  useEffect(() => {
    rotation.value = withTiming(isFlipped ? 180 : 0, { duration: 500 })
  }, [isFlipped])

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(rotation.value, [0, 180], [0, 180])}deg` },
    ],
    backfaceVisibility: 'hidden',
    position: 'absolute',
    width: dims.width,
    height: dims.height,
  }))

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(rotation.value, [0, 180], [180, 360])}deg` },
    ],
    backfaceVisibility: 'hidden',
    position: 'absolute',
    width: dims.width,
    height: dims.height,
  }))

  const repsLabel = isTimed
    ? `${durationSeconds ?? 30}s`
    : resolvedReps != null
      ? `${resolvedReps} reps`
      : null

  return (
    <Pressable
      onPress={onPress}
      style={{ width: dims.width, height: dims.height }}
    >
      {/* Container for flip */}
      <View style={{ width: dims.width, height: dims.height }}>

        {/* Front face */}
        <Animated.View
          style={[frontStyle]}
          className={`bg-white rounded-xl border-2 shadow-md overflow-hidden ${
            isCurrent ? 'border-green-500' : 'border-gray-200'
          } ${isCompleted ? 'opacity-50' : ''}`}
        >
          {/* Top-left corner */}
          <View className="absolute top-1.5 left-2">
            <Text style={{ color: suitColor, fontSize: dims.valueSize, fontWeight: '700', lineHeight: dims.valueSize + 2 }}>
              {card.displayValue}
            </Text>
            <Text style={{ color: suitColor, fontSize: dims.suitSize, lineHeight: dims.suitSize + 2 }}>
              {suitSymbol}
            </Text>
          </View>

          {/* Center */}
          <View className="flex-1 items-center justify-center">
            {exerciseName ? (
              <View className="items-center px-2">
                <Text style={{ color: suitColor, fontSize: dims.centerSize, lineHeight: dims.centerSize }}>
                  {suitSymbol}
                </Text>
                {repsLabel && (
                  <Text className="text-gray-600 text-xs font-medium mt-1 text-center" numberOfLines={2}>
                    {repsLabel}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={{ color: suitColor, fontSize: dims.centerSize, lineHeight: dims.centerSize }}>
                {suitSymbol}
              </Text>
            )}
          </View>

          {/* Bottom-right corner (rotated 180°) */}
          <View className="absolute bottom-1.5 right-2 items-end" style={{ transform: [{ rotate: '180deg' }] }}>
            <Text style={{ color: suitColor, fontSize: dims.valueSize, fontWeight: '700', lineHeight: dims.valueSize + 2 }}>
              {card.displayValue}
            </Text>
            <Text style={{ color: suitColor, fontSize: dims.suitSize, lineHeight: dims.suitSize + 2 }}>
              {suitSymbol}
            </Text>
          </View>

          {/* Completed overlay */}
          {isCompleted && (
            <View className="absolute inset-0 items-center justify-center">
              <View className="w-8 h-8 rounded-full bg-green-500 items-center justify-center">
                <Text className="text-white text-base font-bold">✓</Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Back face */}
        <Animated.View
          style={[backStyle]}
          className="bg-blue-600 rounded-xl border-2 border-blue-700 shadow-md items-center justify-center"
        >
          <Text className="text-white text-4xl">★</Text>
        </Animated.View>
      </View>
    </Pressable>
  )
}
