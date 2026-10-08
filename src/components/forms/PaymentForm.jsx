import { useState } from 'react'
import { useVisibleAdvertisers } from '@/features/advertisers/queries'
import { useCreateContract } from '@/features/contracts/queries'
import { contractFileInput } from '@/features/contracts/files'
import { useToast } from '@/components/ui/Toast.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { MultiSelect } from '@/components/ui/MultiSelect.jsx'
import { FilePicker } from '@/components/ui/FilePicker.jsx'
import { DatePicker } from '@/components/ui/DatePicker.jsx'
import { Logo } from '@/components/Logo'
import { MONTHS_FULL } from '@/components/campaigns/MonthTabs.jsx'
import { LEAGUES, PACKAGES } from '@/lib/metrics.js'

/** Последнее число месяца 'YYYY-MM' — как 'YYYY-MM-DD'. */
const lastDayOf = (period) => {
  const [year, month] = period.split('-').map(Number)
  return `${period}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`
}

/** Пустая форма; срок договора — выбранный месяц, с 1-го по последнее число. */
const emptyForm = (period) => ({
  advertiserId: null,
  start: period ? `${period}-01` : '',
  end: period ? lastDayOf(period) : '',
  number: '',
  file: null,
  package: '',
  leagues: [],
})

/** Пустая строка в поле-дате означает «не задано» — сервер ждёт null. */
const dateOrNull = (value) => (value?.trim() ? value : null)

/**
 * Создание оплаты со страницы «Статус оплаты»: это новый договор выбранной
 * организации — те же поля и тот же запрос, что в карточке рекламодателя
 * (`POST /advertisers/:id/contracts`). Договор сразу появляется в таблице.
 *
 * period — месяц, выбранный во вкладках страницы ('YYYY-MM'): по умолчанию
 * договор с его первого по последнее число, иначе строки не видно в этом
 * месяце.
 */
export function PaymentForm({ open, onClose, period }) {
  const { data: advertisers = [] } = useVisibleAdvertisers()
  const { mutate: createContract, isPending } = useCreateContract()
  const toast = useToast()
  const [form, setForm] = useState(() => emptyForm(period))
  const [errors, setErrors] = useState({})

  const advertiser = advertisers.find((a) => a.id === form.advertiserId)

  // Каждое открытие — с чистой формы. Сбрасываем при открытии, а не при
  // закрытии: иначе поля опустели бы, пока окно ещё уезжает.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setForm(emptyForm(period))
      setErrors({})
    }
  }

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const submit = () => {
    const err = {}
    const number = form.number.trim()
    if (!form.advertiserId) err.advertiserId = 'Выберите организацию'
    if (!number) err.number = 'Укажите номер договора'
    // Номер уникален по всей базе: иначе один договор всплывает у двух брендов.
    const owner = number
      ? advertisers.find((brand) =>
          (brand.contracts ?? []).some((c) => c.number.trim() === number),
        )
      : null
    if (owner) {
      err.number =
        owner.id === form.advertiserId
          ? 'Такой номер у организации уже есть'
          : `Такой номер уже занят: ${owner.name}`
    }
    setErrors(err)
    if (Object.keys(err).length) return

    createContract(
      {
        advertiserId: advertiser.id,
        // Остальное — как у нового договора в карточке рекламодателя.
        input: {
          number,
          status: 'active',
          campaignName: '',
          legalName: advertiser.legalName || '',
          package: form.package,
          leagues: [...form.leagues],
          start: dateOrNull(form.start),
          end: dateOrNull(form.end),
          paymentDate: `${new Date().getFullYear()}-08-31`,
          ...contractFileInput(form, null),
        },
      },
      {
        onSuccess: () => {
          toast.success(`Оплата создана: договор ${number}, ${advertiser.name}`)
          onClose()
        },
        onError: (err2) =>
          toast.error(err2.message || 'Не удалось создать оплату'),
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      logo={<Logo size={40} withWord={false} />}
      title="Создайте оплату"
      description={
        period
          ? `Оплата за ${MONTHS_FULL[Number(period.slice(5)) - 1].toLowerCase()} ${period.slice(0, 4)}. Выберите организацию и заполните договор.`
          : 'Выберите организацию и заполните договор.'
      }
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" onClick={submit} disabled={isPending}>
            {isPending ? 'Сохраняем…' : 'Создать оплату'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Организация" required error={errors.advertiserId}>
          <Select
            value={form.advertiserId ?? ''}
            onChange={(e) =>
              set('advertiserId', Number(e.target.value) || null)
            }
          >
            <option value="">— выберите организацию —</option>
            {[...advertisers]
              .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </Select>
        </Field>

        {/* Поля договора — как в карточке рекламодателя. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Начало">
            <DatePicker
              value={form.start}
              max={form.end || undefined}
              onChange={(value) => set('start', value)}
              clearable
            />
          </Field>
          <Field label="Окончание">
            <DatePicker
              value={form.end}
              min={form.start || undefined}
              onChange={(value) => set('end', value)}
              clearable
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Номер договора" required error={errors.number}>
            <Input
              value={form.number}
              onChange={(e) => set('number', e.target.value)}
              placeholder="Например, Д-2026/114"
            />
          </Field>
          <Field
            label="Файл договора"
            hint="Выберите договор или перетащите файл"
          >
            <FilePicker
              accept=".pdf,.doc,.docx,image/*"
              kind="contract"
              emptyLabel="Загрузить договор"
              downloadLabel="Скачать договор"
              name={form.file?.name}
              url={form.file?.url}
              addedAt={form.file?.addedAt}
              onPick={(file) => set('file', file)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Пакет">
            <Select
              value={form.package}
              onChange={(e) => set('package', e.target.value)}
            >
              <option value="">— не выбран —</option>
              {Object.entries(PACKAGES).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Лиги" hint="Можно выбрать несколько.">
            <MultiSelect
              options={LEAGUES}
              value={form.leagues}
              onChange={(leagues) => set('leagues', leagues)}
              placeholder="— не выбраны —"
            />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
