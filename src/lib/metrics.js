// Производные рекламные метрики.

export const ctr = (c) => (c.impressions ? (c.clicks / c.impressions) * 100 : 0)

export const cvr = (c) => (c.clicks ? (c.conversions / c.clicks) * 100 : 0)

export const cpa = (c) => (c.conversions ? c.spent / c.conversions : 0)

export const cpm = (c) => (c.impressions ? (c.spent / c.impressions) * 1000 : 0)

export const pacing = (c) => (c.budget ? (c.spent / c.budget) * 100 : 0)

/**
 * Сколько срока кампании прошло: от даты старта до даты окончания.
 * По нему показываем процент в статусе — он про ход кампании, а не про деньги.
 */
export function timeProgress(c) {
  if (!c?.startDate || !c?.endDate) return 0
  const start = new Date(c.startDate).getTime()
  const end = new Date(c.endDate).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0
  const passed = ((Date.now() - start) / (end - start)) * 100
  return Math.min(100, Math.max(0, passed))
}

/** Суммарные показатели по списку кампаний. */
export function aggregate(campaigns) {
  const t = campaigns.reduce(
    (acc, c) => {
      acc.budget += c.budget || 0
      acc.spent += c.spent || 0
      acc.impressions += c.impressions || 0
      acc.clicks += c.clicks || 0
      acc.conversions += c.conversions || 0
      return acc
    },
    { budget: 0, spent: 0, impressions: 0, clicks: 0, conversions: 0 },
  )
  t.ctr = t.impressions ? (t.clicks / t.impressions) * 100 : 0
  t.cvr = t.clicks ? (t.conversions / t.clicks) * 100 : 0
  t.cpa = t.conversions ? t.spent / t.conversions : 0
  t.active = campaigns.filter((c) => c.status === 'active').length
  t.count = campaigns.length
  return t
}

export const STATUS = {
  // Заявка от рекламодателя: сначала «Отправлен», в «Получен» её переводит админ.
  sent: { label: 'Отправлен', tone: 'warning' },
  received: { label: 'Получен', tone: 'warning' },
  reviewing: { label: 'Рассматривается', tone: 'warning' },
  active: { label: 'Активен', tone: 'success' },
  completed: { label: 'Завершен', tone: 'danger' },
  // Кампания отработала, но деньги ещё не пришли.
  awaiting_payment: { label: 'Ожидает оплату', tone: 'danger' },
  // Деньги пришли — кампания закрыта полностью.
  paid: { label: 'Оплачен', tone: 'success' },
  archived: { label: 'В архиве', tone: 'muted' },
}

/** Статус самого договора — его ведёт площадка вручную. */
export const CONTRACT_STATUS = {
  active: { label: 'Активен', tone: 'success' },
  completed: { label: 'Завершён', tone: 'muted' },
  terminated: { label: 'Расторгнут', tone: 'danger' },
}

/**
 * Статус оплаты за месяц договора. Оформление одно и в кампаниях,
 * и в разделе договоров, поэтому живёт здесь, а не в странице.
 */
export const CONTRACT_PAYMENT = {
  awaiting: {
    label: 'Ожидает оплату',
    card: 'border-danger/60 bg-danger/10 hover:border-danger/70 hover:bg-danger/10 animate-pulse-ring',
    badge: 'bg-danger/20 text-danger',
    caption: 'text-danger',
    pencil: 'text-danger',
    pulse: true,
  },
  paid: {
    label: 'Оплачено',
    card: 'border-success/35 bg-success/[0.07] hover:border-success/60 hover:bg-success/10',
    badge: 'bg-success/10 text-success',
    caption: 'text-success',
    pencil: 'text-success',
    pulse: false,
  },
}

/**
 * Карточка «Статус», пока статус оплаты не ставили: ничего не подсвечиваем
 * и неоплаченным договор не называем.
 */
export const PAYMENT_NONE = {
  label: 'Нет отметки',
  card: 'border-line bg-surface hover:border-indigo-200 hover:bg-indigo-50/50',
  badge: 'bg-ink/6 text-ink-muted',
  caption: 'text-ink-muted',
  pencil: 'text-ink-muted',
  pulse: false,
}

/**
 * Статус оплаты с сервера → оформление: `paid` — зелёный, пусто — без
 * подсветки (null), любое другое значение — красный «ожидает оплату».
 */
export function paymentTone(status) {
  if (!status) return null
  return status === 'paid' ? 'paid' : 'awaiting'
}

/** Варианты для поповера смены статуса оплаты. */
export const PAYMENT_OPTIONS = [
  {
    value: 'awaiting',
    label: CONTRACT_PAYMENT.awaiting.label,
    badge: CONTRACT_PAYMENT.awaiting.badge,
  },
  {
    value: 'paid',
    label: CONTRACT_PAYMENT.paid.label,
    badge: CONTRACT_PAYMENT.paid.badge,
  },
]

/** Рекламный пакет кампании. */
export const PACKAGES = {
  partner: { label: 'Партнёр' },
  general: { label: 'Генеральный спонсор' },
  presenter: { label: 'Презентер' },
}

/** Лиги и турниры, доступные для размещения. */
export const LEAGUES = [
  { id: 'epl', label: 'EPL' },
  { id: 'laliga', label: 'LaLiga' },
  { id: 'bundesliga', label: 'Bundesliga' },
  { id: 'ligue1', label: 'Ligue 1' },
  { id: 'seriea', label: 'Serie A' },
  { id: 'ufc', label: 'UFC' },
  { id: 'f1', label: 'F1' },
  { id: 'atp', label: 'ATP' },
  { id: 'wta', label: 'WTA' },
  { id: 'zuffa', label: 'Zuffa Boxing' },
  { id: 'nba', label: 'NBA' },
  { id: 'nhl', label: 'NHL' },
]

export const leagueLabel = (id) => LEAGUES.find((l) => l.id === id)?.label || id

export const statusLabel = (status) => STATUS[status]?.label || status

/**
 * Статус бренда. На сервере значения `active` и `paused`; «Завершен» —
 * то, как площадка называет второе состояние в интерфейсе.
 */
export const ADV_STATUS = {
  active: { label: 'Активен', tone: 'success' },
  paused: { label: 'Завершен', tone: 'danger' },
}

export const CH_STATUS = {
  active: { label: 'Активен', tone: 'success' },
  inactive: { label: 'Отключён', tone: 'muted' },
}
