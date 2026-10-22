import { useViewsStatisticsPeriod } from '@/features/reports/queries'

/**
 * «Статистика» за месяцы `from`…`to` — одним запросом (см.
 * useViewsStatisticsPeriod): месяц один — статистика месяца, несколько —
 * итоги за диапазон, их сервер сам складывает по месяцам. `advertiserId` —
 * только договоры этого рекламодателя, null — все; рекламодателю сервер и
 * так оставляет только его договоры.
 *
 * Возвращает summary в форме totalSummary (без соцсетей) или null, пока
 * грузится или не загрузилось. Устройства и города в нём есть, только когда
 * месяц один: доли разных месяцев сервер не складывает. `stats` — ответ
 * целиком: за один месяц в нём и остальные доли (возраст, OTT и TV, лиги).
 */
export function usePeriodTotals({ from, to, advertiserId }) {
  const query = useViewsStatisticsPeriod(from, to, advertiserId)
  const stats = query.data

  return {
    loading: query.isPending,
    error: query.isError,
    stats,
    summary: stats
      ? {
          totals: stats.totals,
          social: {},
          device: stats.device ?? null,
          geo: (stats.geo ?? []).map((row) => ({
            name: row.city,
            value: Number(row.value) || 0,
          })),
        }
      : null,
  }
}
