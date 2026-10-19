/**
 * Заливает демо-данные из src/lib/seed.js в API.
 *
 *   node scripts/seed-api.mjs [--api https://…] [--login admin] [--password admin]
 *
 * Бренды сопоставляются по названию: уже существующие пропускаются, поэтому
 * скрипт можно запускать повторно. Договоры добавляются только к брендам,
 * созданным этим запуском, — чужие правки не трогаем.
 */
import { ADVERTISERS, CONTRACTS_BY_ADVERTISER } from '../src/lib/seed.js'
import { API_TARGET } from './api-target.mjs'

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? fallback : args[index + 1]
}

const API = arg('api', API_TARGET) + '/api/v1'
const LOGIN = arg('login', 'admin')
const PASSWORD = arg('password', 'admin')

const REQUISITES_LABELS = {
  inn: 'ИНН',
  account: 'Р/с',
  bank: 'Банк',
  mfo: 'МФО',
  oked: 'ОКЭД',
  vat: 'НДС',
  address: 'Адрес',
  phone: 'Телефон',
  email: 'Email',
}

/** Реквизиты в базе лежат объектом, API принимает их одним текстом. */
const requisitesToText = (requisites = {}) =>
  Object.entries(REQUISITES_LABELS)
    .filter(([key]) => requisites[key])
    .map(([key, label]) => `${label}: ${requisites[key]}`)
    .join('\n')

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

async function main() {
  const auth = await api('/auth/login', {
    method: 'POST',
    body: { login: LOGIN, password: PASSWORD },
  })
  token = auth.access
  console.log(`Вошли как ${LOGIN}`)

  const existing = await api('/advertisers?limit=100')
  const taken = new Set(existing.items.map((item) => item.name))
  console.log(`В базе уже ${existing.total} брендов`)

  let created = 0
  let contractsCreated = 0
  const skipped = []

  for (const advertiser of ADVERTISERS) {
    if (taken.has(advertiser.name)) {
      skipped.push(advertiser.name)
      continue
    }

    const saved = await api('/advertisers', {
      method: 'POST',
      body: {
        name: advertiser.name,
        contact: advertiser.contact,
        email: advertiser.email,
        category: advertiser.category,
        status: advertiser.status,
        legalName: advertiser.legalName,
        // Суммы на сервере — decimal, то есть строка.
        balance: String(advertiser.balance ?? 0),
        color: advertiser.color,
        // Логотипы в базе — пути внутри фронта (/logos/artel.png), а сервер
        // проверяет поле как полноценный URL. Пока на бэкенде нет загрузки
        // файлов, оставляем пустым: карточка нарисует инициалы на фирменном
        // цвете бренда.
        logo: '',
        requisites: requisitesToText(advertiser.requisites),
      },
    })
    created++

    for (const contract of CONTRACTS_BY_ADVERTISER[advertiser.id] ?? []) {
      await api(`/advertisers/${saved.id}/contracts`, {
        method: 'POST',
        body: {
          number: contract.number,
          campaignName: contract.campaignName ?? '',
          legalName: contract.legalName,
          package: contract.package,
          leagues: contract.leagues,
          start: contract.start,
          end: contract.end,
          paymentDate: contract.paymentDate,
        },
      })
      contractsCreated++
    }

    console.log(
      `+ ${advertiser.name} (id ${saved.id}), договоров: ${
        (CONTRACTS_BY_ADVERTISER[advertiser.id] ?? []).length
      }`,
    )
  }

  console.log(`\nСоздано брендов: ${created}, договоров: ${contractsCreated}`)
  if (skipped.length) console.log(`Пропущены (уже есть): ${skipped.join(', ')}`)
}

main().catch((error) => {
  console.error('\nОшибка:', error.message)
  process.exit(1)
})
