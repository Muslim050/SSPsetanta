/**
 * Сводки вкладок Statistic отчёта за месяц.
 *
 * Spot — записи `spots` ручного отчёта (`GET …/manual`, отдельный от
 * файлового), их заводят через `POST …/manual` — см. spotSummary.
 * Total — готовые итоги сервера (`GET …/total-statistics`) — см. totalSummary.
 */

// Каналы Spot: `channel` — канал в ручном отчёте.
export const CHANNELS = [
  { name: 'Setanta Sports 1', code: 'S1', channel: 'ss1' },
  { name: 'Setanta Sports 2', code: 'S2', channel: 'ss2' },
]

const num = (value) => Number(value) || 0

/**
 * Цифры вкладки Spot — записи `spots` ручного отчёта, по каналу на запись.
 * Пустые `spots` — цифры за месяц не заведены: null.
 */
export function spotSummary(report) {
  const spots = report?.spots ?? []
  if (!spots.length) return null
  const byChannel = Object.fromEntries(
    spots.map((spot) => [spot.channel, spot]),
  )
  return {
    channels: CHANNELS.map(({ name, code, channel }) => {
      const spot = byChannel[channel] ?? {}
      return {
        name,
        code,
        channel,
        standardSpots: num(spot.standardCount),
        standardSeconds: num(spot.standardSeconds),
        liveAds: num(spot.liveCount),
        liveSeconds: num(spot.liveSeconds),
        liveViews: num(spot.liveViews),
      }
    }),
    eventPromo: report.eventPromoCount ?? null,
    ottPreroll: report.ottPrerollViews ?? null,
  }
}

/**
 * Итоги вкладки Total из ответа `total-statistics`: счётчики как есть
 * (`null` — ручного отчёта нет, на карточке прочерк) и соцсети по сети.
 */
export function totalSummary(data) {
  const byNetwork = Object.fromEntries(
    (data?.socials ?? []).map((item) => [
      item.network,
      { posts: num(item.posts), impressions: num(item.impressions) },
    ]),
  )
  const empty = { posts: 0, impressions: 0 }
  return {
    totals: data?.totals ?? {},
    social: {
      instagram: byNetwork.instagram ?? empty,
      telegram: byNetwork.telegram ?? empty,
    },
  }
}

/**
 * Тело ручного отчёта из цифр вкладки Spot. Счётчики каналов сервер требует
 * числами, промо и прероллы можно оставить пустыми — null.
 */
export function manualReportInput({ channels, eventPromo, ottPreroll }) {
  return {
    eventPromoCount: eventPromo ?? null,
    ottPrerollViews: ottPreroll ?? null,
    spots: channels.map((channel) => ({
      channel: channel.channel,
      standardCount: num(channel.standardSpots),
      standardSeconds: num(channel.standardSeconds),
      liveCount: num(channel.liveAds),
      liveSeconds: num(channel.liveSeconds),
      liveViews: num(channel.liveViews),
    })),
  }
}
