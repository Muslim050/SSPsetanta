import { useQuery } from '@tanstack/react-query'
import * as reportsApi from '@/api/endpoints/reports'
import { reportKeys } from '@/features/reports/queries'

/**
 * Четыре блока «Статистики» за месяцы `from`…`to` — `totals` статистики
 * просмотров за диапазон (`GET /reports/views-statistics`): сервер сам
 * складывает ручные отчёты договоров по всем месяцам. `advertiserId` — только
 * договоры этого рекламодателя, null — все; рекламодателю сервер и так
 * оставляет только его договоры.
 *
 * Возвращает summary в форме totalSummary (без соцсетей, устройств и городов —
 * они ниже на странице свои) или null, пока грузится или не загрузилось.
 */
export function usePeriodTotals({ from, to, advertiserId }) {
  const query = useQuery({
    queryKey: reportKeys.viewsStatsRange(from, to, advertiserId),
    queryFn: () => reportsApi.viewsStatisticsRange(from, to, advertiserId),
  })

  return {
    loading: query.isPending,
    error: query.isError,
    summary: query.data
      ? { totals: query.data.totals, social: {}, device: null, geo: [] }
      : null,
  }
}
