import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader.jsx'
import { MonthTabs } from '@/components/campaigns/MonthTabs.jsx'
import { TotalStatisticsReport } from '@/components/campaigns/CampaignReportPanels.jsx'
import { Field } from '@/components/ui/Field'
import { MonthPicker } from '@/components/ui/MonthPicker.jsx'
import { mockRangeSummary } from '@/features/reports/statisticsMock'

/** Месяц как 'YYYY-MM'; month — с нуля. */
const periodOf = (year, month) =>
  `${year}-${String(month + 1).padStart(2, '0')}`

export default function Reports() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const years = [currentYear - 1, currentYear]

  // Год выбирают во вкладках, период «от и до» — месяцы внутри него.
  // По умолчанию — текущий месяц.
  const [year, setYear] = useState(currentYear)
  const [range, setRange] = useState({ from: currentMonth, to: currentMonth })
  // Последний месяц года, за который уже есть цифры.
  const latest = year === currentYear ? currentMonth : 11
  // Период в один месяц подсвечивает его вкладку.
  const month = range.from === range.to ? range.from : null

  // Вкладка ставит период на свой месяц. Сброс (крестик или повторный клик)
  // возвращает к текущему: без периода смотреть нечего.
  const pickMonth = (next) => {
    if (next == null) {
      setYear(currentYear)
      setRange({ from: currentMonth, to: currentMonth })
      return
    }
    setRange({ from: next, to: next })
  }

  // Другой год: период переезжает вместе с ним, будущие месяцы — на текущий.
  const pickYear = (next) => {
    setYear(next)
    const last = next === currentYear ? currentMonth : 11
    setRange(({ from, to }) => ({
      from: Math.min(from, last),
      to: Math.min(to, last),
    }))
  }

  return (
    <div>
      <PageHeader />

      <div className="mb-4">
        <MonthTabs
          year={year}
          years={years}
          onYearChange={pickYear}
          value={month}
          onChange={pickMonth}
          resetLabel="Вернуться к текущему месяцу"
        />
      </div>

      <TotalStatisticsReport
        title="Общая статистика Setanta Sports"
        summary={mockRangeSummary(
          periodOf(year, range.from),
          periodOf(year, range.to),
        )}
        emptyNote="За выбранный период данных нет."
        actions={
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[400px]">
            <Field label="Начало периода" required>
              <MonthPicker
                value={range.from}
                max={range.to}
                onChange={(from) => setRange({ ...range, from })}
              />
            </Field>
            <Field label="Окончание периода" required>
              <MonthPicker
                value={range.to}
                min={range.from}
                max={latest}
                onChange={(to) => setRange({ ...range, to })}
              />
            </Field>
          </div>
        }
      />
    </div>
  )
}
