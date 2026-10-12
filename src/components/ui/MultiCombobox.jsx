import { useState } from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { AnchoredPopover } from '@/components/ui/AnchoredPopover.jsx'
import { cn } from '@/lib/cn.js'

const same = (a, b) => a.toLowerCase() === b.toLowerCase()

/**
 * Поле с подсказками и мультивыбором: варианты отмечают галочками, своё
 * значение вписывают в поиск и добавляют Enter или пунктом «Добавить».
 * value и options — строки; свои значения тоже в списке — их можно снять.
 * Выбранное идёт в порядке вариантов, свои — в конце. Список —
 * AnchoredPopover: таблица его не обрежет.
 */
export function MultiCombobox({
  value = [],
  onChange,
  options,
  placeholder,
  className,
  'aria-label': ariaLabel,
}) {
  // Поле, от которого открыт список; null — закрыт.
  const [anchorEl, setAnchorEl] = useState(null)
  const [query, setQuery] = useState('')
  const open = !!anchorEl

  const custom = value.filter((item) => !options.some((o) => same(o, item)))
  const all = [...options, ...custom]
  const has = (option) => value.some((item) => same(item, option))
  const q = query.trim()
  const shown = q
    ? all.filter((option) => option.toLowerCase().includes(q.toLowerCase()))
    : all
  const canAdd = !!q && !all.some((option) => same(option, q))

  // Варианты — их написанием и в их порядке, свои — следом.
  const commit = (items) =>
    onChange([
      ...options.filter((o) => items.some((item) => same(item, o))),
      ...items.filter((item) => !options.some((o) => same(o, item))),
    ])

  const toggle = (option) =>
    commit(
      has(option)
        ? value.filter((item) => !same(item, option))
        : [...value, option],
    )

  // Enter — то же, что первый пункт: добавить своё или отметить совпавшее.
  const submit = () => {
    if (!q) return
    const match = all.find((option) => same(option, q))
    if (!match) commit([...value, q])
    else if (!has(match)) toggle(match)
    setQuery('')
  }

  const close = () => {
    setAnchorEl(null)
    setQuery('')
  }

  // Как уйдёт на сервер: варианты их написанием, свои — следом.
  const label = [...options.filter(has), ...custom].join(', ')

  return (
    <>
      <button
        type="button"
        onClick={(e) => (open ? close() : setAnchorEl(e.currentTarget))}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={label || undefined}
        className={cn(
          'relative flex w-full items-center rounded-lg border bg-surface py-1 pl-2 pr-7 text-left text-sm transition-colors focus-ring',
          open ? 'border-indigo-500' : 'border-indigo-300',
          className,
        )}
      >
        <span
          className={cn('min-w-0 flex-1 truncate', !label && 'text-ink-muted')}
        >
          {label || placeholder}
        </span>
        {value.length > 1 && (
          <span className="ml-1.5 shrink-0 rounded-full bg-indigo-100 px-1.5 text-[11px] font-semibold text-indigo-900 tnum">
            {value.length}
          </span>
        )}
        <ChevronDown
          size={14}
          className={cn(
            'pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <AnchoredPopover
          anchorEl={anchorEl}
          onClose={close}
          width={Math.max(anchorEl.offsetWidth, 240)}
        >
          <input
            autoFocus
            value={query}
            placeholder="Найти или вписать свою"
            aria-label="Найти или вписать свою"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              submit()
            }}
            className="mb-1 w-full shrink-0 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-hidden transition-colors focus:border-indigo-400"
          />
          <div
            role="listbox"
            aria-multiselectable="true"
            className="max-h-56 overflow-y-auto"
          >
            {canAdd && (
              <button
                type="button"
                onClick={submit}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-ink transition-colors hover:bg-indigo-50"
              >
                <Plus size={14} className="shrink-0 text-indigo-800" />
                <span className="min-w-0 truncate">Добавить «{q}»</span>
              </button>
            )}
            {shown.map((option) => {
              const on = has(option)
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => toggle(option)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors',
                    on
                      ? 'bg-indigo-50 text-indigo-900'
                      : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
                      on
                        ? 'border-indigo-400 bg-indigo-100 text-indigo-900'
                        : 'border-line',
                    )}
                  >
                    {on && <Check size={12} />}
                  </span>
                  <span className="min-w-0">{option}</span>
                </button>
              )
            })}
            {!shown.length && !canAdd && (
              <p className="px-3 py-2 text-[13px] text-ink-muted">
                Ничего не найдено
              </p>
            )}
          </div>
        </AnchoredPopover>
      )}
    </>
  )
}
