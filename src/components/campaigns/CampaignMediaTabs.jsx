import { Fragment, useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, X } from 'lucide-react'
import { uid } from '@/lib/id.js'
import { cn } from '@/lib/cn.js'
import { useHorizontalScroll } from '@/lib/useHorizontalScroll.js'
import { useAuth } from '@/features/auth/useAuth'
import { useConfirm } from '@/components/ui/Confirm.jsx'
import { useToast } from '@/components/ui/Toast.jsx'
import { AnchoredPopover } from '@/components/ui/AnchoredPopover.jsx'

// Категории и каналы, которые завёл пользователь: свой набор у каждого договора.
const TABS_STORAGE_KEY = 'setanta.campaign.custom-tabs.v2'

// Постоянные вкладки: сводки по отчёту. Всё остальное собирается руками.
const CAMPAIGN_TABS = [
  { value: 'stats', label: 'Total', group: 'Statistic' },
  { value: 'channels', label: 'Spot', group: 'Statistic' },
]

/**
 * Категории, которые добавляют руками: { name, kind, hint, channels }.
 * Сейчас их нет — эфиры, логи выходов, промо, соцсети и OTT приходят листами
 * из загруженного файла, их вкладки постоянные (см. MediaReport). Пока список
 * пуст, кнопка «Добавить категорию» не показывается, а сохранённые раньше
 * категории (OTT из браузера) отбрасываются при чтении.
 */
export const CATEGORY_PRESETS = []

/** Категория с её каналами — из пресета по названию. */
function categoryFromPreset(name, categoryId) {
  const preset = CATEGORY_PRESETS.find((item) => item.name === name)
  if (!preset) return null
  return {
    category: { id: categoryId, name: preset.name },
    channels: preset.channels.map((channel) => ({
      id: channel.id,
      categoryId,
      label: channel.label,
      kind: channel.kind ?? preset.kind,
    })),
  }
}

const emptyScope = () => ({ categories: [], channels: [] })

/**
 * Состав вкладок договора из браузера. Категории, которые теперь приходят
 * из файла отчёта, выбрасываем: иначе рядом с настоящими листами встали бы
 * их старые копии.
 */
function loadCustomTabs(scopeId) {
  try {
    const saved = JSON.parse(localStorage.getItem(TABS_STORAGE_KEY) || '{}')
    const scope = saved[scopeId]
    if (!scope) return emptyScope()
    const categories = (
      Array.isArray(scope.categories) ? scope.categories : []
    ).filter((category) =>
      CATEGORY_PRESETS.some((preset) => preset.name === category.name),
    )
    const kept = new Set(categories.map((category) => category.id))
    const channels = (
      Array.isArray(scope.channels) ? scope.channels : []
    ).filter((channel) => kept.has(channel.categoryId))
    return { categories, channels }
  } catch {
    return emptyScope()
  }
}

function saveCustomTabs(scopeId, scope) {
  try {
    const saved = JSON.parse(localStorage.getItem(TABS_STORAGE_KEY) || '{}')
    localStorage.setItem(
      TABS_STORAGE_KEY,
      JSON.stringify({ ...saved, [scopeId]: scope }),
    )
  } catch {
    // Переполнилось хранилище — состав вкладок останется до перезагрузки.
  }
}

/**
 * Состав вкладок отчёта: постоянные сводки, листы из файла (`fixedGroups`)
 * и категории, которые завёл пользователь. Набор свой у каждого договора.
 *
 * groups: [{ name, id?, items: [tab] }] — в том числе пустые категории.
 * tabs: плоский список вкладок, чтобы найти открытую.
 */
export function useCampaignTabs(scopeId = 'default', fixedGroups = []) {
  const [scope, setScope] = useState(() => loadCustomTabs(scopeId))

  // Сменили договор — подтягиваем его набор вкладок.
  useEffect(() => {
    setScope(loadCustomTabs(scopeId))
  }, [scopeId])

  const update = (next) => {
    setScope(next)
    saveCustomTabs(scopeId, next)
  }

  const addCategory = (name) => {
    const built = categoryFromPreset(name, uid('cat'))
    if (!built) return null
    update({
      categories: [...scope.categories, built.category],
      channels: [...scope.channels, ...built.channels],
    })
    return { ...built.category, channels: built.channels }
  }

  const removeCategory = (categoryId) =>
    update({
      categories: scope.categories.filter((c) => c.id !== categoryId),
      channels: scope.channels.filter((c) => c.categoryId !== categoryId),
    })

  const customGroups = scope.categories.map((category) => ({
    id: category.id,
    name: category.name,
    items: scope.channels
      .filter((channel) => channel.categoryId === category.id)
      .map((channel) => ({
        value: channel.id,
        label: channel.label,
        kind: channel.kind,
        group: category.name,
        categoryId: category.id,
        custom: true,
      })),
  }))

  const groups = [
    { name: 'Statistic', items: CAMPAIGN_TABS },
    ...fixedGroups,
    ...customGroups,
  ]

  return {
    groups,
    categories: scope.categories,
    tabs: groups.flatMap((group) => group.items),
    addCategory,
    removeCategory,
  }
}

export function CampaignTabs({
  value,
  onChange,
  groups = [],
  onAddCategory,
  onRemoveCategory,
}) {
  const { canEdit, isAdvertiser } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  // Лента вкладок: колесо мыши крутит её вбок, выбранная вкладка сама
  // подматывается в видимую часть.
  const {
    ref: stripRef,
    canLeft,
    canRight,
    scrollBy,
  } = useHorizontalScroll(value)
  // Собирать отчёт может только площадка — и только если есть что добавить.
  const canAdd =
    Boolean(onAddCategory) &&
    canEdit &&
    !isAdvertiser &&
    CATEGORY_PRESETS.length > 0
  // Крестики у категорий показываем только в режиме правки — по карандашу.
  const [editing, setEditing] = useState(false)

  const removeCategory = async (group) => {
    const ok = await confirm({
      title: 'Убрать категорию?',
      description: group.name,
      body: 'Вкладки категории исчезнут из отчёта. Загруженные таблицы останутся и вернутся, если добавить категорию снова.',
    })
    if (!ok) return
    onRemoveCategory(group.id)
    toast.info(`Категория «${group.name}» убрана из отчёта`)
  }

  // Убрали последнюю категорию — из режима правки выходим сами.
  useEffect(() => {
    if (editing && !groups.some((group) => group.id)) setEditing(false)
  }, [editing, groups])
  // Кнопка «+», от которой открыто меню; null — меню закрыто. Меню —
  // AnchoredPopover: лента прокручивается, а он держится за кнопку.
  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)
  const close = () => setAnchorEl(null)

  // Категории, которых ещё нет в отчёте.
  const freePresets = CATEGORY_PRESETS.filter(
    (preset) => !groups.some((group) => group.name === preset.name),
  )

  const renderTab = (tab) => (
    <button
      key={tab.value}
      type="button"
      data-active={value === tab.value}
      onClick={() => onChange(tab.value)}
      className={cn(
        'rounded-xl px-4 h-[29px] text-[13px] font-medium transition-colors focus-ring',
        value === tab.value
          ? 'bg-indigo-500 text-ink shadow-soft'
          : 'text-ink-muted hover:bg-paper hover:text-ink',
      )}
    >
      {tab.label}
    </button>
  )

  const hasCustom = groups.some((group) => group.id)

  const actionButtons = (
    <div className="flex shrink-0 items-center gap-1.5">
      <div>
        <button
          type="button"
          onClick={(e) => setAnchorEl(open ? null : e.currentTarget)}
          aria-label="Добавить категорию"
          aria-expanded={open}
          title="Добавить категорию"
          className={cn(
            'flex h-[45px] w-[45px] items-center justify-center rounded-xl bg-indigo-500 text-ink shadow-soft transition-all hover:bg-indigo-400 hover:shadow-pop active:scale-[0.97] focus-ring',
            open && 'bg-indigo-400 shadow-pop',
          )}
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Карандаш включает правку: у категорий появляются крестики. */}
      {hasCustom && (
        <button
          type="button"
          onClick={() => setEditing((on) => !on)}
          aria-pressed={editing}
          aria-label={editing ? 'Выйти из режима правки' : 'Править категории'}
          title={editing ? 'Готово' : 'Править категории'}
          className={cn(
            'flex h-[45px] w-[45px] items-center justify-center rounded-xl border transition-colors focus-ring',
            editing
              ? 'border-ink bg-ink text-paper'
              : 'border-line bg-surface text-ink-soft hover:border-indigo-300 hover:text-ink',
          )}
        >
          {editing ? <Check size={18} /> : <Pencil size={16} />}
        </button>
      )}
    </div>
  )

  const addMenu = open && (
    <AnchoredPopover
      anchorEl={anchorEl}
      onClose={close}
      width={288}
      className="rounded-2xl p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Добавить категорию
        </p>
        <button
          type="button"
          onClick={close}
          aria-label="Закрыть"
          className="shrink-0 rounded-lg p-1 text-ink-muted transition-colors hover:bg-ink/6 hover:text-ink focus-ring"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid gap-1.5">
        {freePresets.length ? (
          freePresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                close()
                onAddCategory(preset.name)
              }}
              className="rounded-xl border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-ring"
            >
              <span className="block text-[13px] font-medium text-ink">
                {preset.name}
              </span>
              <span className="block text-[11px] text-ink-muted">
                {preset.hint}
              </span>
            </button>
          ))
        ) : (
          <p className="rounded-xl bg-paper/70 px-3 py-3 text-center text-[12px] text-ink-muted">
            Все категории уже добавлены.
          </p>
        )}
      </div>
    </AnchoredPopover>
  )

  return (
    // Лента крутится колесом прямо над блоками и стрелками по краям:
    // полосой снизу дотягиваться до дальних категорий неудобно.
    <div className="relative mb-4">
      {canLeft && <ScrollArrow side="left" onClick={() => scrollBy(-1)} />}
      {canRight && <ScrollArrow side="right" onClick={() => scrollBy(1)} />}
      <div
        ref={stripRef}
        className="no-scrollbar overflow-x-auto overscroll-x-contain rounded-2xl border border-line bg-surface p-1.5 shadow-soft"
      >
        <div className="flex min-w-max items-center gap-1.5">
          {groups.map((group, index) => {
            // Группа с открытой вкладкой подсвечивается целиком — сразу видно,
            // в каком блоке находишься.
            const opened = group.items.some((tab) => tab.value === value)
            return (
              <Fragment key={group.id ?? group.name}>
                <div
                  className={cn(
                    'flex items-center gap-1.5 rounded-xl border p-2 transition-colors',
                    opened
                      ? 'border-indigo-500 bg-indigo-50 shadow-[0_0_0_3px_rgba(255,209,6,0.28)]'
                      : 'border-ink/15 bg-paper',
                  )}
                >
                  {/* Название категории — тёмной плашкой: активная вкладка
                    жёлтая, поэтому группу метим контрастом, а не цветом. */}
                  <span className="whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-paper">
                    {group.name}
                  </span>
                  {group.items.map(renderTab)}
                  {/* В режиме правки свои категории можно убрать —
                    постоянная Statistic остаётся. */}
                  {canAdd && editing && group.id && (
                    <button
                      type="button"
                      onClick={() => removeCategory(group)}
                      aria-label={`Убрать категорию ${group.name}`}
                      title="Убрать категорию"
                      className="ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger transition-colors hover:bg-danger hover:text-white focus-ring"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {canAdd && index === 0 && actionButtons}
              </Fragment>
            )
          })}
        </div>
      </div>
      {addMenu}
    </div>
  )
}

/**
 * Стрелка у края ленты: листает её на экран. Под стрелкой — растушёвка,
 * чтобы было видно, что за краем есть продолжение.
 */
function ScrollArrow({ side, onClick }) {
  const left = side === 'left'
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-y-0 z-10 flex w-16 items-center',
        left
          ? 'left-0 justify-start bg-linear-to-r from-surface via-surface/85 to-transparent pl-1.5'
          : 'right-0 justify-end bg-linear-to-l from-surface via-surface/85 to-transparent pr-1.5',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={left ? 'Листать влево' : 'Листать вправо'}
        title={left ? 'Листать влево' : 'Листать вправо'}
        className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft shadow-soft transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-ink focus-ring"
      >
        {left ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </div>
  )
}
