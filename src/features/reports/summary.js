/**
 * Сводки вкладок Statistic (Total и Spot) из отчёта за месяц.
 *
 * Spot — записи `spots` ручного отчёта (`GET …/manual`, отдельный от
 * файлового), их заводят через `POST …/manual` — см. spotSummary.
 *
 * Total зависит от вида отчёта. Файловый — девять листов: считаем по строкам
 * так же, как сервер считает `totals` у эфиров (пустое значение — ноль).
 * Ручной — только цифры по каналам, промо и прероллы: берём их как есть.
 */

// Выходы Live Ads в строке эфира: перед, две середины и после.
const SPOT_KEYS = ['pre', 'mid1', 'mid2', 'post']

// Каналы сводки: стандартные выходы — логи UZB TV, live — прямые эфиры;
// `channel` — канал в ручном отчёте.
export const CHANNELS = [
  {
    name: 'Setanta Sports 1',
    code: 'S1',
    channel: 'ss1',
    standard: 'ss1uzb',
    live: 'live1',
  },
  {
    name: 'Setanta Sports 2',
    code: 'S2',
    channel: 'ss2',
    standard: 'ss2uzb',
    live: 'live2',
  },
]

const num = (value) => Number(value) || 0
const sumBy = (rows, pick) => rows.reduce((sum, row) => sum + pick(row), 0)

/**
 * Длительность ролика из названия: «CLIENT - 30 Sec - UZB TV» → 30. В логе
 * выходов отдельного поля под неё нет, а итогов у `spot_log` сервер не
 * считает. Не нашли — null: такой ролик в секунды не попадёт.
 */
const durationOf = (item) => {
  const match = String(item ?? '').match(/(\d+)\s*sec/i)
  return match ? Number(match[1]) : null
}

/** Total из девяти листов файлового отчёта. */
function fileSummary(sheets) {
  const rowsOf = (code) =>
    sheets.find((sheet) => sheet.code === code)?.rows ?? []

  const channels = CHANNELS.map(({ name, code, channel, standard, live }) => {
    const spots = rowsOf(standard)
    const durations = spots.map((row) => durationOf(row.item))
    const events = rowsOf(live)
    return {
      name,
      code,
      channel,
      standardSpots: spots.length,
      standardSeconds: sumBy(durations, (seconds) => seconds ?? 0),
      // Сколько роликов осталось без длительности — об этом говорим рядом
      // с секундами, чтобы недосчёт не выглядел точной цифрой.
      unknownDuration: durations.filter((seconds) => seconds === null).length,
      liveEvents: events.length,
      liveAds: sumBy(
        events,
        (row) => SPOT_KEYS.filter((key) => num(row[key]) > 0).length,
      ),
      liveSeconds: sumBy(events, (row) =>
        SPOT_KEYS.reduce((sum, key) => sum + num(row[key]), 0),
      ),
      liveViews: sumBy(events, (row) => num(row.views)),
    }
  })

  const total = (key) => sumBy(channels, (channel) => channel[key])
  const eventPromo = rowsOf('promo1').length + rowsOf('promo2').length
  const social = rowsOf('social')
  const network = (id) => {
    const rows = social.filter((row) => row.network === id)
    return {
      posts: rows.length,
      impressions: sumBy(rows, (row) => num(row.impressions)),
    }
  }

  return {
    manual: false,
    totals: {
      liveEvents: total('liveEvents'),
      eventPromo,
      seconds: total('standardSeconds') + total('liveSeconds'),
      views: total('liveViews'),
    },
    social: {
      instagram: network('instagram'),
      telegram: network('telegram'),
    },
    unknownDuration: total('unknownDuration'),
  }
}

/**
 * Цифры вкладки Spot — записи `spots` отчёта, по каналу на запись. Пустые
 * `spots` — цифры за месяц не заведены: null.
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
 * Total ручного отчёта — из тех же записей `spots`. Числа эфиров и соцсетей
 * в нём нет — они null, и Total показывает на их месте прочерк.
 */
function manualSummary(report) {
  const channels = spotSummary(report)?.channels ?? []
  const total = (key) => sumBy(channels, (channel) => channel[key])
  const eventPromo = report.eventPromoCount ?? null

  return {
    manual: true,
    totals: {
      liveEvents: null,
      eventPromo,
      seconds: total('standardSeconds') + total('liveSeconds'),
      views: total('liveViews'),
    },
    social: null,
    unknownDuration: 0,
  }
}

/** Сводка Total — из отчёта за период: файлового или ручного. */
export function reportSummary(report) {
  return report.reportType === 'manual'
    ? manualSummary(report)
    : fileSummary(report.sheets ?? [])
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
