import { leagueNames, sportName } from '@/lib/audienceOptions.js'
import { cloneOverview } from '@/lib/overviewSeed.js'

/**
 * Статистика просмотров месяца (`/reports/:period/views-statistics`) ↔
 * разделы аудитории на странице «Статистика»: возраст, устройства, OTT и TV,
 * возраст по лигам и города. Подписи, цвета и порядок долей — из шаблона
 * страницы (overviewSeed), значения — с сервера.
 */

/** Возрастные группы сервера по возрастанию — так же идут колонки лиг. */
export const AGE_KEYS = ['13-17', '18-24', '25-34', '35-44', '45-54']

// id доли возраста на странице → ключ сервера.
const AGE_BY_ID = {
  age_13: '13-17',
  age_18: '18-24',
  age_25: '25-34',
  age_35: '35-44',
  age_45: '45-54',
}
const ageKey = (id) => AGE_BY_ID[id]

/** Ключ устройства из id доли: dev_tv, ott_phone, tv_browser → tv, phone, browser. */
const deviceKey = (id) => id.slice(id.indexOf('_') + 1)

const num = (value) => Number(value) || 0

/** Доли шаблона со значениями сервера; группы нет — null. */
const sharesFrom = (items, values, keyOf) =>
  values
    ? items.map((item) => ({ ...item, value: num(values[keyOf(item.id)]) }))
    : null

/** Доли страницы → объект сервера `{ ключ: значение }`. */
const sharesTo = (items, keyOf) =>
  Object.fromEntries(items.map((item) => [keyOf(item.id), num(item.value)]))

const zeroShares = (items) => items.map((item) => ({ ...item, value: 0 }))

/**
 * Разделы аудитории из ответа сервера. Группы, которых за месяц нет, — null
 * (у OTT и TV — `data: null`), списки лиг и городов — пустые: страница
 * покажет, что за месяц не введено.
 */
export function audienceFromServer(stats) {
  const template = cloneOverview()
  return {
    ageShare: sharesFrom(template.ageShare, stats?.age, ageKey),
    deviceShare: sharesFrom(template.deviceShare, stats?.device, deviceKey),
    platformDeviceShare: template.platformDeviceShare.map((platform) => ({
      ...platform,
      data: sharesFrom(
        platform.data,
        platform.id === 'pf_ott' ? stats?.ottDevice : stats?.tvDevice,
        deviceKey,
      ),
    })),
    leagueAgeRows: (stats?.leagueRows ?? []).map((row, index) => ({
      id: `lg_${index}`,
      sport: sportName(row.sport),
      leagues: leagueNames(row.league),
      ages: AGE_KEYS.map((key) => num(row.age?.[key])),
    })),
    cityShare: (stats?.geo ?? []).map((row, index) => ({
      id: `city_${index}`,
      name: row.city,
      value: num(row.value),
    })),
  }
}

/**
 * Черновик для правки. Сервер ждёт все группы сразу, поэтому пустые группы
 * месяца начинаем с нулей, а пустые списки лиг и городов — с перечня из
 * шаблона, тоже с нулями: вбивать двадцать городов каждый месяц заново
 * незачем, лишние убирают крестиком.
 */
export function audienceDraft(audience) {
  const template = cloneOverview()
  return {
    ageShare: audience.ageShare ?? zeroShares(template.ageShare),
    deviceShare: audience.deviceShare ?? zeroShares(template.deviceShare),
    platformDeviceShare: audience.platformDeviceShare.map(
      (platform, index) => ({
        ...platform,
        data:
          platform.data ?? zeroShares(template.platformDeviceShare[index].data),
      }),
    ),
    leagueAgeRows: audience.leagueAgeRows.length
      ? audience.leagueAgeRows
      : template.leagueAgeRows.map((row) => ({
          ...row,
          ages: AGE_KEYS.map(() => 0),
        })),
    cityShare: audience.cityShare.length
      ? audience.cityShare
      : zeroShares(template.cityShare),
  }
}

/** Тело POST из черновика: все группы, лиги и города — как в таблицах. */
export function audienceToInput(data) {
  return {
    age: sharesTo(data.ageShare, ageKey),
    device: sharesTo(data.deviceShare, deviceKey),
    ottDevice: sharesTo(
      data.platformDeviceShare.find((p) => p.id === 'pf_ott').data,
      deviceKey,
    ),
    tvDevice: sharesTo(
      data.platformDeviceShare.find((p) => p.id === 'pf_tv').data,
      deviceKey,
    ),
    leagueRows: data.leagueAgeRows.map((row) => ({
      sport: row.sport.trim(),
      league: row.leagues.trim(),
      age: Object.fromEntries(
        AGE_KEYS.map((key, index) => [key, num(row.ages[index])]),
      ),
    })),
    geo: data.cityShare.map((city) => ({
      city: city.name.trim(),
      value: num(city.value),
    })),
  }
}

/**
 * Что не так с черновиком до отправки — сервер ответил бы 400. Пустая
 * строка — всё в порядке.
 */
export function audienceProblem(data) {
  const values = [
    ...data.ageShare.map((item) => item.value),
    ...data.deviceShare.map((item) => item.value),
    ...data.platformDeviceShare.flatMap((p) => p.data.map((i) => i.value)),
    ...data.leagueAgeRows.flatMap((row) => row.ages),
    ...data.cityShare.map((city) => city.value),
  ]
  if (values.some((value) => !(num(value) >= 0 && num(value) <= 100))) {
    return 'Доли — числа от 0 до 100'
  }
  if (
    data.leagueAgeRows.some((row) => !row.sport.trim() || !row.leagues.trim())
  ) {
    return 'У каждой строки лиг укажите вид спорта и лигу'
  }
  const leagues = data.leagueAgeRows.map((row) =>
    `${row.sport.trim()}|${row.leagues.trim()}`.toLowerCase(),
  )
  if (new Set(leagues).size !== leagues.length) {
    return 'Вид спорта и лига повторяются — у каждой пары одна строка'
  }
  if (data.cityShare.some((city) => !city.name.trim())) {
    return 'У каждого города укажите название'
  }
  const cities = data.cityShare.map((city) => city.name.trim().toLowerCase())
  if (new Set(cities).size !== cities.length) {
    return 'Город повторяется — у каждого одна строка'
  }
  return ''
}
