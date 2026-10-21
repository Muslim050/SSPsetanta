import { PageHeader } from '@/components/PageHeader.jsx'
import { PeriodStatistics } from '@/components/campaigns/PeriodStatistics.jsx'
import { DEMO_DEVICE, DEMO_GEO } from '@/features/reports/statisticsMock'
import { usePeriodTotals } from '@/features/reports/usePeriodTotals'
import { useMonthRange } from '@/lib/useMonthRange.js'

/**
 * «Статистика» рекламодателя: итоги за период «от и до» — `totals`
 * статистики просмотров за диапазон месяцев (см. usePeriodTotals).
 * Сервер сам оставляет рекламодателю только его договоры. Устройства и
 * география — пока демо (statisticsMock).
 */
export default function Reports() {
  const period = useMonthRange()
  const header = usePeriodTotals({
    from: period.from,
    to: period.to,
    advertiserId: null,
  })

  return (
    <div>
      <PageHeader />
      <PeriodStatistics
        period={period}
        summary={
          header.summary && {
            ...header.summary,
            device: DEMO_DEVICE,
            geo: DEMO_GEO,
          }
        }
        loading={header.loading}
        error={header.error}
      />
    </div>
  )
}
