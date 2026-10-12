const nf = new Intl.NumberFormat('ru-RU')
const nfCompact = new Intl.NumberFormat('ru-RU', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const cf = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 0,
})

export const formatNumber = (v) => nf.format(Number(v) || 0)
export const formatCompact = (v) => nfCompact.format(Number(v) || 0)
export const formatMoney = (v) => cf.format(Number(v) || 0)

export const formatMoneyCompact = (v) => nfCompact.format(Number(v) || 0)

export const formatPct = (v, digits = 1) =>
  `${(Number(v) || 0).toFixed(digits)}%`

/**
 * Доля аудитории как пришла: целая — без дробной части (63%), дробная — до
 * сотых без лишних нулей (12.6%, 2.35%).
 */
export const formatShare = (v) => `${Number((Number(v) || 0).toFixed(2))}%`

/** Дата в формате дд.мм.гггг. */
export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Дата со временем: 05.09.2026 14:20. Если времени в записи нет — только дата. */
export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const date = d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  if (typeof value === 'string' && !value.includes('T')) return date
  const time = d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date} ${time}`
}

export function formatDateShort(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

/** Дата в формате дд.мм.гггг — тот же вид, что и у formatDate. */
export const formatDateNumeric = formatDate

/** Форма слова по числу: 1 минута, 2 минуты, 5 минут. */
function plural(n, one, few, many) {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  const mod10 = n % 10
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

/** Сколько времени прошло, без «назад»: «17 минут», «2 часа», «3 дня». */
export function formatDuration(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'

  const minutes = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000))
  if (minutes < 1) return 'меньше минуты'
  if (minutes < 60)
    return `${minutes} ${plural(minutes, 'минуту', 'минуты', 'минут')}`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${plural(hours, 'час', 'часа', 'часов')}`

  const days = Math.floor(hours / 24)
  return `${days} ${plural(days, 'день', 'дня', 'дней')}`
}

/**
 * Сколько времени прошло: «только что», «5 минут назад», «вчера». Дальше
 * недели относительный счёт читается хуже даты — показываем дату.
 */
export function formatSince(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'

  const minutes = Math.floor((Date.now() - d.getTime()) / 60000)
  if (minutes < 1) return 'только что'
  if (minutes < 60)
    return `${minutes} ${plural(minutes, 'минуту', 'минуты', 'минут')} назад`

  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return `${hours} ${plural(hours, 'час', 'часа', 'часов')} назад`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'вчера'
  if (days < 7) return `${days} ${plural(days, 'день', 'дня', 'дней')} назад`
  return formatDate(value)
}

/** Метки последних N дней в формате дд.мм. */
export function lastNDates(n) {
  const out = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    out.push(
      d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
    )
  }
  return out
}

/** Инициалы для аватара из имени/названия. */
export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
}

/**
 * Когда деньги пришли. На сервере поле называется `paidAt`, в демо-данных —
 * `createdAt`; второе уйдёт вместе с моком.
 */
export const paidAtOf = (payment) => payment?.paidAt ?? payment?.createdAt
