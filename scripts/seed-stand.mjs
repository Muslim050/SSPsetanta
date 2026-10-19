/**
 * Переносит демо-набор из `src/lib/seed.js` на стенд: бренды, их договоры
 * с условиями и деньгами, учётки рекламодателей и кампании.
 *
 *   node scripts/seed-stand.mjs --login admin --password admin
 *     [--api https://…] [--per-brand 20] [--per-month 2]
 *     [--only Click,Payme] [--dry]
 *
 * Прогон идемпотентный: бренд ищется по названию, договор — по номеру,
 * кампания — по названию, учётка — по логину. Уже созданное пропускается,
 * поэтому скрипт можно гонять повторно и добирать недостающее.
 *
 * Заявку создаёт только рекламодатель — бренд сервер берёт из сессии, —
 * поэтому кампании заводятся под учёткой бренда, а статусы им проставляет
 * уже площадка. Пароль учётке задаётся по названию бренда: `<бренд>12345`.
 *
 * Удаления у кампаний в API нет: `--dry` показывает план, ничего не создавая.
 */
import { buildSeed } from '../src/lib/seed.js'
import { API_TARGET } from './api-target.mjs'

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? fallback : args[index + 1]
}

const API = arg('api', API_TARGET) + '/api/v1'
const LOGIN = arg('login', 'admin')
const PASSWORD = arg('password', 'admin')
const PER_BRAND = Number(arg('per-brand', 20)) || 20
const PER_MONTH = Number(arg('per-month', 2)) || 2
const ONLY = (arg('only', '') || '')
  .split(',')
  .map((name) => name.trim().toLowerCase())
  .filter(Boolean)
const DRY = args.includes('--dry')

/** Логин, пароль и почта демо-учётки — всё от названия бренда. */
const slugOf = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
const passwordFor = (name) => `${slugOf(name)}12345`
const emailFor = (name) => `${slugOf(name)}@gmail.com`

let token = null

async function api(path, { method = 'GET', body, headers } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
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

/** Список без пагинации: стенд отдаёт либо массив, либо `{items}`. */
const listOf = (payload) => (Array.isArray(payload) ? payload : payload.items)

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

const monthOf = (campaign) => campaign.startDate.slice(0, 7)

const currentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Статус кампании по её месяцу: прошедшие закрываем, текущий держим в
 * работе, будущие оставляем заявками. Внутри прошедших статусы чередуем —
 * иначе в разделе не увидеть всю воронку.
 */
const PAST_STATUSES = ['completed', 'paid', 'awaiting_payment']
const FUTURE_STATUSES = ['sent', 'received', 'reviewing']

function statusFor(month, seq) {
  const now = currentMonth()
  if (month === now) return 'active'
  if (month < now) return PAST_STATUSES[seq % PAST_STATUSES.length]
  return FUTURE_STATUSES[seq % FUTURE_STATUSES.length]
}

/**
 * Название кампании. У некоторых брендов они повторяются из месяца в месяц —
 * такие различаем месяцем, иначе в списке их не отличить, да и пропуск по
 * имени принял бы вторую за уже созданную.
 */
function nameFor(campaign, month, repeats) {
  if (!repeats) return campaign.name
  const [year, monthNumber] = month.split('-')
  return `${campaign.name} — ${MONTHS_RU[Number(monthNumber) - 1]} ${year}`
}

/** Условия договора, какими их ждёт сервер. */
const contractBody = (contract) => ({
  number: contract.number,
  campaignName: contract.campaignName ?? '',
  legalName: contract.legalName ?? '',
  package: contract.package ?? '',
  leagues: [...(contract.leagues ?? [])],
  start: contract.start || null,
  end: contract.end || null,
  paymentDate: contract.paymentDate || null,
  status: contract.status === 'terminated' ? 'terminated' : 'active',
})

/**
 * Чего в договоре на стенде не хватает. Заполняем только пустые поля:
 * то, что уже проставлено руками, мок затирать не должен. Статус договора
 * не трогаем вовсе — его ведёт площадка.
 */
function contractGaps(stand, wanted) {
  const changed = {}
  for (const [key, value] of Object.entries(wanted)) {
    if (key === 'status' || key === 'number') continue
    const current = stand[key]
    const empty = Array.isArray(current)
      ? current.length === 0
      : current === null || current === undefined || current === ''
    const hasValue = Array.isArray(value) ? value.length > 0 : !!value
    if (empty && hasValue) changed[key] = value
  }
  return changed
}

async function syncBrand(mock, standBrands) {
  const found = standBrands.find((b) => b.name === mock.name)
  if (found) return { brand: found, created: false }

  if (DRY) return { brand: { id: null, name: mock.name }, created: true }
  const brand = await api('/advertisers', {
    method: 'POST',
    body: {
      name: mock.name,
      legalName: mock.legalName ?? '',
      contact: mock.contact ?? '',
      color: mock.color ?? '',
      status: 'active',
    },
  })
  return { brand, created: true }
}

async function syncContracts(brandId, mockContracts, report) {
  // Карточка бренда отдаёт договоры вложенными — плоский список без
  // `advertiserId` для этого не годится.
  const card = brandId
    ? await api(`/advertisers/${brandId}`)
    : { contracts: [] }
  const stand = card.contracts ?? []

  for (const mock of mockContracts) {
    const wanted = contractBody(mock)
    let contract = stand.find((c) => c.number === mock.number)

    if (!contract) {
      report.contractsCreated.push(`${mock.number}`)
      if (DRY) continue
      contract = await api(`/advertisers/${brandId}/contracts`, {
        method: 'POST',
        body: wanted,
      })
    } else {
      const changed = contractGaps(contract, wanted)
      if (Object.keys(changed).length) {
        report.contractsUpdated.push(
          `${mock.number}: заполнено ${Object.keys(changed).join(', ')}`,
        )
        if (!DRY) {
          contract = await api(`/contracts/${contract.id}`, {
            method: 'PATCH',
            body: changed,
          })
        }
      }
    }
    if (DRY || !contract) continue

    // Бюджет правится отдельной ручкой: в самом договоре суммы только на чтение.
    if (Number(contract.budget) !== mock.budget) {
      report.money.push(`${mock.number}: бюджет → ${mock.budget}`)
      contract = await api(`/contracts/${contract.id}/amounts`, {
        method: 'PATCH',
        body: { budget: String(mock.budget) },
      })
    }

    // Поступления заводим по одному — так в договоре появляется история.
    const already = (contract.payments ?? []).length
    const wantedPayments = mock.payments ?? []
    if (!already && wantedPayments.length) {
      for (const payment of wantedPayments) {
        await api(`/contracts/${contract.id}/payments`, {
          method: 'POST',
          headers: { 'Idempotency-Key': `seed-${contract.id}-${payment.seq}` },
          body: {
            amount: String(payment.amount),
            paidAt: new Date(payment.createdAt).toISOString(),
            comment: 'Демо-поступление',
          },
        })
      }
      report.money.push(
        `${mock.number}: поступлений ${wantedPayments.length} на ${mock.spent}`,
      )
    }
  }
}

async function syncUser(brand, standUsers, report) {
  const login_ = slugOf(brand.name)
  const email = emailFor(brand.name)
  const existing = standUsers.find(
    (u) => u.login === login_ || u.advertiserId === brand.id,
  )
  if (existing) {
    // Почту дописываем, если её не заводили: в таблице пользователей
    // колонка иначе пустует. Свой адрес не трогаем. Адрес берём от логина:
    // у заведённых раньше учёток он может отличаться от названия бренда.
    const ownEmail = emailFor(existing.login)
    if (!existing.email) {
      report.emails.push(`${existing.login} → ${ownEmail}`)
      if (!DRY) {
        await api(`/users/${existing.id}`, {
          method: 'PATCH',
          body: { email: ownEmail },
        })
      }
    }
    return { login: existing.login, password: null }
  }

  const password = passwordFor(brand.name)
  report.usersCreated.push(`${login_} / ${password}`)
  if (DRY) return { login: login_, password }

  await api('/users', {
    method: 'POST',
    body: {
      login: login_,
      name: brand.name,
      email,
      role: 'advertiser',
      advertiserId: brand.id,
      isActive: true,
      password,
    },
  })
  return { login: login_, password }
}

/** План кампаний бренда: до PER_MONTH на месяц, всего не больше PER_BRAND. */
function campaignPlan(mockCampaigns, contractNumbers, taken) {
  const byMonth = new Map()
  for (const campaign of mockCampaigns) {
    const month = monthOf(campaign)
    const list = byMonth.get(month) ?? []
    if (list.length < PER_MONTH) byMonth.set(month, [...list, campaign])
  }

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
      if (plan.length >= PER_BRAND) return
      const name = nameFor(campaign, month, counts.get(campaign.name) > 1)
      // Такая кампания уже есть — второй раз не заводим. Имена из плана
      // тоже запоминаем: в одном месяце они могут совпасть.
      if (taken.has(name)) return
      taken.add(name)
      plan.push({
        month,
        status: statusFor(month, seq++),
        contractNumber: contractNumbers.includes(campaign.contractNumber)
          ? campaign.contractNumber
          : contractNumbers[index % contractNumbers.length],
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
  return plan
}

async function main() {
  const seed = buildSeed()
  const brands = seed.advertisers.filter(
    (a) => !ONLY.length || ONLY.includes(a.name.toLowerCase()),
  )

  const admin = await login(LOGIN, PASSWORD)
  if (admin.role !== 'admin') throw new Error(`${LOGIN} — это ${admin.role}`)

  const standBrands = listOf(await api('/advertisers?limit=100'))
  const standUsers = listOf(await api('/users?limit=100'))
  const standCampaigns = listOf(await api('/campaigns?limit=200'))

  const report = {
    brandsCreated: [],
    contractsCreated: [],
    contractsUpdated: [],
    money: [],
    usersCreated: [],
    emails: [],
    campaigns: [],
  }
  const credentials = []

  for (const mock of brands) {
    const { brand, created } = await syncBrand(mock, standBrands)
    if (created) report.brandsCreated.push(mock.name)

    await syncContracts(brand.id, mock.contracts, report)
    const account = await syncUser(brand, standUsers, report)
    if (account.password) {
      credentials.push({ brand: mock.name, ...account })
    }

    // Кампании заводит сам бренд: сервер берёт его из сессии автора.
    const mine = standCampaigns.filter((c) => c.advertiserId === brand.id)
    const taken = new Set(mine.map((c) => c.name))
    const numbers = (
      brand.id ? (await api(`/advertisers/${brand.id}`)).contracts : []
    ).map((c) => c.number)
    if (!numbers.length && !DRY) {
      console.log(`  ${mock.name}: нет договоров — кампании пропускаем`)
      continue
    }

    const mockCampaigns = seed.campaigns.filter(
      (c) => c.advertiserId === mock.id,
    )
    const room = Math.max(0, PER_BRAND - mine.length)
    const plan = room
      ? campaignPlan(
          mockCampaigns,
          numbers.length ? numbers : ['—'],
          taken,
        ).slice(0, room)
      : []

    report.campaigns.push(
      `${mock.name}: есть ${mine.length}, добавим ${plan.length}`,
    )
    if (DRY || !plan.length) continue

    const password = account.password ?? passwordFor(brand.name)
    const adminToken = token
    let created_ = 0
    try {
      await login(account.login, password)
      for (const item of plan) {
        const campaign = await api('/campaigns', {
          method: 'POST',
          body: { ...item.body, contractNumber: item.contractNumber },
        })
        item.id = campaign.id
        created_ += 1
      }
    } finally {
      token = adminToken
    }

    // Статусы ставит площадка: у рекламодателя заявка всегда «Отправлен».
    for (const item of plan) {
      if (!item.id || item.status === 'sent') continue
      await api(`/campaigns/${item.id}`, {
        method: 'PATCH',
        body: { status: item.status },
      })
    }
    console.log(`  ${mock.name}: создано кампаний ${created_}`)
  }

  const section = (title, lines) => {
    if (!lines.length) return
    console.log(`\n${title}`)
    for (const line of lines) console.log(`  ${line}`)
  }

  console.log(DRY ? '\n=== ПЛАН (--dry) ===' : '\n=== ИТОГ ===')
  section('Бренды заведены:', report.brandsCreated)
  section('Договоры заведены:', report.contractsCreated)
  section('Договоры поправлены:', report.contractsUpdated)
  section('Деньги:', report.money)
  section('Учётки заведены (логин / пароль):', report.usersCreated)
  section('Почта учёток:', report.emails)
  section('Кампании:', report.campaigns)
  if (!report.brandsCreated.length && !report.usersCreated.length) {
    console.log('\nНовых брендов и учёток не понадобилось.')
  }
}

main().catch((error) => {
  console.error('\nОшибка:', error.message)
  process.exit(1)
})
