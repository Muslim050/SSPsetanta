import { useState } from 'react'
import {
  MONTHS_FULL,
  MONTHS_SHORT,
  YearSwitcher,
} from '@/components/campaigns/MonthTabs.jsx'
import { periodKey } from '@/components/campaigns/StatusPopover.jsx'
import { cn } from '@/lib/cn.js'

/** Месяц даты `YYYY-MM-DD` одним числом: год × 12 + месяц; нет даты — null. */
const monthIndex = (date) =>
  date ? Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1 : null

/**
 * Календарь месяцев договора: в какие месяцы срока он виден на «Статусе
 * оплаты». Цветные — показываем, серые — скрыты; месяцы вне срока
 * недоступны. Срок без даты с одной стороны открыт — там календарь доходит до
 * текущего года. Договор без обеих дат календарь не показывает: месяцев у него
 * нет.
 *
 * value — скрытые месяцы `YYYY-MM`, onChange получает новый список по
 * возрастанию — в том же виде его ждёт сервер (`hiddenMonths`).
 */
export function ContractMonthsCalendar({ start, end, value, onChange }) {
  const currentYear = new Date().getFullYear()
  const from = monthIndex(start)
  const to = monthIndex(end)
  const firstYear =
    from != null
      ? Math.floor(from / 12)
      : Math.min(Math.floor(to / 12), currentYear)
  const lastYear =
    to != null ? Math.floor(to / 12) : Math.max(firstYear, currentYear)
  const years = Array.from(
    { length: lastYear - firstYear + 1 },
    (_, i) => firstYear + i,
  )
  // Открываемся на текущем году, если он в сроке, иначе — на первом.
  const [year, setYear] = useState(() =>
    years.includes(currentYear) ? currentYear : firstYear,
  )
  const hidden = new Set(value)

  const toggle = (period) => {
    const next = new Set(hidden)
    if (next.has(period)) next.delete(period)
    else next.add(period)
    onChange([...next].sort())
  }

  return (
    <div>
      <YearSwitcher
        year={year}
        years={years}
        onChange={setYear}
        className="flex w-full justify-between"
      />
      <div className="mt-2 grid grid-cols-4 gap-1">
        {MONTHS_SHORT.map((label, month) => {
          const at = year * 12 + month
          const inTerm =
            (from == null || at >= from) && (to == null || at <= to)
          const period = periodKey(year, month)
          const isHidden = hidden.has(period)
          return (
            <button
              key={label}
              type="button"
              disabled={!inTerm}
              aria-pressed={inTerm ? !isHidden : undefined}
              onClick={() => toggle(period)}
              title={
                inTerm
                  ? `${MONTHS_FULL[month]} ${year} — ${isHidden ? 'скрыт' : 'показан'}`
                  : `${MONTHS_FULL[month]} ${year} — вне срока договора`
              }
              className={cn(
                'rounded-lg py-1.5 text-[12px] font-medium transition-colors focus-ring',
                !inTerm
                  ? 'cursor-default text-ink-muted/40'
                  : isHidden
                    ? 'bg-ink/6 text-ink-muted line-through hover:bg-ink/10'
                    : 'bg-indigo-100 text-indigo-900 hover:bg-indigo-200',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
