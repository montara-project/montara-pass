import { useEffect, useEffectEvent, type RefObject } from 'react'

/**
 * Closes an open menu on Escape and on a press anywhere outside it.
 *
 * @param inside what counts as the menu; its own button, so it can close it by itself
 * @param close told whether Escape or a press outside closed it
 */
export function useDismiss(
  open: boolean,
  inside: RefObject<HTMLElement | null>[],
  close: (by: 'escape' | 'outside') => void
) {
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape') close('escape')
  })
  const onPress = useEffectEvent((e: MouseEvent) => {
    const target = e.target as Node
    if (!inside.some((ref) => ref.current?.contains(target))) close('outside')
  })

  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => onKey(e)
    const press = (e: MouseEvent) => onPress(e)
    document.addEventListener('keydown', key)
    document.addEventListener('mousedown', press)
    return () => {
      document.removeEventListener('keydown', key)
      document.removeEventListener('mousedown', press)
    }
  }, [open])
}
