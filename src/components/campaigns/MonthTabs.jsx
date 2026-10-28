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
 * Выбор года стрелками среди `years` — рядом с периодом на страницах
 * «Статистика» и в календаре месяцев договора.
 */
export function YearSwitcher({ year, years, onChange, className }) {
  const index = years.indexOf(year)
  const prev = index > 0 ? years[index - 1] : null
  const next = index >= 0 && index < years.length - 1 ? years[index + 1] : null

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-xl border border-line bg-surface p-[4.5px]',
        className,
      )}
    >
      <button
        type="button"
        disabled={prev == null}
        onClick={() => onChange(prev)}
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
        onClick={() => onChange(next)}
        aria-label="Следующий год"
        className={arrowClass}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

/**
 * Годы строкой над месяцами: все сразу на виду, выбранный подчёркнут.
 * Стрелки прятали, что у договора есть следующий год, — его надо было
 * угадать.
 */
function YearRow({ year, years, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Годы"
      className="flex items-center gap-4 px-1.5"
    >
      {years.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={item === year}
          onClick={() => onChange(item)}
          className={cn(
            'border-b-2 pb-0.5 text-[13px] tnum transition-colors focus-ring',
            item === year
              ? 'border-indigo-500 font-semibold text-ink'
              : 'border-transparent font-medium text-ink-muted hover:text-ink',
          )}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

/**
 * Метка текущего месяца — полоска снизу внутри вкладки: фон вкладки занят
 * статусом, обводка — выбором, а полоска видна при любых из них. Вкладке
 * нужен `relative`.
 */
export function NowMark() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-[30%] bottom-0.5 h-0.5 rounded-full bg-indigo-700"
    />
  )
}

/**
 * Фильтр периода: над месяцами — годы строкой (YearRow), ниже 12 месяцев.
 * Отдельной вкладки «Все» нет: фильтр снимает крестик справа (или повторный
 * клик по выбранному месяцу).
 * years: доступные годы, counts: сколько кампаний попадает в каждый месяц,
 * statuses: { [месяц]: 'paid' | 'awaiting' } — статус оплаты договора за месяц.
 * statusTitles: подписи этих статусов в подсказке вкладки.
 * statusFills: свой цвет вкладки для статуса — поверх STATUS_FILLS.
 * resetLabel: что делает крестик — страницы трактуют сброс по-разному.
 * since, until: первый и последний месяц `{ year, month }` (month — с нуля),
 * например срок договора: месяцы вне них не показываем. null — без границы.
 * hidden: месяцы `YYYY-MM`, которых тоже не показываем, — скрытые в
 * договоре (`hiddenMonths`).
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
  since = null,
  until = null,
  hidden = [],
  className,
}) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  // Состояние по умолчанию: страницы открываются на текущем месяце.
  const atDefault = year === currentYear && value === currentMonth

  return (
    // Крестик — по нижнему краю, вровень с месяцами, а не с годами над ними.
    <div className={cn('flex items-end gap-2', className)}>
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        <YearRow year={year} years={years} onChange={onYearChange} />

        <div
          role="tablist"
          aria-label="Месяцы"
          className="no-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-[4.5px]"
        >
          {MONTHS_SHORT.map((label, month) => {
            const at = year * 12 + month
            if (
              (since && at < since.year * 12 + since.month) ||
              (until && at > until.year * 12 + until.month) ||
              hidden.includes(`${year}-${String(month + 1).padStart(2, '0')}`)
            ) {
              return null
            }
            const active = value === month
            const count = counts?.[month] ?? 0
            const status = statuses?.[month] ?? null
            // Прошедшие и текущий месяц — цветные, будущие — серые.
            const passed =
              year < currentYear ||
              (year === currentYear && month <= currentMonth)
            const isNow = year === currentYear && month === currentMonth
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
                        isNow && '· текущий месяц',
                      )
                    : `${MONTHS_FULL[month]} ${year} — месяц ещё не наступил`
                }
                onClick={() => onChange(active ? null : month)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-medium transition-all focus-ring',
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
                {isNow && <NowMark />}
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
