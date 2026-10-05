import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader.jsx'
import { MonthTabs } from '@/components/campaigns/MonthTabs.jsx'
import { TotalStatisticsReport } from '@/components/campaigns/CampaignReportPanels.jsx'
import { Field, Input } from '@/components/ui/Field'
import { mockRangeSummary } from '@/features/reports/statisticsMock'

const pad = (value) => String(value).padStart(2, '0')

/** Период ровно в календарный месяц: с первого по последнее число. */
function monthRange(year, month) {
  const last = new Date(year, month + 1, 0).getDate()
  const prefix = `${year}-${pad(month + 1)}`
  return { from: `${prefix}-01`, to: `${prefix}-${pad(last)}` }
}

/** Месяц, который период покрывает ровно, — его вкладка подсвечена; иначе null. */
function monthOf({ from, to }) {
  if (!from) return null
  const [year, month] = from.split('-').map(Number)
  const range = monthRange(year, month - 1)
  return range.from === from && range.to === to
    ? { year, month: month - 1 }
    : null
}

export default function Reports() {
  const now = new Date()
  const years = [now.getFullYear() - 1, now.getFullYear()]
  const [year, setYear] = useState(now.getFullYear())
  // Период «от и до»; по умолчанию — текущий месяц.
  const [range, setRange] = useState(() =>
    monthRange(now.getFullYear(), now.getMonth()),
  )
  const exact = monthOf(range)
  const month = exact?.year === year ? exact.month : null

  // Вкладка ставит период на свой месяц. Сброс (крестик или повторный клик)
  // возвращает к текущему: без периода смотреть нечего.
  const pickMonth = (next) => {
    if (next == null) {
      setYear(now.getFullYear())
      setRange(monthRange(now.getFullYear(), now.getMonth()))
      return
    }
    setRange(monthRange(year, next))
  }

  // Другой год: выбранный месяц переезжает вместе с ним, будущий — на текущий.
  const pickYear = (next) => {
    setYear(next)
    if (month == null) return
    const latest = next === now.getFullYear() ? now.getMonth() : 11
    setRange(monthRange(next, Math.min(month, latest)))
  }

  // Даты вручную. Вкладки переходят на год начала периода.
  const setDate = (key, value) => {
    setRange((current) => ({ ...current, [key]: value }))
    const nextYear = Number(value.slice(0, 4))
    if (key === 'from' && years.includes(nextYear)) setYear(nextYear)
  }

  const errors = {
    from: range.from ? null : 'Укажите начало периода',
    to: !range.to
      ? 'Укажите окончание периода'
      : range.from && range.to < range.from
        ? 'Окончание должно быть позже начала'
        : null,
  }
  const valid = !errors.from && !errors.to

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
        summary={mockRangeSummary(range.from, range.to)}
        // Период с ошибкой объясняют сами поля дат.
        emptyNote={valid ? 'За выбранный период данных нет.' : null}
        actions={
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[400px]">
            <Field label="Начало периода" required error={errors.from}>
              <Input
                type="date"
                value={range.from}
                max={range.to || undefined}
                onChange={(e) => setDate('from', e.target.value)}
              />
            </Field>
            <Field label="Окончание периода" required error={errors.to}>
              <Input
                type="date"
                value={range.to}
                min={range.from || undefined}
                onChange={(e) => setDate('to', e.target.value)}
              />
            </Field>
          </div>
        }
      />
    </div>
  )
}
