import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import {
  formatDateTime,
  formatMoney,
  formatPct,
  paidAtOf,
} from '@/lib/format.js'
import { Button } from '@/components/ui/Button'
import { DateTimePicker } from '@/components/ui/DateTimePicker.jsx'
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

/** Дата со временем для DateTimePicker — в местной зоне. */
const toDateTimeInput = (date) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const rowButton =
  'shrink-0 rounded-lg p-1 text-ink-muted transition-colors focus-ring disabled:opacity-50'

const inputClass =
  'rounded-lg border border-line bg-surface px-2 py-1 text-ink transition-colors focus-ring focus-visible:border-indigo-300'

// Поступление показываем с копейками — сервер хранит их (decimal, до 2 знаков).
const paymentMoney = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 2,
})

/** Сумма поступления для поля: «59126163.30» → «59 126 163,3». */
const decimalField = (value) => {
  const [whole, fraction = ''] = String(value ?? '').split('.')
  const cents = fraction.replace(/0+$/, '')
  const grouped = groupDigits(whole)
  return cents ? `${grouped || '0'},${cents}` : grouped
}

/** Ввод суммы: разряды пробелами, одна запятая и до двух знаков после неё. */
const typeDecimal = (raw) => {
  const [whole, ...rest] = String(raw).replace(/\./g, ',').split(',')
  const grouped = groupDigits(whole)
  if (!rest.length) return grouped
  return `${grouped || '0'},${onlyDigits(rest.join('')).slice(0, 2)}`
}

/** Поле → decimal-строка для API: «59 126 163,3» → «59126163.3». */
const toDecimal = (field) => {
  const [whole, fraction = ''] = field.split(',')
  const digits = onlyDigits(whole).replace(/^0+(?=\d)/, '') || '0'
  const cents = onlyDigits(fraction).replace(/0+$/, '')
  return cents ? `${digits}.${cents}` : digits
}

/**
 * Строка истории выплат. Площадка правит в ней поступление — дату, сумму
 * с копейками и комментарий разом, по «Сохранить», — и удаляет его.
 * `label` — подпись под датой, например бренд и договор в общей истории
 * по всем договорам.
 *
 * onSave получает тело PATCH целиком — `{ amount, paidAt, comment }` — и
 * отдаёт true, если сервер его принял. onRemove — удалить поступление.
 */
export function PaymentRow({
  index,
  payment,
  label,
  editable = false,
  onSave,
  onRemove,
  className,
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [paidAt, setPaidAt] = useState('')
  const [amount, setAmount] = useState('')
  const [comment, setComment] = useState('')

  const savedPaidAt = paidAtOf(payment)
  const initialPaidAt = toDateTimeInput(new Date(savedPaidAt))
  const savedAmount = toDecimal(decimalField(payment.amount))
  const savedComment = payment.comment ?? ''
  const nextAmount = toDecimal(amount)
  const valid = !!paidAt && Number(nextAmount) > 0

  const start = () => {
    setPaidAt(initialPaidAt)
    setAmount(decimalField(payment.amount))
    setComment(savedComment)
    setEditing(true)
  }

  const save = async () => {
    if (!valid || saving) return
    const nextComment = comment.trim()
    // Ничего не поменяли — на сервер не ходим.
    if (
      paidAt === initialPaidAt &&
      nextAmount === savedAmount &&
      nextComment === savedComment
    ) {
      return setEditing(false)
    }

    setSaving(true)
    const ok = await onSave({
      amount: nextAmount,
      // Поле даты — с точностью до минуты: не трогали его — отправляем дату
      // как есть, иначе секунды поступления обнулились бы молча.
      paidAt:
        paidAt === initialPaidAt ? savedPaidAt : new Date(paidAt).toISOString(),
      comment: nextComment,
    })
    setSaving(false)
    // Ошибка — остаёмся в правке, введённое не теряется.
    if (ok) setEditing(false)
  }

  // Enter и Escape здесь свои: не сохранять вкладку «Поступление» и не
  // закрывать поповер, а сохранить или отменить правку строки.
  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      save()
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div
        onKeyDown={onKeyDown}
        className={cn(
          'space-y-1.5 rounded-xl bg-paper/70 px-2 py-1.5',
          className,
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-4 shrink-0 text-[10px] text-ink-muted tnum">
            {index + 1}
          </span>
          <DateTimePicker
            value={paidAt}
            onChange={setPaidAt}
            aria-label="Дата и время выплаты"
            className="h-[26px] min-w-0 flex-1 rounded-lg px-2 text-[11px] [&>svg]:size-3.5"
          />
          <input
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(typeDecimal(e.target.value))}
            aria-label="Сумма выплаты"
            placeholder="0"
            className={cn(
              inputClass,
              'w-[112px] shrink-0 text-right text-[12px] font-semibold tnum',
            )}
          />
          <button
            type="button"
            onClick={save}
            disabled={!valid || saving}
            aria-label="Сохранить поступление"
            title="Сохранить"
            className={cn(
              rowButton,
              'hover:bg-emerald-50 hover:text-emerald-700',
            )}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={saving}
            aria-label="Отменить правку"
            title="Отменить"
            className={cn(rowButton, 'hover:bg-ink/6 hover:text-ink')}
          >
            <X size={14} />
          </button>
        </div>
        {/* Пустая ячейка под номером: комментарий встаёт вровень с датой
            и кончается там же, где кнопки строки над ним. */}
        <div className="flex items-center gap-1.5">
          <span className="w-4 shrink-0" />
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            aria-label="Комментарий к выплате"
            placeholder="Комментарий"
            className={cn(inputClass, 'min-w-0 flex-1 text-[11px]')}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl bg-paper/70 px-2 py-1.5',
        className,
      )}
    >
      <span className="w-4 shrink-0 text-[10px] text-ink-muted tnum">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-ink-muted tnum">
          {formatDateTime(savedPaidAt)}
        </p>
        {label && <p className="truncate text-[11px] text-ink-soft">{label}</p>}
        {savedComment && (
          <p
            className="truncate text-[11px] text-ink-muted"
            title={savedComment}
          >
            {savedComment}
          </p>
        )}
      </div>
      <span className="shrink-0 text-[13px] font-semibold text-emerald-700 tnum">
        + {paymentMoney.format(Number(payment.amount) || 0)}
      </span>
      {editable && onSave && (
        <button
          type="button"
          onClick={start}
          aria-label="Изменить поступление"
          title="Изменить дату, сумму и комментарий"
          className={cn(rowButton, 'hover:bg-ink/6 hover:text-indigo-800')}
        >
          <Pencil size={14} />
        </button>
      )}
      {/* Ошибочное поступление можно убрать: сумма вернётся. */}
      {editable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Удалить поступление"
          title="Удалить поступление"
          className={cn(rowButton, 'hover:bg-danger/10 hover:text-danger')}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

/**
 * Правка сумм договора: сумма договора, оплачено и разовое поступление,
 * которое прибавляется к оплаченному. Вторая вкладка — история выплат
 * с датой и временем каждого платежа: в ней поступление правят
 * (`onEditPayment(id, { amount, paidAt, comment })` → true, если сохранено)
 * и удаляют (`onRemovePayment(payment)`).
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
      // Enter сохраняет только вкладку «Поступление»: в истории он свой.
      onKeyDown={(e) => e.key === 'Enter' && tab === 'pay' && save()}
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
              <DateTimePicker
                value={paidAt}
                onChange={setPaidAt}
                className="h-9 text-[13px]"
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
                <PaymentRow
                  key={payment.id}
                  index={index}
                  payment={payment}
                  editable={editable}
                  onSave={
                    onEditPayment &&
                    ((input) => onEditPayment(payment.id, input))
                  }
                  onRemove={onRemovePayment && (() => onRemovePayment(payment))}
                />
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
