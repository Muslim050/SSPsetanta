import { useId } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn.js'
import { useHorizontalScroll } from '@/lib/useHorizontalScroll.js'

// Подложка активной вкладки: обычная — фирменный жёлтый, «soft» — его
// светлый оттенок для длинных рядов вроде номеров договоров.
const TONES = {
  accent: 'bg-indigo-100 ring-1 ring-inset ring-indigo-600/30',
  soft: 'bg-indigo-100 ring-1 ring-inset ring-indigo-300',
}

// Заливка вкладки статусом: зелёная — оплачено, оранжевая — оплачено
// частично, красная — ждёт денег.
const STATUS_TONES = {
  paid: 'bg-success/10 text-success ring-1 ring-inset ring-success/25 hover:bg-success/15',
  partial:
    'bg-warning/10 text-warning ring-1 ring-inset ring-warning/25 hover:bg-warning/15',
  awaiting:
    'bg-danger/10 text-danger ring-1 ring-inset ring-danger/25 hover:bg-danger/15',
}

// Выбранная вкладка со статусом — в его же цвете вместо жёлтого, но плотнее
// и с обводкой: так видно и статус, и какая вкладка открыта.
const STATUS_ACTIVE = {
  paid: {
    pill: 'bg-success/20 ring-2 ring-inset ring-success/50',
    text: 'text-success',
  },
  partial: {
    pill: 'bg-warning/15 ring-2 ring-inset ring-warning/45',
    text: 'text-warning',
  },
  awaiting: {
    pill: 'bg-danger/15 ring-2 ring-inset ring-danger/45',
    text: 'text-danger',
  },
}

/**
 * Сегментированный переключатель.
 * items: [{ value, label, count?, status?, statusHint?, tooltip? }], value,
 * onChange, tone: accent | soft. `status` (paid | partial | awaiting) красит вкладку в
 * цвет статуса, `statusHint` объясняет её состояние словами — цвет один смысл
 * нести не может, и он же остаётся подсказкой у вкладок без заливки.
 * `tooltip` — своя подсказка вместо «подпись — статус»; скринридер статус
 * всё равно прочтёт.
 */
export function SegmentTabs({
  items,
  value,
  onChange,
  tone = 'accent',
  className,
}) {
  // Свой layoutId на каждый переключатель: на странице их несколько, с общим
  // id подложка перелетала бы из одной группы вкладок в другую.
  const layoutId = useId()
  // Длинный ряд (например, восемь статусов кампании) не помещается в строку.
  // Тогда он прокручивается: колесом над вкладками, выбранная — в виду.
  const { ref } = useHorizontalScroll(value)

  return (
    <div
      ref={ref}
      className={cn(
        'no-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-line bg-surface p-[4.5px] shadow-soft',
        className,
      )}
    >
      {items.map((it) => {
        const active = it.value === value
        const status = !active ? STATUS_TONES[it.status] : null
        const activeStatus = active ? STATUS_ACTIVE[it.status] : null
        return (
          <button
            key={it.value}
            type="button"
            data-active={active}
            onClick={() => onChange(it.value)}
            // Подсказка и подпись для скринридера: по одному цвету статус
            // не прочитать.
            title={
              it.tooltip ??
              (it.statusHint ? `${it.label} — ${it.statusHint}` : undefined)
            }
            aria-label={
              it.statusHint ? `${it.label}, ${it.statusHint}` : undefined
            }
            className={cn(
              'relative shrink-0 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-ring',
              active
                ? (activeStatus?.text ?? 'text-ink')
                : (status ?? 'text-ink-soft hover:bg-indigo-50 hover:text-ink'),
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className={cn(
                  'absolute inset-0 rounded-lg',
                  activeStatus?.pill ?? TONES[tone],
                )}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {it.label}
              {it.count != null && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[11px] tnum',
                    active
                      ? 'bg-black/8 text-ink'
                      : status
                        ? // На цветной подложке счётчик берёт её же цвет.
                          'bg-surface/70 text-current'
                        : 'bg-ink/[0.07] text-ink-soft',
                  )}
                >
                  {it.count}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
