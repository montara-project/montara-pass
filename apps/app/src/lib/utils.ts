import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * `text-meta` and `text-label` are registered as font sizes, so a colour
 * beside one does not delete it: without this, `cn('text-meta text-good')`
 * reads both as font sizes, keeps the second, and the element falls back to
 * the inherited body size.
 */
const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['micro', 'label', 'meta'],
    },
  },
})

/**
 * Merge Tailwind CSS classes
 * @param inputs - Class names to merge
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs))
}
