/**
 * Сводки вкладок Statistic отчёта за месяц.
 *
 * Spot — записи `spots` ручного отчёта (`GET …/manual`, отдельный от
 * файлового), их заводят через `POST …/manual` — см. spotSummary.
 * Total — готовые итоги сервера (`GET …/total-statistics`): счётчики, соцсети,
 * устройства и города — см. totalSummary.
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
        // Лиги Live spot строкой через запятую; сервер пока не хранит.
        liveLeagues: spot.liveLeagues ?? '',
      }
    }),
    eventPromo: report.eventPromoCount ?? null,
    ottPreroll: report.ottPrerollViews ?? null,
  }
}

/** Число соцсети как есть: `null` остаётся `null` — по нему сеть скрываем. */
const numOrNull = (value) => (value == null ? null : num(value))

/**
 * Итоги вкладки Total из ответа `total-statistics`: счётчики как есть
 * (`null` — ручного отчёта нет, на карточке прочерк) и соцсети по сети.
 * Сети, которой нет в ответе, — `null`: карточка её не покажет.
 */
export function totalSummary(data) {
  const byNetwork = Object.fromEntries(
    (data?.socials ?? []).map((item) => [
      item.network,
      {
        posts: numOrNull(item.posts),
        impressions: numOrNull(item.impressions),
      },
    ]),
  )
  const empty = { posts: null, impressions: null }
  return {
    totals: data?.totals ?? {},
    social: {
      instagram: byNetwork.instagram ?? empty,
      telegram: byNetwork.telegram ?? empty,
    },
    // Устройства и города — из статистики просмотров месяца; не введена —
    // device null, geo пустой: карточки их не покажут.
    device: data?.device ?? null,
    geo: (data?.geo ?? []).map((row) => ({
      name: row.city,
      value: num(row.value),
    })),
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
      liveLeagues: channel.liveLeagues ?? '',
    })),
  }
}
