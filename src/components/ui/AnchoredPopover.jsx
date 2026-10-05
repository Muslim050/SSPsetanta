import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePopoverPlacement } from '@/lib/usePopoverPlacement.js'
import { cn } from '@/lib/cn.js'

// Отступ от боковых краёв экрана.
const MARGIN = 12

/**
 * Выпадающее меню у кнопки. Рисуется порталом с position: fixed — его не
 * обрежут карточки и таблицы с overflow. Открывается вниз, а если там не
 * помещается — вверх; в любом случае остаётся в пределах экрана. Едет за
 * кнопкой при прокрутке, закрывается кликом мимо и по Escape.
 *
 * anchorEl — кнопка, от которой открыто; align — к какому её краю
 * прижимать (left | right); width — ширина меню в px.
 */
export function AnchoredPopover({
  anchorEl,
  onClose,
  align = 'left',
  width = 192,
  className,
  children,
}) {
  const ref = useRef(null)
  const [anchor, setAnchor] = useState(() => anchorEl.getBoundingClientRect())
  const { top, maxHeight } = usePopoverPlacement(ref, anchor)

  // Держимся за кнопку: страница или таблица может проехать под меню.
  useEffect(() => {
    const track = () => {
      if (!anchorEl.isConnected) return onClose()
      setAnchor(anchorEl.getBoundingClientRect())
    }
    window.addEventListener('scroll', track, true)
    window.addEventListener('resize', track)
    return () => {
      window.removeEventListener('scroll', track, true)
      window.removeEventListener('resize', track)
    }
  }, [anchorEl, onClose])

  // Клик мимо меню и кнопки, Escape — закрываем. Клик по самой кнопке
  // обрабатывает она: обычно он и закрывает меню.
  useEffect(() => {
    const onDown = (e) => {
      if (ref.current?.contains(e.target) || anchorEl.contains(e.target)) return
      onClose()
    }
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [anchorEl, onClose])

  const left = Math.min(
    Math.max(MARGIN, align === 'right' ? anchor.right - width : anchor.left),
    window.innerWidth - width - MARGIN,
  )

  return createPortal(
    <div
      ref={ref}
      style={{ top, left, width, maxHeight }}
      className={cn(
        'fixed z-50 flex flex-col overflow-y-auto rounded-xl border border-line bg-surface p-1.5 text-left shadow-lift',
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  )
}
