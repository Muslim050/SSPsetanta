/**
 * Демо-цифры страницы «Статистика» рекламодателя. Итогов за произвольный
 * период сервер не отдаёт — total-statistics считается по договору за
 * месяц, — поэтому страница пока на моках: цифры ведутся по месяцам, а
 * период «от и до» (тоже по месяцам) складывается из них.
 */

// «Средний» месяц: от него считаются цифры каждого месяца.
const BASE_TOTALS = {
  liveCount: 110,
  eventPromoCount: 1310,
  totalSeconds: 29280,
  liveViews: 55120970,
}

const BASE_SOCIAL = {
  instagram: { posts: 7, impressions: 188000 },
  telegram: { posts: 7, impressions: 307000 },
}

// Устройства и города — постоянные демо-доли, на период не масштабируются.
const DEMO_DEVICE = { browser: 3, tv: 66, phone: 30, tablet: 1 }
const DEMO_GEO = [
  ['Ташкент', 62.3],
  ['Самарканд', 12.6],
  ['Бухара', 7.3],
  ['Андижан', 2.1],
  ['Джизак', 2.1],
  ['Чирчик', 2.1],
  ['ZZC', 1.8],
  ['Навои', 1],
  ['Карши', 1],
  ['Фергана', 1],
  ['Наманган', 1],
  ['Шахрисабз', 0.8],
  ['Нукус', 0.7],
  ['Алмалык', 0.7],
  ['Денау', 0.7],
  ['Байсун', 0.6],
  ['Гулистан', 0.6],
  ['Зарафшан', 0.5],
  ['Хива', 0.5],
  ['Хорезмская область', 0.3],
  ['GHUST', 0.2],
  ['Коканд', 0.1],
].map(([name, value]) => ({ name, value }))

/** 'YYYY-MM' → номер месяца от нуля года: так месяцы удобно перебирать. */
function toIndex(period) {
  const [year, month] = period.split('-').map(Number)
  return year * 12 + month - 1
}

/**
 * Доля «среднего» месяца — 0.75–1.24, у каждого месяца своя и постоянная:
 * цифры не прыгают между рендерами. Будущих месяцев нет — null.
 */
function monthFactor(index) {
  const now = new Date()
  if (index > now.getFullYear() * 12 + now.getMonth()) return null
  return 0.75 + ((index * 37) % 50) / 100
}

/** Сводка без данных: на карточках прочерки. */
function emptySummary() {
  const totals = Object.fromEntries(
    Object.keys(BASE_TOTALS).map((key) => [key, null]),
  )
  const social = Object.fromEntries(
    Object.keys(BASE_SOCIAL).map((network) => [
      network,
      { posts: null, impressions: null },
    ]),
  )
  return { totals, social, device: null, geo: [] }
}

/**
 * Сводка за период по месяцам ('YYYY-MM', оба включительно) — в той же
 * форме, что totalSummary: { totals, social, device, geo }. Период пустой, перевёрнутый
 * или целиком в будущем — значения null.
 */
export function mockRangeSummary(from, to) {
  if (!from || !to || from > to) return emptySummary()

  // Сколько «средних» месяцев в периоде.
  let weight = 0
  let hasData = false
  for (let index = toIndex(from); index <= toIndex(to); index += 1) {
    const factor = monthFactor(index)
    if (factor == null) continue
    weight += factor
    hasData = true
  }
  if (!hasData) return emptySummary()

  const scale = (value) => Math.round(value * weight)
  return {
    totals: Object.fromEntries(
      Object.entries(BASE_TOTALS).map(([key, value]) => [key, scale(value)]),
    ),
    social: Object.fromEntries(
      Object.entries(BASE_SOCIAL).map(([network, stats]) => [
        network,
        { posts: scale(stats.posts), impressions: scale(stats.impressions) },
      ]),
    ),
    device: DEMO_DEVICE,
    geo: DEMO_GEO,
  }
}
