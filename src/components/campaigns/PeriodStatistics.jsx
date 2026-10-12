import { MonthTabs } from '@/components/campaigns/MonthTabs.jsx'
import { TotalStatisticsReport } from '@/components/campaigns/CampaignReportPanels.jsx'
import { Field } from '@/components/ui/Field'
import { MonthPicker } from '@/components/ui/MonthPicker.jsx'

/**
 * Верх страницы «Статистика»: вкладки месяцев и карточка «Общая статистика
 * Setanta Sports» с периодом «от и до» и итогами за него. Одна и та же у
 * рекламодателя и у площадки. `period` — из useMonthRange (lib), `summary` — в
 * форме totalSummary (null — грузится: `loading`, или не загрузилось:
 * `error`). `filter` — под подзаголовком карточки (у площадки — выбор
 * рекламодателя); период справа остаётся в одну строку.
 */
export function PeriodStatistics({ period, summary, loading, error, filter }) {
  return (
    <>
      <div className="mb-4">
        <MonthTabs
          year={period.year}
          years={period.years}
          onYearChange={period.pickYear}
          value={period.month}
          onChange={period.pickMonth}
          resetLabel="Вернуться к текущему месяцу"
        />
      </div>

      <TotalStatisticsReport
        title="Общая статистика Setanta Sports"
        summary={summary}
        loading={loading}
        error={error}
        headerExtra={filter}
        emptyNote="За выбранный период данных нет."
        actions={
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[400px]">
            <Field label="Начало периода" required>
              <MonthPicker
                value={period.range.from}
                max={period.range.to}
                onChange={period.setFrom}
              />
            </Field>
            <Field label="Окончание периода" required>
              <MonthPicker
                value={period.range.to}
                min={period.range.from}
                max={period.latest}
                onChange={period.setTo}
              />
            </Field>
          </div>
        }
      />
    </>
  )
}
