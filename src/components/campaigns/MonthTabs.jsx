import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/cn.js'

export const MONTHS_SHORT = [
  'Янв',
  'Фев',
  'Мар',
  'Апр',
  'Май',
  'Июн',
  'Июл',
  'Авг',
  'Сен',
  'Окт',
  'Ноя',
  'Дек',
]

export const MONTHS_FULL = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

/**
 * Фирменный жёлтый с нарастанием: январь почти прозрачный, к декабрю —
 * насыщенный #FFD106. Классы прописаны строками: Tailwind не собирает их
 * по шаблону.
 */
const MONTH_FILLS = [
  'bg-lime-50',
  'bg-[#FFFAE0]',
  'bg-[#FFF8D2]',
  'bg-lime-100',
  'bg-indigo-100',
  'bg-[#FFEE9A]',
  'bg-lime-200',
  'bg-indigo-200',
  'bg-[#FFDF52]',
  'bg-[#FFD93B]',
  'bg-[#FFD520]',
  'bg-[#FFD106]',
]

// Месяцы, которые ещё не наступили, — серые и без кампаний.
const FUTURE_FILL = 'bg-ink/3 text-ink-muted/70 cursor-default'

// Месяц со статусом оплаты перекрашивается: зелёный — оплачен, красный — ждём.
const STATUS_FILLS = {
  paid: 'bg-success/25 font-semibold text-success hover:bg-success/35',
  awaiting: 'bg-danger/25 font-semibold text-danger hover:bg-danger/35',
}

const arrowClass =
  'flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted transition-colors focus-ring enabled:hover:bg-ink/6 enabled:hover:text-ink-soft disabled:opacity-35'

/**
 * Фильтр периода: слева выбор года стрелками, справа 12 месяцев.
 * Отдельной вкладки «Все» нет: фильтр снимает крестик справа (или повторный
 * клик по выбранному месяцу).
 * years: доступные годы, counts: сколько кампаний попадает в каждый месяц,
 * statuses: { [месяц]: 'paid' | 'awaiting' } — статус оплаты договора за месяц.
 * statusTitles: подписи этих статусов в подсказке вкладки.
 * statusFills: свой цвет вкладки для статуса — поверх STATUS_FILLS.
 * resetLabel: что делает крестик — страницы трактуют сброс по-разному.
 */
export function MonthTabs({
  year,
  years,
  onYearChange,
  value,
  onChange,
  counts,
  statuses,
  statusTitles = { paid: 'оплачен', awaiting: 'ожидает оплату' },
  statusFills,
  resetLabel = 'Показать все месяцы',
  className,
}) {
  const index = years.indexOf(year)
  const prev = index > 0 ? years[index - 1] : null
  const next = index >= 0 && index < years.length - 1 ? years[index + 1] : null

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  // Состояние по умолчанию: страницы открываются на текущем месяце.
  const atDefault = year === currentYear && value === currentMonth

  return (
    <div className={cn('flex  items-center gap-2', className)}>
      <div className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-line bg-surface p-[4.5px]">
        <button
          type="button"
          disabled={prev == null}
          onClick={() => onYearChange(prev)}
          aria-label="Предыдущий год"
          className={arrowClass}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-[46px] text-center text-[13px] font-semibold text-ink tnum">
          {year}
        </span>
        <button
          type="button"
          disabled={next == null}
          onClick={() => onYearChange(next)}
          aria-label="Следующий год"
          className={arrowClass}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Месяцы"
        className="no-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-[4.5px]"
      >
        {MONTHS_SHORT.map((label, month) => {
          const active = value === month
          const count = counts?.[month] ?? 0
          const status = statuses?.[month] ?? null
          // Прошедшие и текущий месяц — цветные, будущие — серые.
          const passed =
            year < currentYear ||
            (year === currentYear && month <= currentMonth)
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={!passed}
              title={
                passed
                  ? cn(
                      `${MONTHS_FULL[month]} ${year}`,
                      status && `· ${statusTitles[status]}`,
                    )
                  : `${MONTHS_FULL[month]} ${year} — месяц ещё не наступил`
              }
              onClick={() => onChange(active ? null : month)}
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-medium transition-all focus-ring',
                passed
                  ? status
                    ? (statusFills?.[status] ?? STATUS_FILLS[status])
                    : cn(
                        MONTH_FILLS[month],
                        'text-indigo-900 hover:brightness-[0.97]',
                      )
                  : FUTURE_FILL,
                active && 'font-semibold ring-2 ring-indigo-700',
              )}
            >
              {label}
              {passed && count > 0 && (
                <span className="rounded-full bg-black/[0.07] px-1 text-[11px] tnum">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Крестик появляется, только когда ушли от того, что страница
          открывает сама, — текущего месяца. Сбрасывать состояние, в которое
          и так попадаешь при входе, нечего. По повторному клику по вкладке
          догадываются не все, поэтому на других месяцах он нужен. */}
      {value != null && !atDefault && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={resetLabel}
          title={resetLabel}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-danger/25 bg-danger text-white transition-colors hover:bg-danger/50 hover:text-white focus-ring"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
