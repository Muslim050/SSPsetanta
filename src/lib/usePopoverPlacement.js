import { useLayoutEffect, useState } from 'react'

// Зазор между ячейкой и поповером и отступ поповера от краёв экрана.
const GAP = 8
const MARGIN = 12

/**
 * Вертикальное положение поповера у ячейки (position: fixed): под ячейкой,
 * если там помещается; иначе над ней; если не помещается ни там, ни там —
 * прижимаем к нижнему краю экрана, а сам поповер прокручивается внутри
 * (maxHeight). Высоту меряем вживую — она меняется вместе с вкладками.
 *
 * ref — корень поповера, anchor — прямоугольник ячейки (getBoundingClientRect).
 */
export function usePopoverPlacement(ref, anchor) {
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setHeight(el.offsetHeight)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  const viewport = window.innerHeight
  const maxHeight = viewport - MARGIN * 2
  const size = Math.min(height, maxHeight)
  const below = anchor.bottom + GAP
  const above = anchor.top - GAP - size
  const top =
    below + size <= viewport - MARGIN
      ? below
      : above >= MARGIN
        ? above
        : Math.max(MARGIN, viewport - MARGIN - size)

  return { top, maxHeight }
}
