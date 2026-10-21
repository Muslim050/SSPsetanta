import { X } from 'lucide-react'
import { YearSwitcher } from '@/components/campaigns/MonthTabs.jsx'
import { TotalStatisticsReport } from '@/components/campaigns/CampaignReportPanels.jsx'
import { Field } from '@/components/ui/Field'
import { MonthPicker } from '@/components/ui/MonthPicker.jsx'

const RESET_LABEL = 'Вернуться к текущему месяцу'

/**
 * Верх страницы «Статистика»: карточка «Общая статистика Setanta Sports» с
 * годом, периодом «от и до» и итогами за него. Ушли от текущего месяца —
 * рядом с периодом крестик, который к нему возвращает. Одна и та же у
 * рекламодателя и у площадки. `period` — из useMonthRange (lib), `summary` — в
 * форме totalSummary (null — грузится: `loading`, или не загрузилось:
 * `error`). `filter` — под подзаголовком карточки (у площадки — выбор
 * рекламодателя); период справа остаётся в одну строку.
 */
export function PeriodStatistics({ period, summary, loading, error, filter }) {
  return (
    <TotalStatisticsReport
      title="Общая статистика Setanta Sports"
      summary={summary}
      loading={loading}
      error={error}
      headerExtra={filter}
      emptyNote="За выбранный период данных нет."
      actions={
        // Крестик — вне сетки: появляясь, он не сжимает поля периода.
        <div className="flex w-full items-end gap-2 lg:w-auto">
          <div className="grid w-full gap-3 sm:grid-cols-[auto_1fr_1fr] lg:w-[540px]">
            {/* Не Field: его <label> переадресовал бы клик по подписи на
                стрелку «предыдущий год». */}
            <div className="space-y-1.5">
              <span className="block text-[13px] font-medium text-ink-soft">
                Год
              </span>
              <YearSwitcher
                year={period.year}
                years={period.years}
                onChange={period.pickYear}
                className="flex h-11 w-full justify-between px-1.5"
              />
            </div>
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
          {/* Как у выбора рекламодателя; mb-2 — по центру полей высотой h-11. */}
          {!period.isCurrent && (
            <button
              type="button"
              onClick={() => period.pickMonth(null)}
              aria-label={RESET_LABEL}
              title={RESET_LABEL}
              className="mb-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger text-white transition-colors hover:bg-danger/50 focus-ring"
            >
              <X size={14} />
            </button>
          )}
        </div>
      }
    />
  )
}
