/**
 * Данные вкладки «Обзор». Значения демо-отчёта Setanta — их правят прямо на
 * странице, поэтому здесь только начальное состояние; правки лежат в базе.
 * Иконки храним ключами: в localStorage компонент не сериализуешь.
 */
export const OVERVIEW_DEFAULTS = {
  summary: {
    title: 'Общая статистика Setanta Sports',
    subtitle: 'Ключевые показатели телевизионных и digital-размещений.',
    publications: 14,
    socialImpressions: 495246,
  },
  mediaTotals: [
    { id: 'mt_live', label: 'Прямые эфиры', value: 111, icon: 'RadioTower' },
    {
      id: 'mt_ads',
      label: 'Рекламные ролики',
      value: 1088,
      icon: 'Clapperboard',
    },
    { id: 'mt_promo', label: 'Промо в эфире', value: 1295, icon: 'Tv' },
    { id: 'mt_time', label: 'Хронометраж, сек.', value: 32640, icon: 'Timer' },
    {
      id: 'mt_views',
      label: 'Просмотры Live Ads',
      value: 23708161,
      icon: 'PlayCircle',
    },
  ],
  socialChannels: [
    {
      id: 'sc_instagram',
      name: 'Instagram',
      icon: 'Instagram',
      color: '#FFD106',
      posts: 7,
      impressions: 188046,
      rows: [51102, 30399, 29222, 27392, 23915, 14127, 11889].map(
        (value, index) => ({ id: `instagram-${index + 1}`, value }),
      ),
    },
    {
      id: 'sc_telegram',
      name: 'Telegram',
      icon: 'Send',
      color: '#0EA5E9',
      posts: 7,
      impressions: 307200,
      rows: [35000, 39200, 42600, 58800, 46200, 42600, 42800].map(
        (value, index) => ({ id: `telegram-${index + 1}`, value }),
      ),
    },
  ],
  // Отчёт YouTube-канала: сводные цифры и разбивка аудитории в процентах.
  // Данные приходят из YouTube Analytics выгрузкой, в API их пока нет.
  youtube: {
    channel: 'Setanta Sports Uzbekistan',
    totals: [
      { id: 'yt_views', label: 'Кол-во просмотров', value: 11881841 },
      { id: 'yt_likes', label: 'Кол-во лайков', value: 296705 },
      { id: 'yt_dislikes', label: 'Кол-во дизлайков', value: 4210 },
      { id: 'yt_comments', label: 'Кол-во комментариев', value: 22465 },
      {
        id: 'yt_minutes',
        label: 'Среднее кол-во минут просмотров',
        value: 58375352,
      },
    ],
    breakdown: [
      {
        id: 'yt_age',
        title: 'Возраст',
        items: [
          { id: 'yt_a_13', label: '13–17', value: 8.7 },
          { id: 'yt_a_18', label: '18–24', value: 21.5 },
          { id: 'yt_a_25', label: '25–34', value: 34.7 },
          { id: 'yt_a_35', label: '35–44', value: 23.9 },
          { id: 'yt_a_45', label: '45–54', value: 6.4 },
          { id: 'yt_a_55', label: '55–64', value: 3.1 },
          { id: 'yt_a_65', label: '65+', value: 1.6 },
        ],
      },
      {
        id: 'yt_gender',
        title: 'Пол',
        items: [
          { id: 'yt_g_f', label: 'Ж', value: 15.7 },
          { id: 'yt_g_m', label: 'М', value: 84.1 },
          { id: 'yt_g_x', label: 'Не указан', value: 0.1 },
        ],
      },
      {
        id: 'yt_device',
        title: 'Девайсы',
        items: [
          { id: 'yt_d_tv', label: 'ТВ', value: 4.7 },
          { id: 'yt_d_phone', label: 'Телефон', value: 40.7 },
          { id: 'yt_d_tablet', label: 'Планшет', value: 53.1 },
          { id: 'yt_d_desktop', label: 'Компьютер', value: 1 },
          { id: 'yt_d_other', label: 'Не определено', value: 0.5 },
        ],
      },
      {
        id: 'yt_geo',
        title: 'Гео',
        items: [
          { id: 'yt_geo_uz', label: 'UZ', value: 98.2 },
          { id: 'yt_geo_ru', label: 'RU', value: 0.5 },
          { id: 'yt_geo_kg', label: 'KG', value: 0.3 },
          { id: 'yt_geo_other', label: 'Другие', value: 0.7 },
        ],
      },
    ],
  },
  audience: {
    malePct: 95.5,
    ageTitle: 'Возрастная структура',
    ageNote: 'Основное ядро аудитории — зрители от 18 до 34 лет.',
  },
  ageShare: [
    { id: 'age_18', label: '18–24', value: 33, color: '#F2C94C' },
    { id: 'age_25', label: '25–34', value: 42, color: '#84C65A' },
    { id: 'age_35', label: '35–44', value: 18, color: '#76B7E5' },
    { id: 'age_45', label: '45–54', value: 6, color: '#F1DFC0' },
    { id: 'age_13', label: '13–17', value: 1, color: '#F27474' },
  ],
  deviceShare: [
    { id: 'dev_browser', label: 'Браузер', value: 3, color: '#68A9DC' },
    { id: 'dev_tv', label: 'Smart TV', value: 66, color: '#EE9B5A' },
    { id: 'dev_phone', label: 'Телефон', value: 30, color: '#A7ADB4' },
    { id: 'dev_tablet', label: 'Планшет', value: 1, color: '#EFCB55' },
  ],
  platformDeviceShare: [
    {
      id: 'pf_ott',
      platform: 'OTT',
      data: [
        { id: 'ott_phone', label: 'Телефон', value: 65, color: '#68A9DC' },
        { id: 'ott_tv', label: 'Smart TV', value: 22, color: '#EFCB55' },
        { id: 'ott_browser', label: 'Браузер', value: 10, color: '#A7ADB4' },
        { id: 'ott_tablet', label: 'Планшет', value: 3, color: '#EE9B5A' },
      ],
    },
    {
      id: 'pf_tv',
      platform: 'TV',
      data: [
        { id: 'tv_tv', label: 'Smart TV', value: 54, color: '#EFCB55' },
        { id: 'tv_phone', label: 'Телефон', value: 33, color: '#68A9DC' },
        { id: 'tv_browser', label: 'Браузер', value: 12, color: '#A7ADB4' },
        { id: 'tv_tablet', label: 'Планшет', value: 1, color: '#EE9B5A' },
      ],
    },
  ],
  leagueAgeRows: [
    {
      id: 'lg_football',
      sport: 'Football',
      leagues: 'EPL, LaLiga, Ligue 1, Bundesliga, Serie A',
      ages: [27.8, 33.3, 22.2, 16.7],
    },
    {
      id: 'lg_mma',
      sport: 'MMA Fights',
      leagues: 'UFC, Bellator, PFL',
      ages: [37.9, 34.5, 16.5, 11.1],
    },
    {
      id: 'lg_racing',
      sport: 'Racing',
      leagues: 'F1',
      ages: [15.6, 31.9, 27.9, 24.6],
    },
    {
      id: 'lg_tennis',
      sport: 'Tennis',
      leagues: 'WTA, ATP',
      ages: [17.0, 31.2, 28.2, 23.6],
    },
    {
      id: 'lg_basketball',
      sport: 'Basketball',
      leagues: 'NBA',
      ages: [35.3, 28.8, 24.7, 11.2],
    },
    {
      id: 'lg_hockey',
      sport: 'Hockey',
      leagues: 'NHL',
      ages: [15.8, 25.5, 32.5, 26.2],
    },
  ],
  cityShare: [
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
  ].map(([name, value], index) => ({ id: `city_${index + 1}`, name, value })),
}

/** Свежая копия дефолтов — состояние правят иммутабельно. */
export const cloneOverview = () => JSON.parse(JSON.stringify(OVERVIEW_DEFAULTS))

/**
 * Обзор за конкретный месяц: те же показатели, но с сезонным разбросом —
 * иначе все месяцы выглядят одинаково. Коэффициент считается от номера
 * месяца, поэтому цифры стабильны между перезагрузками.
 */
export function overviewForPeriod(period) {
  const month = Number(String(period).slice(5, 7)) || 1
  const overview = cloneOverview()
  // Разброс ±18% с горкой к середине года.
  const factor = 0.82 + ((month * 7) % 12) * 0.03
  const scale = (value, extra = 1) =>
    Math.max(1, Math.round(value * factor * extra))

  overview.summary.publications = scale(overview.summary.publications)
  overview.summary.socialImpressions = scale(overview.summary.socialImpressions)
  overview.mediaTotals = overview.mediaTotals.map((item, index) => ({
    ...item,
    value: scale(item.value, 1 + ((month + index) % 5) * 0.02),
  }))
  overview.socialChannels = overview.socialChannels.map((channel, index) => ({
    ...channel,
    posts: scale(channel.posts, 1 + ((month + index) % 3) * 0.05),
    impressions: scale(channel.impressions, 1 + ((month + index) % 4) * 0.03),
    rows: channel.rows.map((row, rowIndex) => ({
      ...row,
      value: scale(row.value, 1 + ((month + rowIndex) % 6) * 0.04),
    })),
  }))
  overview.youtube.totals = overview.youtube.totals.map((item, index) => ({
    ...item,
    value: scale(item.value, 1 + ((month + index) % 4) * 0.03),
  }))
  // Доли аудитории оставляем прежними: они меняются медленнее объёмов.
  return overview
}

/**
 * Обзор за месяц, дополненный недостающими разделами. Сохранённые раньше
 * месяцы не знают о разделах, добавленных позже, — иначе страница падала бы
 * на первом же обращении к ним.
 */
// Прежний заголовок по умолчанию. В сохранённых правках месяца он мог
// остаться, хотя его никто не вводил, — подменяем на нынешний. Свой
// заголовок, введённый вручную, не трогаем.
const OLD_DEFAULT_TITLE = 'Общая статистика эфира'

export function fillOverview(saved, period) {
  const defaults = overviewForPeriod(period)
  if (!saved) return defaults
  const filled = { ...defaults, ...saved }
  if (filled.summary?.title === OLD_DEFAULT_TITLE) {
    filled.summary = { ...filled.summary, title: defaults.summary.title }
  }
  return filled
}
