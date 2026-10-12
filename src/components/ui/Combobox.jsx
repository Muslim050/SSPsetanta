import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AnchoredPopover } from '@/components/ui/AnchoredPopover.jsx'
import { cn } from '@/lib/cn.js'

/**
 * Поле с подсказками: значение выбирают из списка или вписывают своё.
 * Список фильтруется по набранному; совпало ровно с вариантом — показываем
 * все, чтобы можно было сменить. ↑↓ — по списку, Enter — выбрать, Escape —
 * закрыть. Список — AnchoredPopover: таблица его не обрежет.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  className,
  'aria-label': ariaLabel,
}) {
  // Поле, под которым открыт список; null — закрыт.
  const [anchorEl, setAnchorEl] = useState(null)
  const [active, setActive] = useState(-1)

  const query = (value ?? '').trim().toLowerCase()
  const exact = options.some((option) => option.toLowerCase() === query)
  const shown =
    !query || exact
      ? options
      : options.filter((option) => option.toLowerCase().includes(query))
  const open = !!anchorEl && shown.length > 0

  const close = () => {
    setAnchorEl(null)
    setActive(-1)
  }

  const pick = (option) => {
    onChange(option)
    close()
  }

  return (
    <>
      <div className="relative">
        <input
          value={value ?? ''}
          placeholder={placeholder}
          aria-label={ariaLabel}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          onFocus={(e) => setAnchorEl(e.currentTarget)}
          onBlur={close}
          onChange={(e) => {
            onChange(e.target.value)
            setAnchorEl(e.currentTarget)
            setActive(-1)
          }}
          onKeyDown={(e) => {
            if (!open) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((index) => (index + 1) % shown.length)
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((index) => (index <= 0 ? shown.length - 1 : index - 1))
            } else if (e.key === 'Enter' && active >= 0) {
              e.preventDefault()
              pick(shown[active])
            }
          }}
          className={cn(
            'w-full rounded-lg border border-indigo-300 bg-surface py-1 pl-2 pr-7 text-sm text-ink outline-hidden transition-colors focus:border-indigo-500 focus-ring',
            className,
          )}
        />
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted"
        />
      </div>

      {open && (
        <AnchoredPopover
          anchorEl={anchorEl}
          onClose={close}
          width={Math.max(anchorEl.offsetWidth, 200)}
        >
          <div role="listbox" className="max-h-56 overflow-y-auto">
            {shown.map((option, index) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={index === active}
                // Фокус остаётся в поле: иначе blur закрыл бы список раньше клика.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(option)}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                  index === active
                    ? 'bg-indigo-50 text-ink'
                    : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
                  option.toLowerCase() === query && 'font-semibold text-ink',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </AnchoredPopover>
      )}
    </>
  )
}
