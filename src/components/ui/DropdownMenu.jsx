import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { AnchoredPopover } from '@/components/ui/AnchoredPopover.jsx'
import { cn } from '@/lib/cn.js'

/**
 * Меню «…». Открывается через AnchoredPopover: не обрезается карточкой,
 * у края экрана само уходит вверх.
 * items: [{ label, icon, onClick, tone? }]
 */
export function DropdownMenu({ items, trigger, align = 'right' }) {
  // Кнопка, от которой открыто меню; null — меню закрыто.
  const [anchorEl, setAnchorEl] = useState(null)
  const open = !!anchorEl

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => setAnchorEl(open ? null : e.currentTarget)}
        aria-expanded={open}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-ink/6 hover:text-ink focus-ring',
          open && 'bg-ink/6 text-ink',
        )}
      >
        {trigger || <MoreHorizontal size={18} />}
      </button>

      {open && (
        <AnchoredPopover
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          align={align}
          width={176}
        >
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setAnchorEl(null)
                it.onClick()
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                it.tone === 'danger'
                  ? 'text-danger hover:bg-danger/8'
                  : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
              )}
            >
              {it.icon && <it.icon size={15} />}
              {it.label}
            </button>
          ))}
        </AnchoredPopover>
      )}
    </div>
  )
}
