import { useState } from 'react'
import { CalendarClock, Clock } from 'lucide-react'
import { AnchoredPopover } from '@/components/ui/AnchoredPopover.jsx'
import { Button } from '@/components/ui/Button'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/cn.js'

const pad = (value) => String(value).padStart(2, '0')

/** 'YYYY-MM-DDTHH:mm' → Date в местной зоне; пусто или мусор — null. */
const parseDateTime = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Date → 'YYYY-MM-DDTHH:mm' в местной зоне (как у datetime-local). */
const formatDateTime = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`

const formatTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`

/**
 * Поле даты со временем на shadcn Calendar вместо input[type=datetime-local]:
 * кнопка в стиле Input, в попапе календарь и время под ним. value —
 * 'YYYY-MM-DDTHH:mm' (как у datetime-local), onChange получает строку того
 * же вида. День меняет дату и сохраняет время; попап закрывает «Готово».
 */
export function DateTimePicker({
  value,
  onChange,
  placeholder = 'дд.мм.гггг, чч:мм',
  className,
  'aria-label': ariaLabel,
}) {
  // Кнопка, от которой открыт попап; null — закрыт.
  const [anchorEl, setAnchorEl] = useState(null)
  const open = !!anchorEl
  const selected = parseDateTime(value)
  const close = () => setAnchorEl(null)

  const pickDay = (day) => {
    if (!day) return
    const next = new Date(day)
    next.setHours(selected?.getHours() ?? 0, selected?.getMinutes() ?? 0)
    onChange(formatDateTime(next))
  }

  const pickTime = (time) => {
    const [hours, minutes] = time.split(':').map(Number)
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return
    const next = selected ? new Date(selected) : new Date()
    next.setHours(hours, minutes, 0, 0)
    onChange(formatDateTime(next))
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => setAnchorEl(open ? null : e.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3.5 text-left text-sm transition-all focus-ring',
          open && 'border-indigo-300',
          className,
        )}
      >
        <span
          className={cn(
            'truncate tnum',
            selected ? 'text-ink' : 'text-ink-muted',
          )}
        >
          {selected
            ? `${selected.toLocaleDateString('ru-RU')}, ${formatTime(selected)}`
            : placeholder}
        </span>
        <CalendarClock size={16} className="shrink-0 text-ink-muted" />
      </button>

      {open && (
        <AnchoredPopover
          anchorEl={anchorEl}
          onClose={close}
          width={280}
          className="p-0"
        >
          {/* Попап рисуется порталом, но в дереве React он внутри формы или
              попапа, где лежит поле. Нажатия и клики дальше не пускаем: иначе
              внешний попап сочтёт клик «мимо» и закроется, а Enter и Escape
              сработают и в нём. Escape закрывает только календарь. */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Escape') close()
            }}
            className="flex flex-col items-center"
          >
            <Calendar
              mode="single"
              selected={selected ?? undefined}
              defaultMonth={selected ?? undefined}
              onSelect={pickDay}
              className="[--cell-size:--spacing(9)]"
            />

            <div className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5">
              <Clock size={15} className="shrink-0 text-ink-muted" />
              <input
                type="time"
                value={selected ? formatTime(selected) : ''}
                onChange={(e) => pickTime(e.target.value)}
                aria-label="Время"
                className="h-8 w-[88px] appearance-none rounded-lg border border-line bg-surface px-2 text-[13px] text-ink transition-colors tnum focus-ring focus-visible:border-indigo-300 [&::-webkit-calendar-picker-indicator]:hidden"
              />
              <div className="ml-auto flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(formatDateTime(new Date()))}
                  className="h-8 px-2.5 text-[12px]"
                >
                  Сейчас
                </Button>
                <Button
                  size="sm"
                  onClick={close}
                  className="h-8 px-3 text-[12px]"
                >
                  Готово
                </Button>
              </div>
            </div>
          </div>
        </AnchoredPopover>
      )}
    </>
  )
}
