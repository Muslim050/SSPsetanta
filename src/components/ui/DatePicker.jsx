import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { AnchoredPopover } from '@/components/ui/AnchoredPopover.jsx'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/cn.js'

const pad = (value) => String(value).padStart(2, '0')

/** 'YYYY-MM-DD' → Date в местной зоне; пусто — null. */
const parseDay = (value) => {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Date → 'YYYY-MM-DD' в местной зоне. */
const formatDay = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/**
 * Поле даты на shadcn Calendar вместо input[type=date]: кнопка в стиле Input
 * и календарь в попапе. value, min, max — 'YYYY-MM-DD' (как у поля даты);
 * дни за min и max недоступны. clearable — показать «Очистить».
 */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'дд.мм.гггг',
  clearable = false,
  className,
}) {
  // Кнопка, от которой открыт календарь; null — закрыт.
  const [anchorEl, setAnchorEl] = useState(null)
  const open = !!anchorEl
  const selected = parseDay(value)
  const disabled = [
    min && { before: parseDay(min) },
    max && { after: parseDay(max) },
  ].filter(Boolean)

  return (
    <>
      <button
        type="button"
        onClick={(e) => setAnchorEl(open ? null : e.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3.5 text-left text-sm transition-all focus-ring',
          open && 'border-indigo-300',
          className,
        )}
      >
        <span className={cn('tnum', selected ? 'text-ink' : 'text-ink-muted')}>
          {selected ? selected.toLocaleDateString('ru-RU') : placeholder}
        </span>
        <CalendarDays size={16} className="shrink-0 text-ink-muted" />
      </button>

      {open && (
        <AnchoredPopover
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          width={280}
          className="items-center p-0"
        >
          <Calendar
            mode="single"
            selected={selected ?? undefined}
            defaultMonth={selected ?? parseDay(min) ?? undefined}
            disabled={disabled}
            onSelect={(date) => {
              if (!date) return
              setAnchorEl(null)
              onChange(formatDay(date))
            }}
            className="[--cell-size:--spacing(9)]"
          />
          {clearable && value && (
            <button
              type="button"
              onClick={() => {
                setAnchorEl(null)
                onChange('')
              }}
              className="mb-3 rounded-lg px-3 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink focus-ring"
            >
              Очистить
            </button>
          )}
        </AnchoredPopover>
      )}
    </>
  )
}
