import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { AnchoredPopover } from '@/components/ui/AnchoredPopover.jsx'
import { MONTHS_FULL, MONTHS_SHORT } from '@/components/campaigns/MonthTabs.jsx'
import { cn } from '@/lib/cn.js'

/**
 * Выбор месяца вместо поля даты: кнопка в стиле Input и попап с двенадцатью
 * месяцами. Года здесь нет — его выбирают рядом, например во вкладках
 * месяцев. Нативный input type="month" Safari и Firefox на компьютере не
 * поддерживают — там он превращается в текстовое поле.
 *
 * value, min, max — месяц с нуля (0 — январь); месяцы за min и max недоступны.
 */
export function MonthPicker({
  value,
  onChange,
  min = 0,
  max = 11,
  placeholder = 'Выберите месяц',
  className,
}) {
  // Кнопка, от которой открыт попап; null — закрыт.
  const [anchorEl, setAnchorEl] = useState(null)
  const open = !!anchorEl

  const pick = (month) => {
    setAnchorEl(null)
    onChange(month)
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => setAnchorEl(open ? null : e.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3.5 text-left text-sm text-ink transition-all focus-ring',
          open && 'border-indigo-300',
          className,
        )}
      >
        <span className={cn('truncate', value == null && 'text-ink-muted')}>
          {value == null ? placeholder : MONTHS_FULL[value]}
        </span>
        <CalendarDays size={16} className="shrink-0 text-ink-muted" />
      </button>

      {open && (
        <AnchoredPopover
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          width={240}
          className="p-2"
        >
          <div className="grid grid-cols-3 gap-1">
            {MONTHS_SHORT.map((label, month) => {
              const active = month === value
              return (
                <button
                  key={label}
                  type="button"
                  disabled={month < min || month > max}
                  onClick={() => pick(month)}
                  aria-pressed={active}
                  title={MONTHS_FULL[month]}
                  className={cn(
                    'rounded-lg py-2 text-[13px] font-medium transition-colors focus-ring disabled:cursor-default disabled:text-ink-muted/50',
                    active
                      ? 'bg-indigo-500 font-semibold text-ink'
                      : 'text-ink-soft enabled:hover:bg-ink/5 enabled:hover:text-ink',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </AnchoredPopover>
      )}
    </>
  )
}
