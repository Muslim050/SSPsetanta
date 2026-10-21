import { PageHeader } from '@/components/PageHeader.jsx'
import { PeriodStatistics } from '@/components/campaigns/PeriodStatistics.jsx'
import { usePeriodTotals } from '@/features/reports/usePeriodTotals'
import { useMonthRange } from '@/lib/useMonthRange.js'

/**
 * «Статистика» рекламодателя: итоги за период «от и до» — `totals`
 * статистики просмотров каждого месяца, сложенные (см. usePeriodTotals).
 * Сервер сам оставляет рекламодателю только его договоры.
 */
export default function Reports() {
  const period = useMonthRange()
  const header = usePeriodTotals({
    periods: period.periods,
    advertiserId: null,
  })

  return (
    <div>
      <PageHeader />
      <PeriodStatistics
        period={period}
        summary={header.summary}
        loading={header.loading}
        error={header.error}
      />
    </div>
  )
}
