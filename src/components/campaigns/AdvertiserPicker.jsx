import { useState } from 'react'
import { Building2, Check, ChevronDown, X } from 'lucide-react'
import { AnchoredPopover } from '@/components/ui/AnchoredPopover.jsx'
import { Avatar } from '@/components/ui/Avatar.jsx'
import { advertiserLogo } from '@/features/advertisers/logo'
import { cn } from '@/lib/cn.js'

/**
 * Компактный выбор рекламодателя: кнопка «Выбрать рекламодателя» и список
 * с логотипами. Выбран — на кнопке его логотип и имя, крестик возвращает ко
 * всем. value — id строкой, '' — все рекламодатели.
 */
export function AdvertiserPicker({ advertisers, value, onChange }) {
  // Кнопка, от которой открыт список; null — закрыт.
  const [anchorEl, setAnchorEl] = useState(null)
  const open = !!anchorEl
  const selected = advertisers.find((item) => String(item.id) === value)
  const sorted = [...advertisers].sort((a, b) =>
    a.name.localeCompare(b.name, 'ru'),
  )

  const pick = (next) => {
    setAnchorEl(null)
    onChange(next)
  }

  return (
    <div className="mt-3 flex items-center gap-1.5">
      <button
        type="button"
        onClick={(e) => setAnchorEl(open ? null : e.currentTarget)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'inline-flex h-9 max-w-[280px] items-center gap-2 rounded-xl border bg-surface/80 pl-1.5 pr-2.5 text-[13px] font-medium text-ink transition-colors hover:border-indigo-400 hover:bg-indigo-50 focus-ring',
          open ? 'border-indigo-400 bg-indigo-50' : 'border-line',
        )}
      >
        {selected ? (
          <Avatar
            name={selected.name}
            color={selected.color}
            src={advertiserLogo(selected)}
            size="sm"
            className="h-6 w-6 rounded-md"
          />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-900">
            <Building2 size={14} />
          </span>
        )}
        <span className="truncate">
          {selected ? selected.name : 'Выбрать рекламодателя'}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            'shrink-0 text-ink-muted transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {selected && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Все рекламодатели"
          title="Все рекламодатели"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-ink/6 hover:text-ink focus-ring"
        >
          <X size={14} />
        </button>
      )}

      {open && (
        <AnchoredPopover
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          width={260}
        >
          <div role="listbox" className="max-h-72 overflow-y-auto">
            {[{ id: '', name: 'Все рекламодатели' }, ...sorted].map((item) => {
              const id = String(item.id)
              const active = id === (value ?? '')
              return (
                <button
                  key={id || 'all'}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors',
                    active
                      ? 'bg-indigo-50 font-semibold text-ink'
                      : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
                  )}
                >
                  {id ? (
                    <Avatar
                      name={item.name}
                      color={item.color}
                      src={advertiserLogo(item)}
                      size="sm"
                      className="h-7 w-7 rounded-md"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-100 text-indigo-900">
                      <Building2 size={14} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  {active && (
                    <Check size={14} className="shrink-0 text-indigo-800" />
                  )}
                </button>
              )
            })}
          </div>
        </AnchoredPopover>
      )}
    </div>
  )
}
