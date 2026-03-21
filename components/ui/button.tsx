import { Pressable, Text, ActivityIndicator } from 'react-native'
import type { PressableProps } from 'react-native'

type Variant = 'default' | 'ghost' | 'outline' | 'destructive'
type Size = 'default' | 'sm' | 'lg' | 'icon'

interface ButtonProps extends PressableProps {
  variant?: Variant
  size?: Size
  loading?: boolean
  className?: string
  textClassName?: string
  children?: React.ReactNode
}

const variantStyles: Record<Variant, string> = {
  default: 'bg-green-600 active:bg-green-700',
  ghost: 'bg-transparent active:bg-gray-100',
  outline: 'bg-transparent border border-gray-300 active:bg-gray-50',
  destructive: 'bg-red-600 active:bg-red-700',
}

const textStyles: Record<Variant, string> = {
  default: 'text-white',
  ghost: 'text-gray-500',
  outline: 'text-gray-900',
  destructive: 'text-white',
}

const sizeStyles: Record<Size, string> = {
  default: 'px-4 py-2.5 rounded-lg',
  sm: 'px-3 py-1.5 rounded-md',
  lg: 'px-6 py-3.5 rounded-xl',
  icon: 'w-10 h-10 rounded-lg',
}

export function Button({
  variant = 'default',
  size = 'default',
  loading,
  className,
  textClassName,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      className={`flex-row items-center justify-center gap-2 ${variantStyles[variant]} ${sizeStyles[size]} ${disabled || loading ? 'opacity-50' : ''} ${className ?? ''}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <ActivityIndicator size="small" color={variant === 'default' || variant === 'destructive' ? '#fff' : '#374151'} />}
      {typeof children === 'string' ? (
        <Text className={`font-semibold text-sm ${textStyles[variant]} ${textClassName ?? ''}`}>
          {children}
        </Text>
      ) : children}
    </Pressable>
  )
}
