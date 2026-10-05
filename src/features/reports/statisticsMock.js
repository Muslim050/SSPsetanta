/**
 * Демо-цифры страницы «Статистика» рекламодателя. Итогов за произвольный
 * период сервер не отдаёт — total-statistics считается по договору за
 * месяц, — поэтому страница пока на моках: цифры ведутся по месяцам, а
 * период «от и до» собирается из них.
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

/** 'YYYY-MM-DD' → номер месяца от нуля года и день; без часовых поясов. */
function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return { index: year * 12 + month - 1, day }
}

const daysIn = (index) =>
  new Date(Math.floor(index / 12), (index % 12) + 1, 0).getDate()

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
  return { totals, social }
}

/**
 * Сводка за период — в той же форме, что totalSummary: { totals, social }.
 * Месяц, захваченный частично, входит долей своих дней. Период пустой,
 * перевёрнутый или целиком в будущем — значения null.
 */
export function mockRangeSummary(from, to) {
  if (!from || !to || from > to) return emptySummary()

  const start = parseDate(from)
  const end = parseDate(to)
  // Сколько «средних» месяцев в периоде.
  let weight = 0
  let hasData = false
  for (let index = start.index; index <= end.index; index += 1) {
    const factor = monthFactor(index)
    if (factor == null) continue
    const days = daysIn(index)
    const first = index === start.index ? start.day : 1
    const last = index === end.index ? end.day : days
    weight += (factor * (last - first + 1)) / days
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
  }
}
