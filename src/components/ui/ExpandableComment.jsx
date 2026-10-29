import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn.js'

/**
 * Комментарий к выплате или к смене статуса: одна строка с многоточием,
 * а если не влез — раскрывается по клику целиком и сворачивается обратно.
 */
export function ExpandableComment({ text }) {
  const [expanded, setExpanded] = useState(false)
  // Обрезан ли текст многоточием — меряем, пока он свёрнут.
  const [clipped, setClipped] = useState(false)
  const measure = (el) => {
    if (el && !expanded) setClipped(el.scrollWidth > el.clientWidth)
  }

  if (!clipped && !expanded) {
    return (
      <p ref={measure} className="truncate text-[11px] text-ink-muted">
        {text}
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded((value) => !value)}
      aria-expanded={expanded}
      title={expanded ? 'Свернуть комментарий' : 'Показать комментарий целиком'}
      className="flex w-full min-w-0 items-start gap-1 rounded text-left text-[11px] text-ink-muted transition-colors hover:text-ink-soft focus-ring"
    >
      <span
        ref={measure}
        className={cn(
          'min-w-0 flex-1',
          expanded ? 'whitespace-pre-wrap break-words' : 'truncate',
        )}
      >
        {text}
      </span>
      <ChevronDown
        size={12}
        className={cn(
          'mt-0.5 shrink-0 transition-transform',
          expanded && 'rotate-180',
        )}
      />
    </button>
  )
}
