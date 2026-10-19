/**
 * Заводит на стенде рекламодателя и пару кампаний под ним.
 *
 *   node scripts/seed-campaigns.mjs [--api https://…] [--login admin]
 *     [--password admin] [--brand «Coca Cola»] [--user-login adv]
 *     [--user-password …]
 *
 * Зачем отдельный скрипт: заявку создаёт только рекламодатель — бренд сервер
 * берёт из сессии автора, а не из тела запроса. Поэтому сначала админ заводит
 * пользователя с ролью advertiser, потом скрипт входит уже под ним и создаёт
 * кампании, а в конце возвращается админом и ставит одной из них статус
 * «Активна» — чтобы в разделе было что смотреть.
 *
 * Запускать можно повторно: и пользователь, и кампании ищутся по имени, уже
 * существующие пропускаются. Пароль, если его не передали, генерируется —
 * он печатается один раз в конце, в репозитории пароли не храним.
 */
import { randomUUID } from 'node:crypto'
import { API_TARGET } from './api-target.mjs'

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? fallback : args[index + 1]
}

const API = arg('api', API_TARGET) + '/api/v1'
const LOGIN = arg('login', 'admin')
const PASSWORD = arg('password', 'admin')
const BRAND = arg('brand', null)
const USER_LOGIN = arg('user-login', 'adv')
// Django проверяет пароль своими валидаторами: длина, не только цифры,
// не из словаря частых. Случайный кусок uuid проходит все три.
const USER_PASSWORD = arg('user-password', `demo-${randomUUID().slice(0, 12)}`)
const GENERATED = !args.includes('--user-password')

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

/**
 * Дата в ISO без времени: `2026-08-01`. Считаем по местному календарю:
 * toISOString() перевёл бы полночь в UTC и увёл дату на день назад.
 */
const iso = (date) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Первое и последнее число месяца, отстоящего от текущего на `shift`. */
function monthRange(shift) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + shift, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + shift + 1, 0)
  return { startDate: iso(start), endDate: iso(end) }
}

/** Период кампании, ужатый до срока договора: вне его кампания бессмысленна. */
function withinContract(range, contract) {
  const startDate =
    contract.start && contract.start > range.startDate
      ? contract.start
      : range.startDate
  const endDate =
    contract.end && contract.end < range.endDate ? contract.end : range.endDate
  return { startDate, endDate }
}

async function main() {
  await login(LOGIN, PASSWORD)
  console.log(`Вошли как ${LOGIN}`)

  // --- бренд и его договоры --------------------------------------------
  const advertisers = await api('/advertisers?limit=100')
  const brand = BRAND
    ? advertisers.items.find((item) => item.name === BRAND)
    : advertisers.items.find((item) => (item.contracts ?? []).length > 0)

  if (!brand) {
    throw new Error(
      BRAND
        ? `Бренд «${BRAND}» на стенде не найден`
        : 'Ни у одного бренда нет договоров — сначала прогоните seed-api.mjs',
    )
  }
  const contracts = brand.contracts ?? []
  if (!contracts.length) {
    throw new Error(`У бренда ${brand.name} нет договоров`)
  }
  console.log(
    `Бренд: ${brand.name} (id ${brand.id}), договоров: ${contracts.length}`,
  )

  // --- пользователь-рекламодатель ---------------------------------------
  const users = await api('/users?limit=100')
  let user = users.items.find((item) => item.login === USER_LOGIN)

  if (user) {
    console.log(`Пользователь ${USER_LOGIN} уже есть (id ${user.id})`)
    if (user.advertiserId !== brand.id || user.role !== 'advertiser') {
      user = await api(`/users/${user.id}`, {
        method: 'PATCH',
        body: { role: 'advertiser', advertiserId: brand.id, isActive: true },
      })
      console.log(`  переключили его на бренд ${brand.name}`)
    }
    // Пароль сгенерировали на этом запуске — старый нам неизвестен, а войти
    // под этим пользователем нужно. Админ может задать новый.
    if (GENERATED) {
      await api(`/users/${user.id}`, {
        method: 'PATCH',
        body: { password: USER_PASSWORD },
      })
      console.log('  задали ему новый пароль — он в конце вывода')
    }
  } else {
    user = await api('/users', {
      method: 'POST',
      body: {
        login: USER_LOGIN,
        name: `${brand.contact || brand.name} (демо)`,
        email: brand.email || '',
        role: 'advertiser',
        advertiserId: brand.id,
        isActive: true,
        password: USER_PASSWORD,
      },
    })
    console.log(`+ пользователь ${USER_LOGIN} (id ${user.id}), роль advertiser`)
  }

  // --- кампании от его имени --------------------------------------------
  // Заявку заводит только рекламодатель: бренд сервер берёт из сессии.
  // Название кампании — свободное поле; если в договоре его уже указали,
  // берём оттуда: тогда к кампании подтянется и ролик договора.
  const first = contracts[0]
  const second = contracts[1] ?? contracts[0]
  const firstName = first.campaignName || 'Летняя распродажа'
  const secondName =
    second.campaignName && second.campaignName !== firstName
      ? second.campaignName
      : 'Осенний флайт'

  const drafts = [
    {
      contract: first,
      name: firstName,
      objective: 'awareness',
      ...withinContract(monthRange(0), first),
    },
    {
      contract: second,
      name: secondName,
      objective: 'reach',
      ...withinContract(monthRange(-1), second),
    },
  ]

  await login(USER_LOGIN, USER_PASSWORD)
  console.log(`Вошли как ${USER_LOGIN}`)

  const mine = await api('/campaigns?limit=100')
  const taken = new Set(mine.items.map((item) => item.name))
  const created = []

  for (const draft of drafts) {
    if (taken.has(draft.name)) {
      console.log(`— «${draft.name}» уже есть, пропускаем`)
      continue
    }
    const campaign = await api('/campaigns', {
      method: 'POST',
      body: {
        name: draft.name,
        objective: draft.objective,
        startDate: draft.startDate,
        endDate: draft.endDate,
        contractNumber: draft.contract.number,
        creativeUrl: '',
        creativeName: '',
        channelIds: [],
      },
    })
    created.push(campaign)
    console.log(
      `+ «${campaign.name}» (id ${campaign.id}), договор ${campaign.contractNumber}, ` +
        `${campaign.startDate} — ${campaign.endDate}, статус ${campaign.status}`,
    )
  }

  // --- статус первой кампании ставит площадка ---------------------------
  if (created.length) {
    await login(LOGIN, PASSWORD)
    const active = await api(`/campaigns/${created[0].id}`, {
      method: 'PATCH',
      body: { status: 'active' },
    })
    console.log(`Статус «${active.name}» → ${active.status}`)
  }

  console.log(`\nГотово. Кампаний создано: ${created.length}`)
  if (GENERATED) {
    console.log(
      `\nВход рекламодателя: ${USER_LOGIN} / ${USER_PASSWORD}` +
        '\nПароль сгенерирован и больше нигде не сохранён — запишите его.',
    )
  }
}

main().catch((error) => {
  console.error('\nОшибка:', error.message)
  process.exit(1)
})
