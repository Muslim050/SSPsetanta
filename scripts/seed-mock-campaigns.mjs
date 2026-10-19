/**
 * Заливает в API демо-кампании из `src/lib/seed.js`: по паре на месяц,
 * с метриками и разными статусами — чтобы раздел выглядел живым.
 *
 *   node scripts/seed-mock-campaigns.mjs --user-login cola --user-password …
 *     [--api https://…] [--login admin] [--password admin]
 *     [--per-month 2] [--max 4] [--dry]
 *
 * Заявку создаёт только рекламодатель — бренд сервер берёт из сессии, —
 * поэтому кампании заводятся под его учёткой, а статусы им проставляет
 * уже площадка. Учётка должна существовать: заводить её скрипт не берётся.
 *
 * Кампании ищутся по названию, существующие пропускаются — прогонять можно
 * повторно. Удаления у кампаний в API нет, поэтому `--dry` показывает план,
 * ничего не создавая.
 */
import { CAMPAIGNS } from '../src/lib/seed.js'
import { API_TARGET } from './api-target.mjs'

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? fallback : args[index + 1]
}

const API = arg('api', API_TARGET) + '/api/v1'
const LOGIN = arg('login', 'admin')
const PASSWORD = arg('password', 'admin')
const USER_LOGIN = arg('user-login', null)
const USER_PASSWORD = arg('user-password', null)
const PER_MONTH = Number(arg('per-month', 2)) || 2
// Сколько кампаний создать за прогон: удаления у них в API нет, поэтому
// иногда нужно добрать ровно столько, сколько не хватает.
const MAX = Number(arg('max', 0)) || Infinity
const DRY = args.includes('--dry')

let token = null

async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(
      `${method} ${path} → ${response.status}: ${text.slice(0, 300)}`,
    )
  }
  return response.status === 204 ? null : response.json()
}

const login = async (userLogin, userPassword) => {
  const auth = await api('/auth/login', {
    method: 'POST',
    body: { login: userLogin, password: userPassword },
  })
  token = auth.access
  return auth.user
}

const monthOf = (campaign) => campaign.startDate.slice(0, 7)

const MONTHS_RU = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
]

/**
 * Название кампании. У некоторых брендов в моке они повторяются из месяца
 * в месяц — такие различаем месяцем, иначе в списке их не отличить, да и
 * пропуск по имени принял бы вторую за уже созданную.
 */
function nameFor(campaign, month, repeats) {
  if (!repeats) return campaign.name
  const [year, monthNumber] = month.split('-')
  return `${campaign.name} — ${MONTHS_RU[Number(monthNumber) - 1]} ${year}`
}
const currentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Статус кампании по её месяцу: прошедшие месяцы закрываем, текущий держим
 * в работе, будущие оставляем заявками. Внутри прошедших статусы чередуем
 * сквозным счётчиком — иначе в разделе не увидеть всю воронку.
 */
const PAST_STATUSES = ['completed', 'paid', 'awaiting_payment']
const FUTURE_STATUSES = ['sent', 'received', 'reviewing']

function statusFor(month, seq) {
  const now = currentMonth()
  if (month === now) return 'active'
  if (month < now) return PAST_STATUSES[seq % PAST_STATUSES.length]
  return FUTURE_STATUSES[seq % FUTURE_STATUSES.length]
}

async function main() {
  if (!USER_LOGIN || !USER_PASSWORD) {
    throw new Error(
      'Нужна учётка рекламодателя: --user-login и --user-password.\n' +
        'Завести её можно в разделе «Рекламодатели» → вкладка «Пользователи».',
    )
  }

  const advertiser = await login(USER_LOGIN, USER_PASSWORD)
  if (advertiser.role !== 'advertiser') {
    throw new Error(
      `Учётка ${USER_LOGIN} — это ${advertiser.role}; заявку создаёт только рекламодатель`,
    )
  }

  // Бренд берём из самой учётки: сервер всё равно подставит его из сессии.
  const brand = await api(`/advertisers/${advertiser.advertiserId}`)
  const numbers = new Set((brand.contracts ?? []).map((c) => c.number))
  console.log(
    `Бренд: ${brand.name}, договоры: ${[...numbers].join(', ') || 'нет'}`,
  )
  if (!numbers.size) throw new Error('У бренда нет договоров')

  // Демо-кампании того же бренда: в моке он живёт под своим строковым id,
  // поэтому сопоставляем по названию.
  const mockId = `adv_${brand.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`
  const mock = CAMPAIGNS.filter((c) => c.advertiserId === mockId)
  if (!mock.length) {
    throw new Error(`В моке нет кампаний бренда ${brand.name} (${mockId})`)
  }

  // По паре кампаний на месяц — этого хватает, чтобы месяцы не пустовали.
  const byMonth = new Map()
  for (const campaign of mock) {
    const month = monthOf(campaign)
    const taken = byMonth.get(month) ?? []
    if (taken.length < PER_MONTH) byMonth.set(month, [...taken, campaign])
  }

  const existing = await api('/campaigns?limit=100')
  const taken = new Set(existing.items.map((item) => item.name))

  // Сколько раз каждое название встречается в отобранном: повторы различаем
  // месяцем, одиночные оставляем как есть.
  const counts = new Map()
  for (const list of byMonth.values()) {
    for (const campaign of list) {
      counts.set(campaign.name, (counts.get(campaign.name) ?? 0) + 1)
    }
  }

  const plan = []
  let seq = 0

  for (const [month, campaigns] of [...byMonth.entries()].sort()) {
    campaigns.forEach((campaign, index) => {
      const name = nameFor(campaign, month, counts.get(campaign.name) > 1)
      // Такая кампания на стенде уже есть — второй раз не заводим. Имена,
      // попавшие в план, тоже запоминаем: в одном месяце они могут совпасть.
      if (taken.has(name)) return
      taken.add(name)
      plan.push({
        month,
        status: statusFor(month, seq++),
        // Договор кампании из мока может не совпасть с тем, что на стенде.
        contractNumber: numbers.has(campaign.contractNumber)
          ? campaign.contractNumber
          : [...numbers][index % numbers.size],
        body: {
          name,
          objective: campaign.objective,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          impressions: campaign.impressions ?? 0,
          clicks: campaign.clicks ?? 0,
          conversions: campaign.conversions ?? 0,
          // Ролик в моке лежит файлом внутри фронта, сервер принимает
          // только абсолютную ссылку — оставляем пустым.
          creativeUrl: '',
          creativeName: '',
          channelIds: [],
        },
      })
    })
  }

  if (plan.length > MAX) plan.length = MAX

  console.log(`\nК созданию: ${plan.length} кампаний`)
  for (const item of plan) {
    console.log(
      `  ${item.month}  ${item.status.padEnd(16)} ${item.contractNumber}  ${item.body.name}`,
    )
  }
  if (DRY) return console.log('\n--dry: ничего не создаём')
  if (!plan.length) return

  const created = []
  for (const item of plan) {
    const campaign = await api('/campaigns', {
      method: 'POST',
      body: { ...item.body, contractNumber: item.contractNumber },
    })
    created.push({ ...item, id: campaign.id })
  }
  console.log(`\nСоздано: ${created.length}`)

  // Статусы ставит площадка: у заявки он всегда `sent`.
  await login(LOGIN, PASSWORD)
  let updated = 0
  for (const item of created) {
    if (item.status === 'sent') continue
    await api(`/campaigns/${item.id}`, {
      method: 'PATCH',
      body: { status: item.status },
    })
    updated++
  }
  console.log(`Статусы проставлены: ${updated}`)
}

main().catch((error) => {
  console.error('\nОшибка:', error.message)
  process.exit(1)
})
