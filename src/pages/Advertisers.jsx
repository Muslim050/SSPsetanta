import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Pencil,
  Plus,
  Trash2,
  Building2,
  Mail,
  Check,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import {
  useAdvertisers,
  useDeleteAdvertiser,
  useUpdateAdvertiserStatus,
} from '@/features/advertisers/queries'
import { useToast } from '@/components/ui/Toast.jsx'
import { useConfirm } from '@/components/ui/Confirm.jsx'
import { ADV_STATUS } from '@/lib/metrics.js'
import { Card } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge.jsx'
import { Avatar } from '@/components/ui/Avatar.jsx'
import { EmptyState } from '@/components/ui/EmptyState.jsx'
import { Loader } from '@/components/ui/Loader.jsx'
import { FadeIn } from '@/components/ui/FadeIn.jsx'
import { DropdownMenu } from '@/components/ui/DropdownMenu.jsx'
import { AnchoredPopover } from '@/components/ui/AnchoredPopover.jsx'
import { AdvertiserForm } from '@/components/forms/AdvertiserForm.jsx'
import { SegmentTabs } from '@/components/ui/Tabs.jsx'
import Users from '@/pages/Users.jsx'
import Presence from '@/pages/Presence.jsx'
import { cn } from '@/lib/cn.js'
import { advertiserLogo } from '@/features/advertisers/logo'

export default function Advertisers() {
  const { canEdit, isAdmin, isViewer } = useAuth()
  // Пользователей ведёт только площадка — наблюдателю вкладка не нужна.
  const canManageUsers = isAdmin && !isViewer
  const [tab, setTab] = useState('advertisers')
  const { data, isPending, isError, error, refetch } = useAdvertisers()
  const { mutate: deleteAdvertiser } = useDeleteAdvertiser()
  const { mutate: updateStatus } = useUpdateAdvertiserStatus()
  const toast = useToast()
  const confirm = useConfirm()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState({ open: false, initial: null })

  const advertisers = data ?? []
  const filtered = advertisers.filter((a) =>
    `${a.name} ${a.contact} ${a.category}`
      .toLowerCase()
      .includes(q.trim().toLowerCase()),
  )

  /** Статус бренда меняется прямо в карточке, без формы. */
  const setStatus = (advertiser, status) => {
    if (status === advertiser.status) return
    updateStatus(
      { id: advertiser.id, status },
      {
        onSuccess: () =>
          toast.success(
            `${advertiser.name} — ${ADV_STATUS[status].label.toLowerCase()}`,
          ),
        onError: (err) =>
          toast.error(err.message || 'Не удалось изменить статус бренда'),
      },
    )
  }

  const del = async (a) => {
    const ok = await confirm({
      title: 'Удалить рекламодателя?',
      description: a.name,
      body: 'Вместе с брендом удалятся его договоры. Действие нельзя отменить.',
    })
    if (!ok) return

    deleteAdvertiser(a.id, {
      onSuccess: () => toast.info('Рекламодатель удалён'),
      onError: (err) =>
        toast.error(err.message || 'Не удалось удалить рекламодателя'),
    })
  }

  // Разделы соседние: бренды, те, кто от них ходит в платформу, и кто
  // из них сидит в ней прямо сейчас.
  const tabs = canManageUsers ? (
    <SegmentTabs
      className="mb-5"
      value={tab}
      onChange={setTab}
      items={[
        { value: 'advertisers', label: 'Рекламодатели' },
        { value: 'users', label: 'Пользователи' },
        { value: 'online', label: 'Кто в сети' },
      ]}
    />
  ) : null

  if (tab === 'users' && canManageUsers) return <Users tabs={tabs} />
  if (tab === 'online' && canManageUsers) return <Presence tabs={tabs} />

  // Пока брендов нет, показываем только ожидание: панель с поиском и
  // пустыми вкладками рядом с лоадером выглядит недособранной.
  if (isPending) return <Loader label="Загружаем рекламодателей…" />

  return (
    <FadeIn>
      {/* Поиск и создание бренда — одной строкой */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Поиск бренда"
            placeholder="Поиск бренда…"
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-muted focus-ring focus-visible:border-indigo-300"
          />
        </div>
        {canEdit && (
          <Button
            variant="primary"
            className="shrink-0"
            onClick={() => setModal({ open: true, initial: null })}
          >
            <Plus size={18} />
            Новый рекламодатель
          </Button>
        )}
      </div>

      {tabs}

      {isError ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="Не удалось загрузить рекламодателей"
            description={error?.message ?? 'Попробуйте ещё раз.'}
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Повторить
              </Button>
            }
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="Рекламодателей нет"
            description="Список рекламодателей пока пуст."
            action={
              canEdit ? (
                <Button
                  variant="secondary"
                  onClick={() => setModal({ open: true, initial: null })}
                >
                  <Plus size={16} />
                  Добавить
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a, i) => {
            const st = ADV_STATUS[a.status]
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
              >
                <Card hover className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex min-w-0 gap-3">
                      <Avatar
                        name={a.name}
                        color={a.color}
                        src={advertiserLogo(a)}
                        size="lg"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-display text-[15px] font-semibold text-ink">
                          {a.name}
                        </p>
                        <p className="truncate text-[12px] text-ink-muted">
                          {a.legalName || a.category}
                        </p>
                      </div>
                    </div>
                    {canEdit && (
                      <DropdownMenu
                        items={[
                          {
                            label: 'Изменить',
                            icon: Pencil,
                            onClick: () => setModal({ open: true, initial: a }),
                          },
                          {
                            label: 'Удалить',
                            icon: Trash2,
                            tone: 'danger',
                            onClick: () => del(a),
                          },
                        ]}
                      />
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {canEdit ? (
                      <StatusMenu
                        value={a.status}
                        brand={a.name}
                        onPick={(next) => setStatus(a, next)}
                      />
                    ) : (
                      <Badge tone={st.tone} dot>
                        {st.label}
                      </Badge>
                    )}
                    <span className="flex min-w-0 items-center gap-1 text-[12px] text-ink-muted">
                      <Mail size={12} />
                      <span className="truncate">{a.email}</span>
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
                    <Metric
                      label="Договоров"
                      value={a.contracts?.length ?? 0}
                    />
                    <Metric label="Кампаний" value={a.campaignsCount ?? 0} />
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <AdvertiserForm
        open={modal.open}
        initial={modal.initial}
        onClose={() => setModal({ open: false, initial: null })}
      />
    </FadeIn>
  )
}

// Точка статуса в меню — тон тот же, что у бейджа.
const STATUS_DOTS = {
  success: 'bg-success',
  danger: 'bg-danger',
  muted: 'bg-ink-muted',
}

/**
 * Бейдж статуса, который по клику превращается в выбор значения. Меню —
 * AnchoredPopover: карточка его не обрежет, у края экрана оно откроется вверх.
 */
function StatusMenu({ value, brand, onPick }) {
  // Бейдж, от которого открыто меню; null — меню закрыто.
  const [anchorEl, setAnchorEl] = useState(null)
  const current = ADV_STATUS[value] ?? ADV_STATUS.active

  return (
    <span className="shrink-0">
      <button
        type="button"
        onClick={(e) => setAnchorEl(anchorEl ? null : e.currentTarget)}
        title={`Статус бренда ${brand}`}
        aria-label={`Изменить статус бренда ${brand}`}
        aria-expanded={!!anchorEl}
        className="focus-ring rounded-full"
      >
        <Badge tone={current.tone} dot className="cursor-pointer pr-2">
          {current.label}
          <ChevronDown size={12} className="shrink-0 opacity-70" />
        </Badge>
      </button>

      {anchorEl && (
        <AnchoredPopover
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          width={176}
        >
          {Object.entries(ADV_STATUS).map(([key, meta]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setAnchorEl(null)
                onPick(key)
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                key === value
                  ? 'bg-ink/5 text-ink'
                  : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  STATUS_DOTS[meta.tone],
                )}
              />
              {meta.label}
              {key === value && (
                <Check size={14} className="ml-auto shrink-0" />
              )}
            </button>
          ))}
        </AnchoredPopover>
      )}
    </span>
  )
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-ink-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink tnum">{value}</p>
    </div>
  )
}
