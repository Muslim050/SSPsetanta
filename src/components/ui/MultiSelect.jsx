import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { AnchoredPopover } from '@/components/ui/AnchoredPopover.jsx'
import { cn } from '@/lib/cn.js'

/**
 * Выпадающий список с мультивыбором. Список — AnchoredPopover: модалка с
 * прокруткой его не обрежет, у нижнего края экрана он откроется вверх.
 * options: [{ id, label }], value: string[], onChange: (nextIds) => void
 */
export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = '— не выбрано —',
  className,
}) {
  // Поле, от которого открыт список; null — список закрыт.
  const [anchorEl, setAnchorEl] = useState(null)
  const open = !!anchorEl

  const toggle = (id) =>
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
    )

  const selected = options.filter((o) => value.includes(o.id))

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={(e) => setAnchorEl(open ? null : e.currentTarget)}
        aria-expanded={open}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-left text-sm transition-all focus-ring focus-visible:border-indigo-300',
          open && 'border-indigo-300',
        )}
      >
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            selected.length ? 'text-ink' : 'text-ink-muted',
          )}
        >
          {selected.length
            ? selected.map((o) => o.label).join(', ')
            : placeholder}
        </span>
        {selected.length > 1 && (
          <span className="shrink-0 rounded-full bg-ink/6 px-1.5 text-[11px] text-ink-muted tnum">
            {selected.length}
          </span>
        )}
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 text-ink-muted transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <AnchoredPopover
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          // Список во всю ширину поля, как раньше.
          width={anchorEl.offsetWidth}
        >
          <div className="max-h-56 overflow-y-auto">
            {options.map((o) => {
              const on = value.includes(o.id)
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  aria-pressed={on}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
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
                  {o.label}
                </button>
              )
            })}
          </div>
        </AnchoredPopover>
      )}
    </div>
  )
}
