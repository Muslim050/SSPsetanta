import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import {
  formatDateTime,
  formatMoney,
  formatPct,
  paidAtOf,
} from '@/lib/format.js'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { cn } from '@/lib/cn.js'
import { usePopoverPlacement } from '@/lib/usePopoverPlacement.js'

// Шире прежних 300px: в истории выплат дата со временем иначе обрезается.
const WIDTH = 380

// В полях суммы показываем разряды: 200000000 → «200 000 000».
const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '')
const groupDigits = (value) => {
  const digits = onlyDigits(value)
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''
}
/**
 * Ноль в поле не показываем — его пришлось бы стирать перед вводом суммы.
 * Сумма приходит и числом, и decimal-строкой («890000.00»): точку убираем
 * округлением, иначе разрядка превратила бы её в 89 000 000.
 */
const amountField = (value) => {
  const rounded = Math.round(Number(value) || 0)
  return rounded ? groupDigits(String(rounded)) : ''
}

/** Дата со временем для input[type=datetime-local] — в местной зоне. */
const toDateTimeInput = (date) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Правка сумм договора: сумма договора, оплачено и разовое поступление,
 * которое прибавляется к оплаченному. Вторая вкладка — история выплат
 * с датой и временем каждого платежа.
 * Рисуется порталом с position: fixed — иначе таблица его обрежет.
 */
export function MoneyPopover({
  anchorEl,
  title,
  budget: budgetValue = 0,
  spent = 0,
  payments = [],
  onSave,
  onEditPayment,
  onRemovePayment,
  onClose,
}) {
  const ref = useRef(null)
  // Держимся за ячейку: при прокрутке таблицы поповер едет вместе с ней.
  const [anchor, setAnchor] = useState(() => anchorEl.getBoundingClientRect())
  const { canEdit, isAdvertiser } = useAuth()
  // Суммы правит только админ; рекламодателю и наблюдателю — история выплат.
  const editable = canEdit && !isAdvertiser

  const [tab, setTab] = useState(editable ? 'pay' : 'history')
  const [budget, setBudget] = useState(amountField(budgetValue))
  const [paid, setPaid] = useState(amountField(spent))
  const [income, setIncome] = useState('')
  const [paidAt, setPaidAt] = useState(() => toDateTimeInput(new Date()))

  // Поповер остаётся открытым после сохранения — подтягиваем свежие суммы.
  useEffect(() => {
    setBudget(amountField(budgetValue))
    setPaid(amountField(spent))
  }, [budgetValue, spent])

  // Следим за ячейкой покадрово: событий scroll недостаточно — таблица может
  // ехать и от прокрутки контейнера, и от перерисовки строк.
  useEffect(() => {
    let frame = 0
    let stopped = false
    // Закрылись — гасим цикл: до размонтирования успело бы пройти ещё
    // несколько кадров, и onClose дёргался бы на каждом.
    const close = () => {
      stopped = true
      onClose()
    }
    // Только измерение. Кадр отсюда не планируется — иначе каждое событие
    // scroll заводило бы собственную цепочку rAF, а cleanup отменял бы
    // только последнюю.
    const measure = () => {
      if (stopped) return
      if (!anchorEl.isConnected) return close()
      const rect = anchorEl.getBoundingClientRect()
      const viewport = Math.max(
        window.innerHeight,
        document.documentElement.clientHeight,
      )
      // Ячейка уехала из видимой части — закрываем, чтобы поповер не «висел».
      if (viewport && (rect.bottom < 0 || rect.top > viewport)) {
        return close()
      }
      setAnchor((prev) =>
        prev.top === rect.top && prev.right === rect.right ? prev : rect,
      )
    }
    // Цепочка кадров ровно одна на весь эффект.
    const loop = () => {
      measure()
      if (!stopped) frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    // Дублируем событиями: кадры не идут, если вкладка ушла в фон.
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
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

  const numbers = {
    budget: Number(onlyDigits(budget)) || 0,
    paid: Number(onlyDigits(paid)) || 0,
    income: Number(onlyDigits(income)) || 0,
  }
  const total = numbers.paid + numbers.income
  const invalid = !paidAt
  // Процент оплаты — как в полосе таблицы, с учётом набранного поступления.
  const paidPct = numbers.budget ? (total / numbers.budget) * 100 : 0

  const save = () => {
    if (invalid || !editable) return
    onSave({
      budget: numbers.budget,
      spent: total,
      amount: numbers.income,
      // Дату и время поступления выбирает пользователь.
      paidAt: new Date(paidAt).toISOString(),
    })
    // Поле поступления не чистим: после сохранения поповер закрывается,
    // а при ошибке сумма нужна для повтора.
  }

  // Под ячейкой, а если не помещается — над ней; всегда в пределах экрана.
  const placement = usePopoverPlacement(ref, anchor)
  // На узком экране — во всю ширину с отступами по 12px.
  const width = Math.min(WIDTH, window.innerWidth - 24)
  // Прижимаем к правому краю ячейки, но не даём уехать за экран.
  const left = Math.min(
    Math.max(12, anchor.right - width),
    window.innerWidth - width - 12,
  )

  const tabClass = (value) =>
    cn(
      'flex-1 rounded-lg px-2 py-1 text-[12px] font-medium transition-colors focus-ring',
      tab === value
        ? 'bg-ink/6 text-ink'
        : 'text-ink-muted hover:text-ink-soft',
    )

  return createPortal(
    <div
      ref={ref}
      style={{
        left,
        top: placement.top,
        width,
        maxHeight: placement.maxHeight,
      }}
      className="fixed z-50 overflow-y-auto rounded-2xl border border-line bg-surface p-4 shadow-lift"
      onKeyDown={(e) => e.key === 'Enter' && save()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Выплаты
            {/* Тот же процент освоения, что в строке кампании. */}
            <span className="rounded-full bg-ink/6 px-1.5 text-[10px] text-ink-soft tnum">
              {formatPct(paidPct, 0)}
            </span>
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

      {/* Вкладку с правкой показываем только тем, кто может менять суммы. */}
      {editable && (
        <div className="mt-3 flex items-center gap-1 rounded-xl border border-line bg-paper/60 p-1">
          <button
            type="button"
            className={tabClass('pay')}
            onClick={() => setTab('pay')}
          >
            Поступление
          </button>
          <button
            type="button"
            className={tabClass('history')}
            onClick={() => setTab('history')}
          >
            История выплат
            {payments.length > 0 && (
              <span className="ml-1 text-ink-muted tnum">
                {payments.length}
              </span>
            )}
          </button>
        </div>
      )}

      {tab === 'pay' && editable ? (
        <>
          <div className="mt-3 space-y-3">
            <Field label="Сумма договора">
              <Input
                inputMode="numeric"
                value={budget}
                onChange={(e) => setBudget(groupDigits(e.target.value))}
                placeholder="0"
                className="h-9 text-[13px] tnum"
              />
            </Field>

            <Field label="Оплачено">
              <Input
                inputMode="numeric"
                value={paid}
                onChange={(e) => setPaid(groupDigits(e.target.value))}
                placeholder="0"
                className="h-9 text-[13px] tnum"
              />
            </Field>

            <Field label="Поступление" hint="Прибавится к оплаченному.">
              <div className="relative">
                <Plus
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600"
                />
                <Input
                  inputMode="numeric"
                  autoFocus
                  value={income}
                  onChange={(e) => setIncome(groupDigits(e.target.value))}
                  placeholder="0"
                  className="h-9 pl-8 text-[13px] tnum"
                />
              </div>
            </Field>

            <Field label="Дата поступления">
              <Input
                type="datetime-local"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="h-9 text-[13px] tnum"
              />
            </Field>
          </div>

          {numbers.income > 0 && (
            <p className="mt-3 flex items-center justify-between rounded-xl bg-paper/70 px-3 py-2 text-[12px]">
              <span className="text-ink-muted">Станет оплачено</span>
              <span className="font-semibold text-ink tnum">
                {formatMoney(total)}
              </span>
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={save}
              disabled={invalid}
            >
              Сохранить
            </Button>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Отмена
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-3 max-h-[240px] space-y-1.5 overflow-y-auto">
            {payments.length === 0 ? (
              <p className="rounded-xl bg-paper/70 px-3 py-4 text-center text-[12px] text-ink-muted">
                Поступлений пока не было.
              </p>
            ) : (
              payments.map((payment, index) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-paper/70 px-2 py-1.5"
                >
                  <div className="text-[10px] text-ink-muted">{index + 1}</div>
                  {/* Дату и время выплаты можно поправить прямо в истории. */}
                  {editable ? (
                    <input
                      type="datetime-local"
                      value={toDateTimeInput(new Date(paidAtOf(payment)))}
                      onChange={(e) =>
                        onEditPayment(payment.id, e.target.value)
                      }
                      aria-label="Дата и время выплаты"
                      className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] text-ink transition-colors tnum focus-ring focus-visible:border-indigo-300"
                    />
                  ) : (
                    <span className="text-[12px] text-ink-muted tnum">
                      {formatDateTime(paidAtOf(payment))}
                    </span>
                  )}
                  <span className="shrink-0 text-[13px] font-semibold text-emerald-700 tnum">
                    + {formatMoney(payment.amount)}
                  </span>
                  {/* Ошибочное поступление можно убрать: сумма вернётся. */}
                  {editable && onRemovePayment && (
                    <button
                      type="button"
                      onClick={() => onRemovePayment(payment.id)}
                      aria-label="Удалить поступление"
                      title="Удалить поступление"
                      className="shrink-0 rounded-lg p-1 text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger focus-ring"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-paper/70 px-3 py-2 text-[12px]">
            <span className="text-ink-muted">Всего оплачено </span>
            <span className="font-semibold text-ink tnum">
              {formatMoney(spent)}
            </span>
          </div>

          {!editable && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-3 w-full"
              onClick={onClose}
            >
              Закрыть
            </Button>
          )}
        </>
      )}
    </div>,
    document.body,
  )
}
