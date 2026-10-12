import { PageHeader } from '@/components/PageHeader.jsx'
import { PeriodStatistics } from '@/components/campaigns/PeriodStatistics.jsx'
import { mockRangeSummary } from '@/features/reports/statisticsMock'
import { useMonthRange } from '@/lib/useMonthRange.js'

/**
 * «Статистика» рекламодателя: итоги за период «от и до» по месяцам — пока
 * на моках (statisticsMock), вместе с соцсетями, устройствами и городами.
 */
export default function Reports() {
  const period = useMonthRange()

  return (
    <div>
      <PageHeader />
      <PeriodStatistics
        period={period}
        summary={mockRangeSummary(period.from, period.to)}
      />
    </div>
  )
}
