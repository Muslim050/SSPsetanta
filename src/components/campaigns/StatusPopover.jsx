import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { MONTHS_SHORT, MONTHS_FULL } from '@/components/campaigns/MonthTabs.jsx'
import { formatDateTime } from '@/lib/format.js'
import { cn } from '@/lib/cn.js'
import { usePopoverPlacement } from '@/lib/usePopoverPlacement.js'

const WIDTH = 300

const pad = (n) => String(n).padStart(2, '0')

/** Дата со временем для input[type=datetime-local] — в местной зоне. */
const toDateTimeInput = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`

/** Тот же день и время, но в другом месяце: 31-е в коротком месяце ужимаем. */
const moveToMonth = (value, year, month) => {
  const base = value ? new Date(value) : new Date()
  const date = Number.isNaN(base.getTime()) ? new Date() : base
  const lastDay = new Date(year, month + 1, 0).getDate()
  const moved = new Date(
    year,
    month,
    Math.min(date.getDate(), lastDay),
    date.getHours(),
    date.getMinutes(),
  )
  return toDateTimeInput(moved)
}

/** Ключ месяца: 2026-08. Им же статус привязан к вкладке месяца. */
export const periodKey = (year, month) => `${year}-${pad(month + 1)}`

// Дни недели календаря — с понедельника.
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/**
 * Дни одного месяца — для даты смены, когда месяц уже выбран вкладкой на
 * странице: меняется только число. Будущие дни недоступны — смена статуса
 * не бывает завтрашней.
 */
function MonthDays({ year, month, value, onPick }) {
  const selected = new Date(value)
  const days = new Date(year, month + 1, 0).getDate()
  // Сколько пустых клеток до 1-го числа: неделя начинается с понедельника.
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const today = new Date()
  today.setHours(23, 59, 59, 999)

  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase text-ink-muted">
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: offset }, (_, index) => (
          <span key={`empty-${index}`} />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1
          const active =
            selected.getFullYear() === year &&
            selected.getMonth() === month &&
            selected.getDate() === day
          return (
            <button
              key={day}
              type="button"
              disabled={new Date(year, month, day) > today}
              onClick={() => onPick(day)}
              aria-pressed={active}
              title={`${day} ${MONTHS_FULL[month].toLowerCase()} ${year}`}
              className={cn(
                'h-8 rounded-lg text-[12px] font-medium transition-colors focus-ring tnum disabled:cursor-default disabled:text-ink-muted/40',
                active
                  ? 'bg-indigo-500 font-semibold text-ink'
                  : 'text-ink-soft enabled:hover:bg-ink/5 enabled:hover:text-ink',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const parsePeriod = (period) => {
  const [year, month] = String(period ?? '').split('-')
  return Number.isFinite(Number(year)) && Number.isFinite(Number(month))
    ? { year: Number(year), month: Number(month) - 1 }
    : null
}

/**
 * Смена статуса оплаты. Статус ставится на конкретный месяц договора:
 * выбираем вариант, месяц и дату смены. Вторая вкладка — история смен.
 * Рисуется порталом с position: fixed — иначе карточка его обрежет.
 *
 * options: [{ value, label, badge?, dot? }] — dot: цвет точки у месяца
 * history: [{ id, status, period, changedAt, by }]
 * statusByPeriod: { '2026-08': { status, changedAt } } — раскраска месяцев
 * monthLocked — месяц уже выбран вкладкой на странице: выбора месяца в
 *   поповере нет, а дата смены — число этого месяца.
 */
export function StatusPopover({
  anchorEl,
  title,
  value,
  options,
  history = [],
  statusByPeriod = {},
  period,
  years,
  monthLocked = false,
  readOnly = false,
  onSave,
  onClose,
}) {
  const ref = useRef(null)
  const [anchor, setAnchor] = useState(() => anchorEl.getBoundingClientRect())
  // Кто не меняет статус, открывает карточку ради истории.
  const [tab, setTab] = useState(readOnly ? 'history' : 'status')
  const [draft, setDraft] = useState(value)
  // Месяц, к которому относится статус: по умолчанию выбранный в фильтре.
  const initial = parsePeriod(period) ?? {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  }
  // Смену можно оформить задним числом — дату и время выбирает пользователь.
  // Месяц закреплён вкладкой — сегодняшнее число, но в этом месяце.
  const [changedAt, setChangedAt] = useState(() =>
    monthLocked
      ? moveToMonth(null, initial.year, initial.month)
      : toDateTimeInput(new Date()),
  )
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)

  // Месяц и дата смены ходят парой: выбрали апрель — дата уезжает в апрель,
  // поправили дату руками — подсвечивается её месяц.
  const pickMonth = (nextYear, nextMonth) => {
    setYear(nextYear)
    setMonth(nextMonth)
    setChangedAt((current) => moveToMonth(current, nextYear, nextMonth))
  }

  /** Число в закреплённом месяце; время смены остаётся прежним. */
  const pickDay = (day) => {
    const date = new Date(changedAt)
    date.setFullYear(year, month, day)
    setChangedAt(toDateTimeInput(date))
  }

  const pickChangedAt = (localValue) => {
    setChangedAt(localValue)
    const date = new Date(localValue)
    if (Number.isNaN(date.getTime())) return
    setYear(date.getFullYear())
    setMonth(date.getMonth())
  }
  // Ищем подпись и цвет статуса из истории по его значению.
  const byValue = Object.fromEntries(options.map((o) => [o.value, o]))

  const yearList = years?.length ? years : [initial.year]
  const yearIndex = yearList.indexOf(year)
  const prevYear = yearIndex > 0 ? yearList[yearIndex - 1] : null
  const nextYear =
    yearIndex >= 0 && yearIndex < yearList.length - 1
      ? yearList[yearIndex + 1]
      : null

  // Держимся за карточку: страница может проехать под поповером.
  useEffect(() => {
    const track = () => {
      if (!anchorEl.isConnected) return onClose()
      setAnchor(anchorEl.getBoundingClientRect())
    }
    window.addEventListener('scroll', track, true)
    window.addEventListener('resize', track)
    return () => {
      window.removeEventListener('scroll', track, true)
      window.removeEventListener('resize', track)
    }
  }, [anchorEl, onClose])

  useEffect(() => {
    const onDown = (e) =>
      ref.current && !ref.current.contains(e.target) && onClose()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const selectedPeriod = periodKey(year, month)
  // Статус месяца, который сейчас выбран в поповере.
  const periodStatus = statusByPeriod[selectedPeriod]?.status ?? null
  const unchanged = draft === periodStatus

  const save = () => {
    if (unchanged || !changedAt) return
    onSave(draft, new Date(changedAt).toISOString(), selectedPeriod)
  }

  // Прижимаем к левому краю карточки, но не даём уехать за экран.
  const left = Math.min(
    Math.max(12, anchor.left),
    window.innerWidth - WIDTH - 12,
  )

  const tabClass = (name) =>
    cn(
      'flex-1 rounded-lg px-2 py-1 text-[12px] font-medium transition-colors focus-ring',
      tab === name ? 'bg-ink/6 text-ink' : 'text-ink-muted hover:text-ink-soft',
    )

  const arrowClass =
    'flex h-6 w-6 items-center justify-center rounded-lg text-ink-muted transition-colors focus-ring enabled:hover:bg-ink/6 enabled:hover:text-ink-soft disabled:opacity-35'

  // Под ячейкой, а если не помещается — над ней; всегда в пределах экрана.
  const placement = usePopoverPlacement(ref, anchor)

  return createPortal(
    <div
      ref={ref}
      style={{
        left,
        top: placement.top,
        width: WIDTH,
        maxHeight: placement.maxHeight,
      }}
      className="fixed z-50 overflow-y-auto rounded-2xl border border-line bg-surface p-4 shadow-lift"
      onKeyDown={(e) => e.key === 'Enter' && save()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Статус
          </p>
          <p className="mt-0.5 truncate text-[13px] font-medium text-ink">
            {title}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="shrink-0 rounded-lg p-1 text-ink-muted transition-colors hover:bg-ink/6 hover:text-ink focus-ring"
        >
          <X size={15} />
        </button>
      </div>

      {!readOnly && (
        <div className="mt-3 flex items-center gap-1 rounded-xl border border-line bg-paper/60 p-1">
          <button
            type="button"
            className={tabClass('status')}
            onClick={() => setTab('status')}
          >
            Статус
          </button>
          <button
            type="button"
            className={tabClass('history')}
            onClick={() => setTab('history')}
          >
            История
            {history.length > 0 && (
              <span className="ml-1 text-ink-muted tnum">{history.length}</span>
            )}
          </button>
        </div>
      )}

      {readOnly && (
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          История статуса
          {history.length > 0 && (
            <span className="ml-1 tnum">{history.length}</span>
          )}
        </p>
      )}

      {tab === 'status' && !readOnly ? (
        <>
          <div className="mt-3 space-y-1.5">
            {options.map((option) => {
              const active = option.value === draft
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDraft(option.value)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] font-medium transition-colors focus-ring',
                    active
                      ? 'border-indigo-300 bg-indigo-50 text-ink'
                      : 'border-line bg-surface text-ink-soft hover:border-indigo-200 hover:bg-indigo-50/50',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {option.label}
                  </span>
                  {active && (
                    <Check size={15} className="shrink-0 text-indigo-800" />
                  )}
                </button>
              )
            })}
          </div>

          {monthLocked ? (
            <div className="mt-3">
              <p className="mb-1.5 text-[13px] font-medium text-ink-soft">
                Дата изменения
              </p>
              <MonthDays
                year={year}
                month={month}
                value={changedAt}
                onPick={pickDay}
              />
              <p className="mt-1.5 text-[11px] text-ink-muted">
                {periodStatus
                  ? `${MONTHS_FULL[month]} ${year}: ${byValue[periodStatus]?.label ?? periodStatus}`
                  : `${MONTHS_FULL[month]} ${year}: статус не ставили`}
              </p>
            </div>
          ) : (
            <>
              <div className="mt-3">
                <Field label="Дата изменения">
                  <Input
                    type="datetime-local"
                    value={changedAt}
                    onChange={(e) => pickChangedAt(e.target.value)}
                    className="h-9 text-[13px] tnum"
                  />
                </Field>
              </div>

              {/* Месяц договора, к которому относится статус: его вкладка в
                фильтре окрасится зелёным или красным. */}
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-ink-soft">Месяц</p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={prevYear == null}
                      onClick={() => pickMonth(prevYear, month)}
                      aria-label="Предыдущий год"
                      className={arrowClass}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="min-w-[38px] text-center text-[12px] font-semibold text-ink tnum">
                      {year}
                    </span>
                    <button
                      type="button"
                      disabled={nextYear == null}
                      onClick={() => pickMonth(nextYear, month)}
                      aria-label="Следующий год"
                      className={arrowClass}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-1.5 grid grid-cols-4 gap-1">
                  {MONTHS_SHORT.map((label, index) => {
                    const active = index === month
                    // У месяца уже есть статус — показываем точкой, какой именно.
                    const saved = statusByPeriod[periodKey(year, index)]?.status
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => pickMonth(year, index)}
                        title={`${MONTHS_FULL[index]} ${year}`}
                        className={cn(
                          'flex items-center justify-center gap-1 rounded-lg border px-1 py-1.5 text-[12px] font-medium transition-colors focus-ring',
                          active
                            ? 'border-indigo-400 bg-indigo-50 text-ink'
                            : 'border-line bg-surface text-ink-soft hover:border-indigo-200 hover:bg-indigo-50/50',
                        )}
                      >
                        {label}
                        {saved && (
                          <span
                            className={cn(
                              'h-1.5 w-1.5 shrink-0 rounded-full',
                              byValue[saved]?.dot ??
                                (saved === 'paid' ? 'bg-success' : 'bg-danger'),
                            )}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-ink-muted">
                  {periodStatus
                    ? `${MONTHS_FULL[month]} ${year}: ${byValue[periodStatus]?.label ?? periodStatus}`
                    : `${MONTHS_FULL[month]} ${year}: статус не ставили`}
                </p>
              </div>
            </>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={save}
              disabled={unchanged || !changedAt}
            >
              Сохранить
            </Button>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Отмена
            </Button>
          </div>
        </>
      ) : (
        /* История смен — видно, за какой месяц, кто и когда переключил. */
        <div className="mt-3 max-h-[260px] space-y-1.5 overflow-y-auto">
          {history.length === 0 ? (
            <p className="rounded-xl bg-paper/70 px-3 py-3 text-center text-[12px] text-ink-muted">
              Статус ещё не меняли.
            </p>
          ) : (
            history.map((entry) => {
              const at = parsePeriod(entry.period)
              return (
                <div
                  key={entry.id}
                  className="rounded-xl bg-paper/70 px-2.5 py-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-ink">
                      {at
                        ? `${MONTHS_FULL[at.month]} ${at.year}`
                        : 'Без месяца'}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-1.5 text-[10px] font-medium',
                        byValue[entry.status]?.badge,
                      )}
                    >
                      {byValue[entry.status]?.label ?? entry.status}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-ink-muted tnum">
                      {formatDateTime(entry.changedAt ?? entry.createdAt)}
                    </span>
                    {entry.by && (
                      <span className="truncate text-[10px] text-ink-muted">
                        {entry.by}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>,
    document.body,
  )
}
