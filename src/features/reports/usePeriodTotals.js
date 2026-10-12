import { useQueries } from '@tanstack/react-query'
import * as reportsApi from '@/api/endpoints/reports'
import { reportKeys } from '@/features/reports/queries'

const KEYS = ['liveCount', 'eventPromoCount', 'totalSeconds', 'liveViews']

/** Итоги месяцев в один: значение есть хоть за один месяц — сумма, иначе null. */
function sumTotals(list) {
  return Object.fromEntries(
    KEYS.map((key) => {
      const values = list
        .map((totals) => totals?.[key])
        .filter((value) => value != null)
      return [
        key,
        values.length
          ? values.reduce((sum, value) => sum + Number(value), 0)
          : null,
      ]
    }),
  )
}

/**
 * Четыре блока «Статистики» за месяцы периода — с сервера, сложенные:
 * - без рекламодателя (`contractIds` = null) — `totals` статистики просмотров
 *   каждого месяца (`views-statistics`): сервер сам складывает ручные отчёты
 *   всех договоров. Тот же запрос грузит аудиторию месяца — кэш общий;
 * - с рекламодателем — `total-statistics` каждого его договора за каждый
 *   месяц: статистика просмотров по рекламодателям не делится.
 *
 * Возвращает summary в форме totalSummary (без соцсетей, устройств и городов —
 * они ниже на странице свои) или null, пока грузится или не загрузилось.
 */
export function usePeriodTotals({ periods, contractIds }) {
  const queries =
    contractIds == null
      ? periods.map((period) => ({
          queryKey: reportKeys.viewsStats(period),
          queryFn: () => reportsApi.viewsStatistics(period),
        }))
      : contractIds.flatMap((id) =>
          periods.map((period) => ({
            queryKey: reportKeys.totalStats(id, period),
            queryFn: () => reportsApi.totalStatistics(id, period),
          })),
        )
  const results = useQueries({ queries })
  const loading = results.some(
    (result) => result.isPending && result.fetchStatus !== 'idle',
  )
  const error = results.some((result) => result.isError)

  return {
    loading,
    error,
    summary:
      loading || error
        ? null
        : {
            totals: sumTotals(results.map((result) => result.data?.totals)),
            social: {},
            device: null,
            geo: [],
          },
  }
}
