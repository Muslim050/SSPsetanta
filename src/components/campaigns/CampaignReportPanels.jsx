import { useState } from 'react'
import {
  Instagram,
  MapPin,
  MonitorSmartphone,
  Pencil,
  PlayCircle,
  RadioTower,
  Save,
  Send,
  Timer,
  Tv,
} from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useSaveManualReport } from '@/features/reports/queries'
import { CHANNELS, manualReportInput } from '@/features/reports/summary'
import { useToast } from '@/components/ui/Toast.jsx'
import { formatNumber, formatPct } from '@/lib/format.js'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card.jsx'
import { DonutChart } from '@/components/charts/DonutChart.jsx'
import { cn } from '@/lib/cn.js'

// Устройства и география Total, сохранённые раньше ручной правкой, — в браузере.
const STATS_STORAGE_KEY = 'setanta.campaign.report-stats.v1'

/** Число из поля: там строка, иногда с пробелами. */
const statNumber = (value) => {
  const digits = String(value ?? '').replace(/[^\d.-]/g, '')
  const number = Number(digits)
  return Number.isFinite(number) ? number : 0
}

function loadStats(key, seed) {
  try {
    const saved = JSON.parse(localStorage.getItem(STATS_STORAGE_KEY) || '{}')
    // Сохранённый отчёт мог быть записан до появления новых блоков —
    // недостающее добираем из сида, иначе панель падает на пустом поле.
    return saved[key] ? { ...seed, ...saved[key] } : seed
  } catch {
    return seed
  }
}

/** Число сводки: 14 111 352; значения нет — прочерк. */
function StatValue({ value, className }) {
  return (
    <p className={cn('font-display font-semibold text-ink tnum', className)}>
      {value === null || value === undefined
        ? '—'
        : formatNumber(statNumber(value))}
    </p>
  )
}

/** Поле числа в ручном вводе — с разрядами, как в сводке; пусто — null. */
function StatInput({ value, onChange, label, className }) {
  return (
    <input
      value={value === null || value === undefined ? '' : formatNumber(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^\d]/g, '')
        onChange(digits ? Number(digits) : null)
      }}
      inputMode="numeric"
      placeholder="—"
      aria-label={label}
      className={cn(
        'w-full rounded-lg border border-line bg-surface px-2 py-1 font-display font-semibold text-ink outline-hidden transition-colors tnum focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200',
        className,
      )}
    />
  )
}

const SOCIAL_CHANNELS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#8B5CF6' },
  { id: 'telegram', name: 'Telegram', icon: Send, color: '#29B6F6' },
]

const TOTAL_METRICS = [
  { key: 'liveEvents', label: 'Прямые эфиры', icon: RadioTower },
  { key: 'eventPromo', label: 'Промо в эфире', icon: Tv },
  { key: 'seconds', label: 'Хронометраж, сек.', icon: Timer },
  // Наблюдателю просмотры не показываем — как и в таблице размещений.
  {
    key: 'views',
    label: 'Просмотры Live Ads',
    icon: PlayCircle,
    viewer: false,
  },
]

/**
 * Демо-сводка для страницы «Статистика» рекламодателя: у неё нет договора и
 * месяца, отчёт ей взять неоткуда. В отчёте договора сводка считается
 * из листов (features/reports/summary).
 */
const DEMO_SUMMARY = {
  totals: {
    liveEvents: 111,
    eventPromo: 1295,
    seconds: 32640,
    views: 23708161,
  },
  social: {
    instagram: { posts: 7, impressions: 188000 },
    telegram: { posts: 7, impressions: 307000 },
  },
  unknownDuration: 0,
}

const DEVICE_SHARE = [
  { label: 'Браузер', value: 3, color: '#4A9BDF' },
  { label: 'Smart TV', value: 66, color: '#F47B20' },
  { label: 'Телефон', value: 30, color: '#A3A3A3' },
  { label: 'Планшет', value: 1, color: '#FFD106' },
]

const CITY_SHARE = [
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
].map(([name, value]) => ({ name, value }))

function ReportHeader({ eyebrow, title, subtitle }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-800">
        {eyebrow}
      </p>
      <h3 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
        {title}
      </h3>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">{subtitle}</p>
    </div>
  )
}

/**
 * Вместо цифр, пока за месяц нет отчёта: площадке — что сделать,
 * остальным — что отчёт готовится.
 */
function SummaryEmpty({
  loading,
  adminText = 'Сводка посчитается из файла статистики — загрузите его за этот месяц.',
}) {
  const { canEdit, isAdvertiser } = useAuth()
  const text = loading
    ? 'Загружаем отчёт за месяц…'
    : canEdit && !isAdvertiser
      ? adminText
      : 'Отчёт в процессе формирования!'
  return (
    <p className="relative mt-6 rounded-2xl border border-dashed border-indigo-300 bg-surface/70 px-4 py-6 text-center text-[13px] text-ink-muted">
      {text}
    </p>
  )
}

function ChannelMetric({
  label,
  value,
  unit,
  accent = 'coral',
  editing = false,
  onChange,
}) {
  const accentClass =
    accent === 'green'
      ? 'border-success/20 bg-linear-to-br from-surface to-success/6'
      : 'border-indigo-200 bg-linear-to-br from-surface to-indigo-50'

  return (
    <div className={`rounded-2xl border p-4 shadow-soft ${accentClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      {editing ? (
        <StatInput
          value={value}
          onChange={onChange}
          label={unit ? `${label}, ${unit}` : label}
          className="mt-2 text-2xl"
        />
      ) : (
        <StatValue value={value} className="mt-2 text-2xl" />
      )}
      {unit && <p className="mt-0.5 text-[12px] text-ink-muted">{unit}</p>}
    </div>
  )
}

function ChannelPanel({ channel, editing, onChange }) {
  // Наблюдателю просмотры не показываем — как и в таблице размещений.
  const { isViewer } = useAuth()
  const set = (key) => (value) => onChange({ ...channel, [key]: value })

  return (
    <div className="rounded-3xl border border-line bg-surface/90 p-4 shadow-soft sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 font-display text-sm font-bold text-ink">
          {channel.code}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-lg font-semibold text-ink">
            {channel.name}
          </h4>
          <p className="text-[12px] text-ink-muted">TV media performance</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <ChannelMetric
          label="Standard spot"
          value={channel.standardSpots}
          unit="роликов"
          editing={editing}
          onChange={set('standardSpots')}
        />
        <ChannelMetric
          label="Live spot UFC / Football"
          value={channel.liveAds}
          unit="Live Ads"
          editing={editing}
          onChange={set('liveAds')}
        />
        <ChannelMetric
          label="Standard spot"
          value={channel.standardSeconds}
          unit="секунд"
          editing={editing}
          onChange={set('standardSeconds')}
        />
        <ChannelMetric
          label="Live spot UFC / Football"
          value={channel.liveSeconds}
          unit="секунд"
          editing={editing}
          onChange={set('liveSeconds')}
        />
        {!isViewer && (
          <div className="col-span-2">
            <ChannelMetric
              label="TV Live Ads Views"
              value={channel.liveViews}
              unit="просмотров"
              editing={editing}
              onChange={set('liveViews')}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/** Пустой черновик ручного ввода — для месяца без отчёта. */
const emptyDraft = () => ({
  channels: CHANNELS.map(({ name, code, channel }) => ({
    name,
    code,
    channel,
    standardSpots: null,
    standardSeconds: null,
    liveAds: null,
    liveSeconds: null,
    liveViews: null,
  })),
  eventPromo: null,
  ottPreroll: null,
})

/**
 * Spot statistic — сводка по каналам: стандартные выходы, Live Ads прямых
 * эфиров, промо и прероллы OTT. Цифры — отдельный ручной отчёт месяца
 * (`GET …/reports/:period/manual`), файловый отчёт на них не влияет.
 *
 * Площадка заводит и правит цифры по «Редактировать» —
 * `POST …/reports/:period/manual`. Родитель задаёт ключ по договору и
 * месяцу — при их смене черновик сбрасывается сам.
 *
 * spot — spotSummary(ручной отчёт); null — цифры за месяц не заведены.
 */
export function ChannelSummaryReport({
  spot,
  loading = false,
  contractId,
  period,
}) {
  const { canEdit, isAdvertiser } = useAuth()
  const toast = useToast()
  const { mutate: saveManual, isPending: saving } = useSaveManualReport()
  // Заводить цифры может площадка — в отчёте договора за месяц.
  const canManual =
    canEdit && !isAdvertiser && !!contractId && !!period && !loading
  // Черновик ручного ввода: null — вкладка в режиме просмотра.
  const [draft, setDraft] = useState(null)
  const editing = draft !== null
  const shown = editing ? draft : spot

  // Заведённые цифры правим с них же, незаведённые — с пустых полей.
  const start = () =>
    setDraft(
      spot
        ? {
            channels: spot.channels.map((channel) => ({ ...channel })),
            eventPromo: spot.eventPromo,
            ottPreroll: spot.ottPreroll,
          }
        : emptyDraft(),
    )

  const setChannel = (index) => (channel) =>
    setDraft((current) => ({
      ...current,
      channels: current.channels.map((item, i) =>
        i === index ? channel : item,
      ),
    }))

  const save = () =>
    saveManual(
      { contractId, period, input: manualReportInput(draft) },
      {
        onSuccess: () => {
          setDraft(null)
          toast.success('Spot statistic: цифры сохранены')
        },
        onError: (error) =>
          toast.error(error.message || 'Не удалось сохранить отчёт'),
      },
    )

  return (
    <section className="relative overflow-hidden rounded-3xl border border-indigo-200 bg-linear-to-br from-surface via-[#fffdf5] to-indigo-100 p-5 shadow-lift sm:p-6">
      <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full border border-indigo-300/60" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-indigo-100/70 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <ReportHeader
          eyebrow="Channel report"
          title="Spot statistic"
          subtitle="Сводные показатели стандартных и live-размещений по двум телеканалам."
        />
        {canManual && (
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDraft(null)}
                  disabled={saving}
                >
                  Отмена
                </Button>
                <Button size="sm" onClick={save} disabled={saving}>
                  <Save size={15} />
                  {saving ? 'Сохраняем…' : 'Сохранить'}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={start}>
                <Pencil size={15} />
                Редактировать
              </Button>
            )}
          </div>
        )}
      </div>

      {shown ? (
        <>
          <div className="relative mt-6 grid gap-4 xl:grid-cols-2">
            {shown.channels.map((channel, index) => (
              <ChannelPanel
                key={channel.code}
                channel={channel}
                editing={editing}
                onChange={setChannel(index)}
              />
            ))}
          </div>

          <div className="relative mt-4 grid gap-4 sm:grid-cols-2">
            <ChannelMetric
              label="TV Event Promo Count"
              value={shown.eventPromo}
              unit="промо в эфире"
              accent="green"
              editing={editing}
              onChange={(eventPromo) =>
                setDraft((current) => ({ ...current, eventPromo }))
              }
            />
            <ChannelMetric
              label="OTT Pre-roll Views"
              value={shown.ottPreroll}
              unit="просмотров"
              accent="green"
              editing={editing}
              onChange={(ottPreroll) =>
                setDraft((current) => ({ ...current, ottPreroll }))
              }
            />
          </div>
        </>
      ) : (
        <SummaryEmpty
          loading={loading}
          adminText="Цифры Spot за месяц ещё не заведены — нажмите «Редактировать»."
        />
      )}
    </section>
  )
}

function TotalMetric({ metric, value }) {
  const Icon = metric.icon
  return (
    <div className="rounded-2xl border border-line bg-surface/85 p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-muted">
          {metric.label}
        </p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-900">
          <Icon size={16} />
        </span>
      </div>
      <StatValue value={value} className="mt-3 text-2xl" />
    </div>
  )
}

// Вручную в Total ведутся только устройства и география — в файле их нет.
const TOTAL_SEED = {
  devices: DEVICE_SHARE.map((item) => ({ ...item })),
  cities: CITY_SHARE.map((item) => ({ ...item })),
}

/**
 * Total statistics. Эфир и соцсети — из отчёта за месяц (summary).
 * Устройств и географии в отчёте нет: показываем сохранённые раньше или
 * демо-значения, ручной правки здесь нет (см. docs/reports-backend-tasks.md, R1).
 *
 * summary — reportSummary(листы); null — за месяц отчёта нет. Без пропа —
 * демо-сводка: так панель показывает страница «Статистика» рекламодателя.
 * `title` и `showMetrics` — для той же страницы: у неё свой заголовок и нет
 * эфирных карточек (прямые эфиры, промо, хронометраж, просмотры).
 */
export function TotalStatisticsReport({
  summary = DEMO_SUMMARY,
  loading = false,
  title = 'Общая статистика размещений',
  showMetrics = true,
}) {
  // Наблюдателю не показываем просмотры, устройства и географию —
  // остаётся эфирная сводка и социальные сети.
  const { isViewer } = useAuth()
  // Ручной правки в Total нет: показываем сохранённое раньше или демо.
  const [data] = useState(() => loadStats('total', TOTAL_SEED))
  const metrics = TOTAL_METRICS.filter(
    (metric) => !(isViewer && metric.viewer === false),
  )

  const devices = data.devices.map((item) => ({
    ...item,
    value: statNumber(item.value),
  }))
  const topDevice = devices.reduce(
    (top, item) => (!top || item.value > top.value ? item : top),
    null,
  )

  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl border border-indigo-200 bg-linear-to-br from-surface via-[#fffdf5] to-indigo-100 p-5 shadow-lift sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full border border-indigo-300/60" />
        <div className="pointer-events-none absolute right-32 top-0 h-32 w-32 rounded-full bg-indigo-200/50 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <ReportHeader
            eyebrow="Total statistics"
            title={title}
            subtitle={
              !showMetrics
                ? 'Социальные сети, устройства и география аудитории.'
                : isViewer
                  ? 'Сводка эфира и социальных сетей.'
                  : 'Сводка эфира, социальных сетей, устройств и географии аудитории.'
            }
          />
        </div>
        {!showMetrics ? null : summary ? (
          <div
            className={cn(
              'relative mt-6 grid grid-cols-2 gap-3',
              isViewer ? 'lg:grid-cols-3' : 'lg:grid-cols-4',
            )}
          >
            {metrics.map((metric) => (
              <TotalMetric
                key={metric.key}
                metric={metric}
                value={summary.totals[metric.key]}
              />
            ))}
          </div>
        ) : (
          <SummaryEmpty loading={loading} />
        )}
        {showMetrics && summary?.manual && (
          <p className="relative mt-2 text-[11px] text-ink-muted">
            Отчёт за месяц введён вручную на вкладке Spot: числа прямых эфиров и
            соцсетей в нём нет.
          </p>
        )}
        {showMetrics && summary?.unknownDuration > 0 && (
          <p className="relative mt-2 text-[11px] text-danger">
            В хронометраж не вошли ролики Standard spot без длительности в
            названии: {formatNumber(summary.unknownDuration)}.
          </p>
        )}
      </section>

      <div
        className={cn(
          'mt-4 grid gap-4',
          !isViewer && 'xl:grid-cols-[0.72fr_0.95fr_1.1fr]',
        )}
      >
        <Card className="p-5">
          <h4 className="font-display text-base font-semibold text-ink">
            Социальные сети
          </h4>
          <p className="text-[12px] text-ink-muted">Instagram и Telegram</p>
          {/* У наблюдателя карточка одна на всю ширину — раскладываем каналы
              в две колонки, чтобы не тянуть их в высоту. */}
          <div
            className={cn(
              'mt-4',
              isViewer ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3',
            )}
          >
            {summary?.social ? (
              SOCIAL_CHANNELS.map((channel) => {
                const Icon = channel.icon
                const stats = summary.social[channel.id]
                return (
                  <div
                    key={channel.id}
                    className="rounded-2xl border border-line bg-paper/40 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: channel.color }}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="font-display text-sm font-semibold text-ink">
                        {channel.name}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-ink-muted">
                          Posts
                        </p>
                        <StatValue
                          value={stats.posts}
                          className="mt-1 text-lg"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-ink-muted">
                          Impressions
                        </p>
                        <StatValue
                          value={stats.impressions}
                          className="mt-1 text-lg"
                        />
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="rounded-2xl bg-paper/60 px-3 py-4 text-center text-[12px] text-ink-muted">
                {summary?.manual
                  ? 'В ручном отчёте соцсетей нет.'
                  : 'Появятся из листа соцсетей в отчёте за месяц.'}
              </p>
            )}
          </div>
        </Card>

        {!isViewer && (
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-display text-base font-semibold text-ink">
                  Распределение устройств
                </h4>
                <p className="text-[12px] text-ink-muted">Device share</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900">
                <MonitorSmartphone size={18} />
              </span>
            </div>
            <div className="mt-5 flex flex-col items-center gap-5">
              <DonutChart
                data={devices}
                size={190}
                thickness={22}
                centerValue={formatPct(topDevice?.value ?? 0, 0)}
                centerLabel={topDevice?.label ?? ''}
              />
              <div className="w-full space-y-2">
                {data.devices.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-ink-soft">{item.label}</span>
                    <span className="ml-auto font-semibold text-ink tnum">
                      {formatPct(statNumber(item.value), 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {!isViewer && (
          <Card className="overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-line p-5 pb-4">
              <div>
                <h4 className="font-display text-base font-semibold text-ink">
                  География аудитории
                </h4>
                <p className="text-[12px] text-ink-muted">City viewers</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900">
                <MapPin size={18} />
              </span>
            </div>
            <div className="max-h-[470px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-paper/95 backdrop-blur-sm">
                  <tr className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                    <th className="w-10 py-2.5 pl-5 text-left">№</th>
                    <th className="py-2.5 pl-2.5 pr-5 text-left">Город</th>
                    <th className="px-5 py-2.5 text-right">Зрители</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.cities.map((city, index) => (
                    <tr
                      key={`${city.name}-${index}`}
                      className="hover:bg-ink/1.5"
                    >
                      <td className="py-2.5 pl-5 text-[12px] text-ink-muted tnum">
                        {index + 1}
                      </td>
                      <td className="py-2.5 pl-2.5 pr-5 font-medium text-ink-soft">
                        {city.name}
                      </td>
                      <td className="relative px-5 py-2.5 text-right">
                        <span
                          className="absolute inset-y-1.5 right-3 rounded-md bg-indigo-100"
                          style={{
                            width: `${Math.max(statNumber(city.value), 4)}%`,
                          }}
                        />
                        <span className="relative font-semibold text-ink tnum">
                          {formatPct(statNumber(city.value), 2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
