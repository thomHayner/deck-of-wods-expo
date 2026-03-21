import type { CardSuit } from './types'

/** Per-suit color tokens. Values are Tailwind utility class strings. */
export type SuitColorConfig = Record<CardSuit, { text: string; bg: string }>

/**
 * Traditional playing-card colors:
 *   red suits  (hearts, diamonds) → red
 *   black suits (clubs, spades)   → near-black, adapts for dark mode
 *
 * To customise suit colors in the future, create a new SuitColorConfig and
 * pass it as the second argument to getSuitColor() / getSuitBgColor().
 */
export const DEFAULT_SUIT_COLORS: SuitColorConfig = {
  hearts:   { text: 'text-red-600 dark:text-red-500',             bg: 'bg-red-600 dark:bg-red-500'             },
  diamonds: { text: 'text-red-600 dark:text-red-500',             bg: 'bg-red-600 dark:bg-red-500'             },
  clubs:    { text: 'text-neutral-900 dark:text-neutral-100',     bg: 'bg-neutral-900 dark:bg-neutral-100'     },
  spades:   { text: 'text-neutral-900 dark:text-neutral-100',     bg: 'bg-neutral-900 dark:bg-neutral-100'     },
  joker:    { text: 'text-purple-600',                            bg: 'bg-purple-600'                          },
}
