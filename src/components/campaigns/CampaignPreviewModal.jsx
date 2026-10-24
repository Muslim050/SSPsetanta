import { useEffect, useState } from 'react'
import {
  Archive,
  Banknote,
  BarChart3,
  CircleCheck,
  Clock,
  Download,
  Eye,
  Inbox,
  Play,
  Send,
  CalendarDays,
  CalendarRange,
  ExternalLink,
  Gauge,
  FileText,
  Film,
  FolderOpen,
  Package,
  Trophy,
} from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import {
  PACKAGES,
  STATUS,
  leagueLabel,
  statusLabel,
  timeProgress,
} from '@/lib/metrics.js'
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatMoneyCompact,
  formatPct,
  paidAtOf,
} from '@/lib/format.js'
import { Modal } from '@/components/ui/Modal.jsx'
import { Tooltip } from '@/components/ui/Tooltip.jsx'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress.jsx'
import { downloadFile, fileHref } from '@/features/files/download'
import { cn } from '@/lib/cn.js'
import { advertiserLogo } from '@/features/advertisers/logo'

// Оформление статусов кампании: цвет пилюли и иконка вместо точки — по
// форме статус читается и без цвета. `icon` — цвет иконки на светлой
// пилюле; у залитых (ждём оплату, оплачен) иконка берёт цвет текста.
const STATUS_UI = {
  sent: {
    Icon: Send,
    shell: 'border-sky-200 bg-sky-50/80 text-sky-700',
    icon: 'text-sky-500',
    value: 'border-sky-200 bg-surface text-sky-700',
  },
  received: {
    Icon: Inbox,
    shell: 'border-violet-200 bg-violet-50/80 text-violet-700',
    icon: 'text-violet-500',
    value: 'border-violet-200 bg-surface text-violet-700',
  },
  reviewing: {
    Icon: Eye,
    shell: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    icon: 'text-yellow-500',
    value: 'border-yellow-200 bg-surface text-yellow-700',
  },
  active: {
    Icon: Play,
    shell: 'border-emerald-200 bg-emerald-50/80 text-emerald-700',
    icon: 'text-emerald-500',
    value: 'border-emerald-200 bg-surface text-emerald-700',
  },
  // Завершена — нормальный исход, не ошибка: нейтральный серый.
  completed: {
    Icon: CircleCheck,
    shell: 'border-line bg-ink/5 text-ink-soft',
    icon: 'text-ink-muted',
    value: 'border-line bg-surface text-ink-soft',
  },
  // Ждём оплату — заливка красная, текст светлый.
  awaiting_payment: {
    Icon: Clock,
    shell: 'border-red-500 bg-red-500 text-red-50',
    icon: 'text-current',
    value: 'border-red-300/60 bg-red-400/40 text-red-50',
  },
  paid: {
    Icon: Banknote,
    shell: 'border-emerald-500 bg-emerald-500 text-emerald-50',
    icon: 'text-current',
    value: 'border-emerald-300/60 bg-emerald-400/40 text-emerald-50',
  },
  archived: {
    Icon: Archive,
    shell: 'border-line bg-ink/5 text-ink-soft',
    icon: 'text-ink-muted',
    value: 'border-line bg-surface text-ink-soft',
  },
}

/** Иконка статуса кампании — та же, что в пилюле; для списков и меню. */
export function CampaignStatusIcon({ status, size = 14, className }) {
  const ui = STATUS_UI[status] || STATUS_UI.completed
  return (
    <ui.Icon
      size={size}
      aria-hidden="true"
      className={cn('shrink-0', ui.icon, className)}
    />
  )
}

export function CampaignStatusPill({ status, pacing, createdAt }) {
  const ui = STATUS_UI[status] || STATUS_UI.completed
  const percent = Math.min(100, Math.max(0, Math.round(pacing)))
  const label = STATUS[status] ? statusLabel(status) : STATUS.active.label

  // Пока заявку не взяли в работу — по наведению показываем время отправки.
  const sentAt =
    (status === 'sent' || status === 'received') && createdAt
      ? `Отправлено: ${formatDateTime(createdAt)}`
      : null

  // Ожидание оплаты подсвечиваем пульсацией — на неё нужно среагировать.
  const awaiting = status === 'awaiting_payment'

  return (
    <Tooltip label={sentAt} className="max-w-full">
      <span
        className={cn(
          'inline-flex max-w-full items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[12px] font-semibold',
          ui.shell,
          awaiting && 'animate-pulse',
        )}
      >
        <CampaignStatusIcon status={status} />
        <span className="truncate">{label}</span>
        {status === 'active' && (
          <span
            className={`shrink-0 rounded-lg border px-1.5 py-0.5 text-[11px] font-bold leading-none tnum ${ui.value}`}
          >
            {percent}%
          </span>
        )}
      </span>
    </Tooltip>
  )
}

/** Внутренности плитки ролика — одни и те же у ссылки и у кнопки. */
function CreativeBody({ addedAt }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
          Ролик
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-900 transition-transform group-hover:scale-105">
          <Film size={16} />
        </span>
      </div>
      <p className="mt-3 flex items-center gap-1.5 font-display text-xl font-semibold text-ink">
        Смотреть
        <ExternalLink size={15} className="text-ink-muted" />
      </p>
      {/* Когда ролик загрузили — видно прямо в карточке кампании. */}
      {addedAt && (
        <p className="mt-1 text-[11px] text-ink-muted tnum">
          Добавлен {formatDateTime(addedAt)}
        </p>
      )}
    </>
  )
}

/**
 * Мок: ролики заявок, которые ещё не загрузили на сервер, — лежат в
 * `public/creatives`. Только для показа в карточке: в форму и на сервер они
 * не попадают. Адрес абсолютный от своего origin — иначе `fileHref` при
 * `VITE_API_URL` отправил бы его на бэкенд. Свой ролик у заявки появился —
 * мок больше не показывается.
 */
const MOCK_CREATIVES = {
  // Artel, «Октябрь — Ноябрь 2026».
  192: '/creatives/artel-192-15sec.mp4',
}

const mockCreative = (campaignId) =>
  MOCK_CREATIVES[campaignId]
    ? {
        url: new URL(MOCK_CREATIVES[campaignId], window.location.origin).href,
        addedAt: null,
      }
    : null

/**
 * Плитка ролика — по клику видео открывается в новой вкладке. Ролик нашего
 * хранилища и ролик по внешней ссылке открываются одинаково: файл отдаётся
 * по слагу без авторизации.
 */
export function CreativeTile({ url, addedAt }) {
  if (!url) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
            Ролик
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink/6 text-ink-muted">
            <Film size={16} />
          </span>
        </div>
        <p className="mt-3 text-[13px] text-ink-muted">Не добавлен</p>
      </div>
    )
  }

  const shell =
    'group rounded-2xl border border-line bg-paper/55 p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-ring'

  return (
    <a
      href={fileHref(url)}
      target="_blank"
      rel="noreferrer"
      title="Открыть ролик в новой вкладке"
      className={shell}
    >
      <CreativeBody addedAt={addedAt} />
    </a>
  )
}

/** Плитка-кнопка: по клику скачивает файл договора. */
function ContractTileDownload({ file, children }) {
  return (
    <button
      type="button"
      onClick={() => downloadFile(file)}
      title={file.name}
      className="group rounded-2xl border border-line bg-paper/55 p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-ring"
    >
      {children}
    </button>
  )
}

/**
 * Плитка договора — тот же формат, что у метрик, но текст поменьше.
 * file — скан договора: тогда плитка становится кнопкой скачивания.
 */
export function ContractTile({ icon: Icon, label, value, empty, file }) {
  // Значения нет — плитку всё равно показываем: сетка не должна разъезжаться
  // из-за незаполненного поля. Заглушку рисуем приглушённой.
  const missing = !value
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
          {label}
        </span>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            missing
              ? 'bg-ink/6 text-ink-muted'
              : 'bg-indigo-100 text-indigo-900',
            file && 'transition-transform group-hover:scale-105',
          )}
        >
          <Icon size={16} />
        </span>
      </div>
      <p
        className={cn(
          'mt-3 wrap-break-word text-[15px] font-semibold leading-snug',
          missing ? 'text-ink-muted' : 'text-ink',
        )}
      >
        {value || empty || 'Не указано'}
      </p>
      {file && (
        <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-indigo-800">
          <Download size={13} className="shrink-0" />
          Скачать договор
        </p>
      )}
    </>
  )

  if (file) {
    // Скачивание на сервере закрыто токеном, поэтому не ссылка, а кнопка:
    // файл тянем транспортом и отдаём браузеру блобом.
    return <ContractTileDownload file={file}>{body}</ContractTileDownload>
  }

  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        missing ? 'border-dashed border-line' : 'border-line bg-paper/55',
      )}
    >
      {body}
    </div>
  )
}

/**
 * Плитки с условиями договора — встают в общую сетку карточки. Юр. лицо и
 * сроки оплаты сюда не выносим: это внутренняя кухня, её место в карточке
 * договора.
 *
 * Условия кампания хранит снимком на момент создания. Сервер его заполняет
 * (docs/backend.md, п. 3.13), но у записей, заведённых до этого, снимок
 * пустой — там поле добираем из договора.
 */
function ContractTiles({ campaign, contract }) {
  // Скан у кампании не хранится — он общий, из карточки договора.
  const contractFile = contract?.file ?? null
  const packageKey = campaign.package || contract?.package
  const leagues = campaign.leagues?.length
    ? campaign.leagues
    : contract?.leagues
  const contractStart = campaign.contractStart || contract?.start
  const contractEnd = campaign.contractEnd || contract?.end

  const tiles = [
    {
      label: 'Пакет',
      icon: Package,
      value: PACKAGES[packageKey]?.label,
      empty: 'Не выбран',
    },
    {
      label: 'Лиги',
      icon: Trophy,
      value: leagues?.length ? leagues.map(leagueLabel).join(', ') : null,
      empty: 'Не выбраны',
    },
    {
      label: 'Номер договора',
      icon: FileText,
      value: campaign.contractNumber,
      empty: 'Нет договора',
      // Есть скан — по клику скачивается прямо отсюда.
      file: contractFile,
    },
    {
      label: 'Срок договора',
      icon: CalendarRange,
      value:
        contractStart && contractEnd
          ? `${formatDate(contractStart)} — ${formatDate(contractEnd)}`
          : null,
      empty: 'Не указан',
    },
  ]

  return (
    <>
      {tiles.map((tile) => (
        <ContractTile key={tile.label} {...tile} />
      ))}
    </>
  )
}

export function CampaignPreviewModal({
  campaign,
  advertiser,
  onClose,
  onOpenStats,
}) {
  const { isAdvertiser } = useAuth()
  const [showPayments, setShowPayments] = useState(false)

  // Договор кампании: из него берутся деньги, поступления и всё, чего нет
  // в снимке условий самой кампании.
  const contract = (advertiser?.contracts ?? []).find(
    (c) => c.number === campaign?.contractNumber,
  )
  // Поступления ведутся по договору, у кампании их нет.
  const payments = contract?.payments ?? campaign?.payments ?? []
  // Деньги ведутся по договору, а не по кампании. Суммы приходят
  // decimal-строками — в расчётах они нужны числами.
  const budget = Number(contract?.budget) || 0
  const spent = Number(contract?.spent) || 0
  const pacing = budget ? (spent / budget) * 100 : 0
  // Ролик у кампании свой, но чаще он один на договор — тогда показываем его.
  // Свой ролик приходит файлом (`creative`), у записей постарше — ссылкой.
  const creative =
    campaign?.creative ??
    (campaign?.creativeUrl
      ? { url: campaign.creativeUrl, addedAt: campaign.creativeAddedAt }
      : null) ??
    mockCreative(campaign?.id) ??
    contract?.creative ??
    null
  const creativeUrl = creative?.url ?? ''
  const creativeAddedAt = creative?.addedAt ?? null

  // Открыли другую кампанию — историю снова прячем.
  useEffect(() => {
    setShowPayments(false)
  }, [campaign?.id])

  return (
    <Modal
      open={!!campaign}
      onClose={onClose}
      icon={FolderOpen}
      logo={advertiserLogo(advertiser)}
      title={campaign?.name || 'Кампания'}
      description={advertiser?.name || 'Карточка кампании'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Закрыть
          </Button>
          {/* Статистика есть только у запущенных и завершённых кампаний. */}
          {(campaign?.status === 'active' ||
            campaign?.status === 'completed' ||
            campaign?.status === 'awaiting_payment') && (
            <Button variant="primary" onClick={onOpenStats}>
              <BarChart3 size={16} />
              Открыть статистику
            </Button>
          )}
        </>
      }
    >
      {campaign && (
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-linear-to-br from-surface via-indigo-50 to-indigo-100 p-5">
            <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full border border-indigo-300/60" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-900">
                  Карточка кампании
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
                  <CalendarDays size={16} className="text-indigo-800" />
                  {formatDate(campaign.startDate)} —{' '}
                  {formatDate(campaign.endDate)}
                </div>
              </div>
              <CampaignStatusPill
                status={campaign.status}
                pacing={timeProgress(campaign)}
                createdAt={campaign.createdAt}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <CreativeTile url={creativeUrl} addedAt={creativeAddedAt} />
            <ContractTiles campaign={campaign} contract={contract} />

            {/* Плитка оплаты: по клику раскрывается история выплат. */}
            <button
              type="button"
              onClick={() => setShowPayments((v) => !v)}
              title="История выплат"
              className="group rounded-2xl border border-line bg-paper/55 p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-ring"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                  {isAdvertiser ? 'Бюджет / Оплачено' : 'Освоение бюджета'}
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-900 transition-transform group-hover:scale-105">
                  <Gauge size={16} />
                </span>
              </div>
              <p className="mt-3 flex items-baseline gap-1.5 text-[15px] font-semibold text-ink tnum">
                {formatMoneyCompact(spent)}
                <span className="text-[12px] font-medium text-ink-muted">
                  из {formatMoneyCompact(budget)}
                </span>
              </p>
              <Progress
                value={pacing}
                label={formatPct(pacing, 0)}
                className="mt-2"
              />
            </button>
          </div>

          {showPayments && (
            <div className="mt-3 rounded-2xl border border-line bg-paper/55 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                История выплат
              </p>
              <div className="mt-3 max-h-[220px] space-y-1.5 overflow-y-auto">
                {payments.length === 0 ? (
                  <p className="rounded-xl bg-surface px-3 py-3 text-center text-[12px] text-ink-muted">
                    Поступлений пока не было.
                  </p>
                ) : (
                  payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2"
                    >
                      <span className="text-[12px] text-ink-muted tnum">
                        {formatDateTime(paidAtOf(payment))}
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold text-emerald-700 tnum">
                        + {formatMoney(payment.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
