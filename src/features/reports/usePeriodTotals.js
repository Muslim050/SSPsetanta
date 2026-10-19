import { useQueries } from '@tanstack/react-query'
import * as reportsApi from '@/api/endpoints/reports'
import { reportKeys } from '@/features/reports/queries'

const KEYS = [
  'liveCount',
  'standardCount',
  'eventPromoCount',
  'totalSeconds',
  'liveViews',
  'ottPrerollViews',
  'ottLiveViews',
]

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
 * Четыре блока «Статистики» за месяцы периода — `totals` статистики
 * просмотров каждого месяца (`views-statistics`), сложенные: сервер сам
 * складывает ручные отчёты договоров. `advertiserId` — только договоры этого
 * рекламодателя, null — все. Без рекламодателя запрос тот же, что грузит
 * аудиторию месяца, — кэш общий.
 *
 * Возвращает summary в форме totalSummary (без соцсетей, устройств и городов —
 * они ниже на странице свои) или null, пока грузится или не загрузилось.
 */
export function usePeriodTotals({ periods, advertiserId }) {
  const results = useQueries({
    queries: periods.map((period) => ({
      queryKey: reportKeys.viewsStats(period, advertiserId),
      queryFn: () => reportsApi.viewsStatistics(period, advertiserId),
    })),
  })
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
