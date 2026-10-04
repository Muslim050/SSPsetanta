/**
 * Доменные типы API. Соответствуют схеме
 * https://setanta.pythonanywhere.com/api/v1/schema — при изменениях
 * на бэкенде правим здесь, а не по компонентам.
 */

/** Роли из RoleEnum. */
export type Role = 'admin' | 'viewer' | 'advertiser'

/** Схема User. Идентификаторы на бэкенде числовые. */
export interface User {
  id: number
  role: Role
  name: string
  email: string
  /** Заполнен только у роли advertiser. */
  advertiserId: number | null
}

export interface LoginRequest {
  /** Регистр не важен — сервер приводит сам. */
  login: string
  password: string
}

/** Пара JWT: access живёт 15 минут, refresh меняется при каждом обновлении. */
export interface TokenPair {
  access: string
  refresh: string
}

export interface LoginResponse extends TokenPair {
  user: User
}

export type RefreshResponse = TokenPair

export interface MeResponse {
  user: User
}

/** Курсорная пагинация: `nextCursor === null` — страница последняя. */
export interface Paginated<T> {
  items: T[]
  nextCursor: string | null
  total: number
}

export type AdvertiserStatus = 'active' | 'paused'
export type ContractPackage = 'partner' | 'general' | 'presenter'
export type ContractStatus = 'active' | 'completed' | 'terminated'
/** Пустая строка — статус за период ещё не ставили. */
export type PaymentStatus = 'awaiting' | 'paid' | ''

/** Файл внутри сущности: скан договора, ролик. Только на чтение. */
export interface AttachedFile {
  name: string
  url: string
  addedAt: string
}

/** Поступление по договору. Суммы и порядок ведёт сервер. */
export interface Payment {
  id: number
  amount: string
  paidAt: string
  seq: number
  comment?: string
  createdBy: string
}

/** Запись в истории смен статуса оплаты. */
export interface ContractStatusEntry {
  id: number
  /** Месяц договора в формате `YYYY-MM`. */
  period: string
  status: PaymentStatus
  changedAt: string
  by: string
}

/**
 * Договор бренда. Суммы приходят строками-decimal — так сервер избегает
 * потерь точности; в рублёвых расчётах приводим их через Number().
 *
 * Деньги (`budget`, `spent`, `payments`) и статус оплаты сервер отдаёт
 * только на чтение: они правятся отдельными эндпоинтами — `/contracts/:id/
 * amounts`, `/payments`, `/payment-status`. Здесь ведутся условия договора.
 */
export interface Contract {
  id: number
  /** Чей договор. Только на чтение: бренд задаётся адресом создания. */
  advertiserId: number
  number: string
  campaignName: string
  legalName: string
  package: ContractPackage | ''
  leagues: string[]
  start: string | null
  end: string | null
  paymentDate: string | null
  status: ContractStatus
  budget: string
  spent: string
  paymentStatus: PaymentStatus
  paymentStatusAt: string | null
  /** Статус оплаты по месяцам договора: ключ вида `2026-08`. */
  paymentStatusByPeriod: Record<
    string,
    { status: PaymentStatus; changedAt: string }
  >
  payments: Payment[]
  paymentLog: ContractStatusEntry[]
  /** Скан договора. Загрузка файлов идёт через `POST /files`. */
  file: AttachedFile | null
  /** Рекламный ролик договора — его заполняет рекламодатель. */
  creative: AttachedFile | null
  version: number
}

/** Поля договора, которые можно отправить на сервер. */
export type ContractInput = Partial<
  Pick<
    Contract,
    | 'number'
    | 'campaignName'
    | 'legalName'
    | 'package'
    | 'leagues'
    | 'start'
    | 'end'
    | 'paymentDate'
    | 'status'
  >
> & {
  /** Скан договора: id из загрузчика файлов. `null` — убрать файл. */
  fileId?: number | null
  /** Рекламный ролик договора: id из загрузчика файлов. */
  creativeId?: number | null
}

export interface Advertiser {
  id: number
  name: string
  contact: string
  email: string
  category: string
  status: AdvertiserStatus
  legalName: string
  balance: string
  color: string
  /** Логотип внешней ссылкой — для брендов, чей логотип лежит не у нас. */
  logo: string | null
  /** Логотип, загруженный через `POST /files`. Пишется через `logoId`. */
  logoFile: AttachedFile | null
  requisites: string
  /** Сколько кампаний у бренда — считает сервер, без удалённых. */
  campaignsCount: number
  /** Только для чтения: договоры правятся своими эндпоинтами. */
  contracts: Contract[]
  createdAt: string
  version: number
}

/** Поля бренда, которые можно отправить на сервер. */
export type AdvertiserInput = Partial<
  Pick<
    Advertiser,
    | 'name'
    | 'contact'
    | 'email'
    | 'category'
    | 'status'
    | 'legalName'
    | 'balance'
    | 'color'
    | 'logo'
    | 'requisites'
  >
> & {
  /** Логотип файлом: id из загрузчика. `null` — убрать логотип. */
  logoId?: number | null
}

/**
 * Пользователь платформы глазами админа. Пароль только на запись: наружу
 * сервер его не отдаёт ни в каком виде.
 */
export interface ManagedUser {
  id: number
  login: string
  /** Склейка имени и фамилии — её собирает сервер. */
  name: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: Role
  /** Заполнен у роли advertiser: чей бренд видит пользователь. */
  advertiserId: number | null
  isActive: boolean
  createdAt: string
  version: number
}

/** Поля пользователя, которые можно отправить на сервер. */
export type ManagedUserInput = Partial<
  Pick<
    ManagedUser,
    | 'login'
    // `name` сервер собирает сам из имени и фамилии, но одиночное имя
    // по-прежнему принимает — поле оставлено для совместимости.
    | 'name'
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'phone'
    | 'role'
    | 'advertiserId'
    | 'isActive'
  >
> & {
  /** Пустой пароль не отправляем — прежний останется как есть. */
  password?: string
}

/** Воронка заявки: порядок статусов — как в этом списке. */
export type CampaignStatus =
  | 'sent'
  | 'received'
  | 'reviewing'
  | 'active'
  | 'completed'
  | 'awaiting_payment'
  | 'paid'
  | 'archived'

export type CampaignObjective =
  'awareness' | 'traffic' | 'conversions' | 'reach'

/**
 * Кампания. Условия договора (пакет, лиги, юр. лицо, срок, дата оплаты)
 * сервер проставляет сам по `contractNumber` — отправлять их не нужно,
 * на запись они закрыты. Денег у кампании больше нет: они на договоре.
 */
export interface Campaign {
  id: number
  /** Берётся из сессии автора заявки, на запись закрыт. */
  advertiserId: number | null
  name: string
  status: CampaignStatus
  objective: CampaignObjective | ''
  startDate: string
  endDate: string
  channelIds: number[]
  impressions: number
  clicks: number
  conversions: number
  /** Ролик внешней ссылкой — когда он лежит не у нас. */
  creativeUrl: string
  creativeName: string
  creativeAddedAt: string | null
  /** Ролик, загруженный через `POST /files`. Пишется через `creativeId`. */
  creative: AttachedFile | null
  contractNumber: string
  /** Снимок условий договора на момент создания. Только чтение. */
  package: string
  leagues: string[]
  legalName: string
  contractStart: string | null
  contractEnd: string | null
  paymentDate: string | null
  createdAt: string
  version: number
}

/**
 * Поля кампании, которые можно отправить на сервер. При создании статус
 * не отправляем: заявка всегда заводится как `sent`.
 */
export type CampaignInput = Partial<
  Pick<
    Campaign,
    | 'name'
    | 'status'
    | 'objective'
    | 'startDate'
    | 'endDate'
    | 'channelIds'
    | 'impressions'
    | 'clicks'
    | 'conversions'
    | 'creativeUrl'
    | 'creativeName'
    | 'creativeAddedAt'
    | 'contractNumber'
  >
> & {
  /** Ролик файлом: id из загрузчика. `null` — убрать ролик. */
  creativeId?: number | null
  /**
   * Бренд заявки — только когда её заводит площадка (без него 400).
   * Рекламодателю не нужен: бренд берётся из сессии, присланный игнорируется.
   */
  advertiserId?: number
}

/** Ответ загрузчика файлов: `POST /files`. */
export interface StoredFile {
  id: number
  name: string
  /** Путь скачивания вида `/api/v1/files/<slug>/download`. Требует токен. */
  url: string
  size: number
  mime: string
  addedAt: string
}

/* ------------------------------------------------------------------------ */
/* Отчёт за месяц: файл статистики, разобранный сервером на девять листов.  */
/* ------------------------------------------------------------------------ */

/** Месяц отчёта: `2026-01`. */
export type ReportPeriod = string

/** Код листа — в порядке исходного файла. */
export type ReportSheetCode =
  | 'ss1uzb'
  | 'ss2uzb'
  | 'live1'
  | 'live2'
  | 'promo1'
  | 'promo2'
  | 'social'
  | 'ottlive'
  | 'ottpreroll'

/**
 * Форма листа. Таблицу выбирают по ней, а не по коду: логов выходов четыре,
 * эфиров два, остальные — по одному.
 */
export type ReportSheetKind =
  'spot_log' | 'live_event' | 'ott_live' | 'preroll' | 'social'

/** Выход ролика. `date` — ISO, `time` — `HH:MM:SS`, как в файле. */
export interface SpotLogRow {
  item: string
  date: string
  time: string
}

/** Секунды рекламы в месте эфира; null — рекламы там не было. */
export type Seconds = number | null

/**
 * Прямой эфир, в который вставлен ролик. Поля выходов и просмотров сервер
 * требует в каждой строке при сохранении — хотя бы null; в отчётах,
 * загруженных до нового шаблона, они null.
 */
export interface LiveEventRow {
  date: string
  time: string
  tournament: string
  event: string
  pre: Seconds
  mid1: Seconds
  mid2: Seconds
  post: Seconds
  views: number | null
  /**
   * Бренды блока «Total ads spots»: `brand1`…`brand8`, колонки заводят
   * руками. Заведённая колонка есть в каждой строке, пустая — ''.
   */
  [brand: `brand${number}`]: string | undefined
}

/** Эфир OTT (LIVE) — то же, что прямой эфир, но без post. */
export type OttLiveRow = Omit<LiveEventRow, 'post'>

/** Прероллы OTT за период. `percent` — 0…100, до сотых. */
export interface PrerollRow {
  percent: number
  prerolls: number
  dateFrom: string
  dateTo: string
}

/**
 * Итоги эфиров — считает сервер, обратно не отправляются. `rows` — строк,
 * `seconds` — весь хронометраж рекламы (pre + mid1 + mid2 + post).
 */
export interface LiveTotals {
  rows: number
  pre: number
  mid1: number
  mid2: number
  post: number
  views: number
  seconds: number
}

export type SocialNetwork = 'instagram' | 'telegram'

/** Публикация в соцсети. */
export interface SocialRow {
  network: SocialNetwork
  link: string
  impressions: number
}

interface ReportSheetBase {
  code: ReportSheetCode
  title: string
  /** Своя у каждого листа: правка одного не мешает сохранить другой. */
  version: number
}

export type ReportSheet =
  | (ReportSheetBase & { kind: 'spot_log'; rows: SpotLogRow[] })
  | (ReportSheetBase & {
      kind: 'live_event'
      rows: LiveEventRow[]
      totals: LiveTotals
    })
  | (ReportSheetBase & {
      kind: 'ott_live'
      rows: OttLiveRow[]
      totals: Omit<LiveTotals, 'post'>
    })
  | (ReportSheetBase & { kind: 'preroll'; rows: PrerollRow[] })
  | (ReportSheetBase & {
      kind: 'social'
      rows: SocialRow[]
      /** Сумма показов по сети — считает сервер, обратно не отправляется. */
      totals: Record<SocialNetwork, number>
    })

/** Загрузка файла отчёта. Видна только площадке. */
export interface ReportImport {
  id: number
  period: ReportPeriod
  at: string
  by: string
  file: AttachedFile | null
  /** Сколько строк пришло в каждый лист. */
  rowCounts: Partial<Record<ReportSheetCode, number>>
}

/**
 * Откуда отчёт месяца: из файла (девять листов) или введён вручную (только
 * цифры по каналам). Нет поля — сервер до ручных отчётов, значит `file`.
 */
export type ReportType = 'file' | 'manual'

export type ReportChannel = 'ss1' | 'ss2'

/** Ручной отчёт по каналу — та же форма и на входе, и на выходе. */
export interface SpotReport {
  channel: ReportChannel
  standardCount: number
  standardSeconds: number
  liveCount: number
  liveSeconds: number
  liveViews: number
}

/**
 * Ручной отчёт за месяц целиком: заводит его или заменяет прежний ручной;
 * файловый отчёт того же месяца не меняется. В `spots` — ровно по записи на
 * канал; пропущенный счётчик и `null` — одно и то же.
 */
export interface ManualReportInput {
  eventPromoCount: number | null
  ottPrerollViews: number | null
  spots: SpotReport[]
}

/**
 * Отчёт за месяц целиком. У файлового — девять листов и пустой `spots`,
 * у ручного — наоборот: записи по каналам и пустой `sheets`. Это два
 * отдельных отчёта месяца: файловый — `GET …/reports/:period`, ручной —
 * `GET …/reports/:period/manual`.
 */
export interface Report {
  id: number
  contractId: number
  period: ReportPeriod
  reportType?: ReportType
  eventPromoCount?: number | null
  ottPrerollViews?: number | null
  updatedAt: string
  sheets: ReportSheet[]
  spots?: SpotReport[]
  /** `null` у наблюдателя и рекламодателя: кто загружал, им не показываем. */
  lastImport: ReportImport | null
}

/** Месяц, за который отчёт загружен. */
export interface ReportMonth {
  period: ReportPeriod
  reportType?: ReportType
  updatedAt: string
  lastImport: ReportImport | null
}

/** Сохранение листа: весь список строк в нужном порядке. */
export interface ReportSheetInput {
  /** Без неё сохранение пройдёт без проверки и может затереть чужую правку. */
  version?: number
  rows:
    SpotLogRow[] | LiveEventRow[] | OttLiveRow[] | PrerollRow[] | SocialRow[]
}
