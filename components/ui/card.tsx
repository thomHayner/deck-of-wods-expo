import { View, Text } from 'react-native'
import type { ViewProps, TextProps } from 'react-native'

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className ?? ''}`}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={`px-4 pt-4 pb-2 ${className ?? ''}`} {...props} />
}

export function CardContent({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={`px-4 pt-4 pb-4 ${className ?? ''}`} {...props} />
}

export function CardTitle({ className, ...props }: TextProps & { className?: string }) {
  return (
    <Text
      className={`text-base font-semibold text-gray-900 ${className ?? ''}`}
      {...props}
    />
  )
}
