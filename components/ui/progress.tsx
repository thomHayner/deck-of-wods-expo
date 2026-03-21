import { View } from 'react-native'

interface ProgressProps {
  value: number  // 0–100
  className?: string
}

export function Progress({ value, className }: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), 100)
  return (
    <View className={`bg-gray-200 rounded-full overflow-hidden ${className ?? 'h-2'}`}>
      <View
        className="bg-green-600 h-full rounded-full"
        style={{ width: `${clamped}%` }}
      />
    </View>
  )
}
