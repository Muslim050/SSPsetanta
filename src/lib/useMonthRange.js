import { useState } from 'react'
import { MONTHS_FULL } from '@/components/campaigns/MonthTabs.jsx'

/** Месяц как 'YYYY-MM'; month — с нуля. */
export const periodOf = (year, month) =>
  `${year}-${String(month + 1).padStart(2, '0')}`

/**
 * Период «от и до» по месяцам внутри года — для страниц «Статистика».
 * Год выбирают стрелками, начало и окончание — месяцы этого года; по
 * умолчанию — текущий месяц. `onChange` зовётся при любой смене периода:
 * например, чтобы сбросить черновик правки.
 *
 * Возвращает год и период, а ещё `month` — месяц, если период ровно в один
 * (его подсвечивает вкладка), иначе null.
 */
export function useMonthRange({ onChange } = {}) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const years = [currentYear - 1, currentYear]

  const [year, setYear] = useState(currentYear)
  const [range, setRange] = useState({ from: currentMonth, to: currentMonth })
  // Последний месяц года, за который уже есть цифры.
  const latest = year === currentYear ? currentMonth : 11
  const month = range.from === range.to ? range.from : null

  const change = (nextYear, nextRange) => {
    setYear(nextYear)
    setRange(nextRange)
    onChange?.()
  }

  return {
    year,
    years,
    range,
    month,
    latest,
    from: periodOf(year, range.from),
    to: periodOf(year, range.to),
    // Все месяцы периода по порядку, 'YYYY-MM'.
    periods: Array.from({ length: range.to - range.from + 1 }, (_, index) =>
      periodOf(year, range.from + index),
    ),
    // «март 2026» или «март — октябрь 2026».
    label:
      month != null
        ? `${MONTHS_FULL[month].toLowerCase()} ${year}`
        : `${MONTHS_FULL[range.from].toLowerCase()} — ${MONTHS_FULL[range.to].toLowerCase()} ${year}`,
    // Вкладка ставит период на свой месяц. Сброс (крестик или повторный
    // клик) возвращает к текущему: без периода смотреть нечего.
    pickMonth: (next) =>
      next == null
        ? change(currentYear, { from: currentMonth, to: currentMonth })
        : change(year, { from: next, to: next }),
    // Другой год: период переезжает вместе с ним, будущие месяцы — на текущий.
    pickYear: (next) => {
      const last = next === currentYear ? currentMonth : 11
      change(next, {
        from: Math.min(range.from, last),
        to: Math.min(range.to, last),
      })
    },
    setFrom: (from) => change(year, { ...range, from }),
    setTo: (to) => change(year, { ...range, to }),
  }
}
