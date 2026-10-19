/**
 * Размножает статистику одного месяца на другие: страница «Статистика»
 * показывает за них те же цифры.
 *
 *   node scripts/copy-month-statistics.mjs --login admin --password …
 *     [--api https://…] [--from 2026-10] [--to 2026-01..2026-09] [--apply]
 *
 * Копируются:
 *  - статистика просмотров месяца (`/reports/:period/views-statistics`) —
 *    возраст, возраст по лигам, устройства, OTT и TV, города;
 *  - ручные отчёты каждого договора (`/contracts/:id/reports/:period/manual`) —
 *    из них сервер считает «Общую статистику Setanta Sports».
 *
 * Данные целевых месяцев заменяются целиком. Без `--apply` скрипт ничего не
 * пишет, только показывает план. Перед записью прежние данные целевых
 * месяцев сохраняются в `copy-month-statistics.backup-<время>.json`.
 */
import { writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? fallback : args[index + 1]
}

const API = arg('api', 'https://setanta.pythonanywhere.com') + '/api/v1'
const LOGIN = arg('login', process.env.SETANTA_LOGIN)
const PASSWORD = arg('password', process.env.SETANTA_PASSWORD)
const FROM = arg('from', '2026-10')
const TO = arg('to', '2026-01..2026-09')
const APPLY = args.includes('--apply')

/** '2026-01..2026-09' → ['2026-01', …, '2026-09']; можно и списком через запятую. */
function periodsOf(spec) {
  if (!spec.includes('..')) return spec.split(',').map((p) => p.trim())
  const [start, end] = spec.split('..')
  const toIndex = (p) => Number(p.slice(0, 4)) * 12 + Number(p.slice(5, 7)) - 1
  const periods = []
  for (let i = toIndex(start); i <= toIndex(end); i += 1) {
    periods.push(
      `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
    )
  }
  return periods
}

const TARGETS = periodsOf(TO).filter((period) => period !== FROM)

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
    const error = new Error(
      `${method} ${path} → ${response.status}: ${(await response.text()).slice(0, 300)}`,
    )
    error.status = response.status
    throw error
  }
  return response.status === 204 ? null : response.json()
}

/** Ручного отчёта за месяц нет — 404, это не ошибка. */
const getManual = (contractId, period) =>
  api(`/contracts/${contractId}/reports/${period}/manual`).catch((error) => {
    if (error.status === 404) return null
    throw error
  })

const viewsInput = (stats) => ({
  age: stats.age,
  device: stats.device,
  leagueRows: stats.leagueRows,
  ottDevice: stats.ottDevice,
  tvDevice: stats.tvDevice,
  geo: stats.geo,
})

const manualInput = (report) => ({
  eventPromoCount: report.eventPromoCount ?? null,
  ottPrerollViews: report.ottPrerollViews ?? null,
  spots: (report.spots ?? []).map((spot) => ({
    channel: spot.channel,
    standardCount: spot.standardCount,
    standardSeconds: spot.standardSeconds,
    liveCount: spot.liveCount,
    liveSeconds: spot.liveSeconds,
    liveViews: spot.liveViews,
    ...(spot.liveLeagues != null ? { liveLeagues: spot.liveLeagues } : {}),
  })),
})

/** Все договоры: бренды постранично, договоры — из карточки бренда. */
async function allContracts() {
  const brands = []
  let cursor = null
  do {
    const query = `?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
    const page = await api(`/advertisers${query}`)
    if (Array.isArray(page)) {
      brands.push(...page)
      cursor = null
    } else {
      brands.push(...page.items)
      cursor = page.nextCursor
    }
  } while (cursor)

  const contracts = []
  for (const brand of brands) {
    const card = await api(`/advertisers/${brand.id}`)
    for (const contract of card.contracts ?? []) {
      contracts.push({ ...contract, brandName: brand.name })
    }
  }
  return contracts
}

async function main() {
  if (!LOGIN || !PASSWORD) {
    throw new Error('Нужна учётка админа: --login и --password.')
  }
  console.log(`API: ${API}`)
  console.log(`Из ${FROM} → в ${TARGETS.join(', ')}`)
  console.log(
    APPLY ? 'Режим: ЗАПИСЬ\n' : 'Режим: план (без --apply ничего не пишем)\n',
  )

  const auth = await api('/auth/login', {
    method: 'POST',
    body: { login: LOGIN, password: PASSWORD },
  })
  token = auth.access
  if (auth.user?.role !== 'admin') {
    throw new Error(`${LOGIN} — это ${auth.user?.role}, нужен admin`)
  }

  const backup = { api: API, from: FROM, views: {}, manual: {} }
  const failures = []

  // Статистика просмотров.
  const views = await api(`/reports/${FROM}/views-statistics`)
  const missing = ['age', 'device', 'ottDevice', 'tvDevice'].filter(
    (key) => views[key] == null,
  )
  if (missing.length) {
    throw new Error(`За ${FROM} не введено: ${missing.join(', ')}`)
  }
  console.log(
    `Статистика просмотров ${FROM}: лиг ${views.leagueRows.length}, городов ${views.geo.length}`,
  )
  for (const period of TARGETS) {
    backup.views[period] = await api(`/reports/${period}/views-statistics`)
  }

  // Ручные отчёты договоров.
  const contracts = await allContracts()
  const sources = []
  for (const contract of contracts) {
    const report = await getManual(contract.id, FROM)
    if (report) sources.push({ contract, input: manualInput(report) })
  }
  console.log(
    `Ручные отчёты ${FROM}: ${sources.length} из ${contracts.length} договоров`,
  )
  for (const { contract } of sources) {
    backup.manual[contract.id] = {}
    for (const period of TARGETS) {
      backup.manual[contract.id][period] = await getManual(contract.id, period)
    }
  }

  if (!APPLY) {
    for (const { contract, input } of sources) {
      console.log(
        `  ${contract.brandName} · №${contract.number ?? contract.id}: промо ${input.eventPromoCount ?? '—'}, каналов ${input.spots.length}`,
      )
    }
    console.log('\nПлан готов. Чтобы записать — добавьте --apply.')
    return
  }

  const backupFile = `copy-month-statistics.backup-${Date.now()}.json`
  writeFileSync(backupFile, JSON.stringify(backup, null, 2))
  console.log(`Бэкап целевых месяцев: ${backupFile}\n`)

  for (const period of TARGETS) {
    try {
      await api(`/reports/${period}/views-statistics`, {
        method: 'POST',
        body: viewsInput(views),
      })
      console.log(`✓ просмотры ${period}`)
    } catch (error) {
      failures.push(error.message)
      console.log(`✗ просмотры ${period}: ${error.message}`)
    }
  }

  for (const { contract, input } of sources) {
    const label = `${contract.brandName} · №${contract.number ?? contract.id}`
    for (const period of TARGETS) {
      try {
        await api(`/contracts/${contract.id}/reports/${period}/manual`, {
          method: 'POST',
          body: input,
        })
      } catch (error) {
        failures.push(`${label} ${period}: ${error.message}`)
        console.log(`✗ ${label} ${period}: ${error.message}`)
      }
    }
    console.log(`✓ ${label}`)
  }

  console.log(
    failures.length ? `\nГотово с ошибками: ${failures.length}` : '\nГотово.',
  )
  if (failures.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
