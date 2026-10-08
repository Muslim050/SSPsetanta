import { useEffect, useState } from 'react'
import { Check, Download, FileText, Film, Trash2 } from 'lucide-react'
// Договоры переехали на сервер. Мок остаётся для разделов, которые ещё
// не подключены: import { useData } from '@/context/DataContext.jsx'
import { useVisibleAdvertisers } from '@/features/advertisers/queries'
import {
  useCreateContract,
  useDeleteContract,
  useSaveCampaignInfo,
  useUpdateContract,
} from '@/features/contracts/queries'
import { contractFileInput } from '@/features/contracts/files'
import { reportContractDeleteError } from '@/features/contracts/deleteError'
import { downloadFile } from '@/features/files/download'
import { useAuth } from '@/features/auth/useAuth'
import { useToast } from '@/components/ui/Toast.jsx'
import { useConfirm } from '@/components/ui/Confirm.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { MultiSelect } from '@/components/ui/MultiSelect.jsx'
import { FilePicker } from '@/components/ui/FilePicker.jsx'
import {
  CONTRACT_STATUS,
  LEAGUES,
  PACKAGES,
  leagueLabel,
} from '@/lib/metrics.js'
import { formatDate, formatDateTime } from '@/lib/format.js'

const emptyContract = () => ({
  number: '',
  // Договор заводят действующим, дальше статус ведёт площадка.
  status: 'active',
  // Рекламная кампания, под которую заключён договор.
  campaignName: '',
  legalName: '',
  package: '',
  leagues: [],
  start: '',
  end: '',
  paymentDate: `${new Date().getFullYear()}-08-31`,
  file: null,
  // Ролик договора — его подставляем в кампании по этому договору.
  creative: null,
})

/** Строка «поле — значение» для режима просмотра. */
function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5 text-[13px] sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="shrink-0 text-ink-muted sm:w-40">{label}</dt>
      <dd className="min-w-0 font-medium text-ink">{value}</dd>
    </div>
  )
}

/**
 * Карточка договора бренда: площадка ведёт условия договора, рекламодатель —
 * название рекламной кампании и ролик. Наблюдателю — только просмотр.
 */
export function ContractModal({ open, contract, advertiser, onClose }) {
  // const { advertisers, update } = useData()
  const { data: advertisers = [] } = useVisibleAdvertisers()
  const { mutate: createContract } = useCreateContract()
  const { mutate: updateContract } = useUpdateContract()
  const { mutate: deleteContract } = useDeleteContract()
  const { mutate: saveCampaignInfo } = useSaveCampaignInfo()
  const { isAdvertiser, canEdit } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [form, setForm] = useState(emptyContract)
  const [error, setError] = useState('')
  // Подтверждение прямо на кнопке: тост в углу легко не заметить.
  const [saved, setSaved] = useState(false)

  const creating = !contract
  // Условия договора ведёт площадка, кампанию с роликом — рекламодатель.
  const canEditTerms = canEdit && !isAdvertiser
  const canEditCampaign = canEdit && isAdvertiser && !creating

  // Заполняем форму при открытии. Зависимости — по id, иначе сохранение
  // обновляет бренд в сторе и форма тут же сбрасывается сама на себя.
  useEffect(() => {
    if (!open) return
    setForm(
      contract
        ? { ...contract, leagues: [...(contract.leagues ?? [])] }
        : { ...emptyContract(), legalName: advertiser?.legalName || '' },
    )
    setError('')
    setSaved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract?.id, advertiser?.id])

  // Держим «Сохранено» на экране секунду и закрываем карточку.
  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(onClose, 900)
    return () => clearTimeout(timer)
  }, [saved, onClose])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  /** Поля договора, которые принимает сервер: файлы правятся не здесь. */
  const termsInput = (number) => ({
    number,
    campaignName: (form.campaignName ?? '').trim(),
    legalName: (form.legalName ?? '').trim(),
    package: form.package ?? '',
    leagues: [...(form.leagues ?? [])],
    start: form.start || null,
    end: form.end || null,
    paymentDate: form.paymentDate || null,
    status: form.status ?? 'active',
    ...contractFileInput(form, contract),
  })

  const onSaved = (message) => {
    toast.success(message)
    setSaved(true)
  }

  const onFailed = (err) =>
    toast.error(err.message || 'Не удалось сохранить договор')

  const save = () => {
    // Рекламодатель ведёт только название кампании и ролик — остальные
    // условия договора трогать не даём.
    if (canEditCampaign) {
      saveCampaignInfo(
        {
          id: contract.id,
          input: {
            campaignName: (form.campaignName ?? '').trim(),
            ...contractFileInput(form, contract),
          },
        },
        {
          onSuccess: () => onSaved(`Договор ${contract.number} сохранён`),
          onError: onFailed,
        },
      )
      return
    }

    const number = form.number.trim()
    if (!number) {
      setError('Укажите номер договора')
      return
    }
    // Номер уникален по всей базе: иначе один договор всплывает у двух брендов.
    const owner = advertisers.find((brand) =>
      (brand.contracts ?? []).some(
        (c) => c.id !== contract?.id && c.number.trim() === number,
      ),
    )
    if (owner) {
      setError(
        owner.id === advertiser.id
          ? 'Такой номер у бренда уже есть'
          : `Такой номер уже занят брендом ${owner.name}`,
      )
      return
    }

    if (creating) {
      createContract(
        { advertiserId: advertiser.id, input: termsInput(number) },
        {
          onSuccess: () =>
            onSaved(`Договор ${number} добавлен бренду ${advertiser.name}`),
          onError: onFailed,
        },
      )
      return
    }

    updateContract(
      { id: contract.id, input: termsInput(number) },
      {
        onSuccess: () => onSaved(`Договор ${number} сохранён`),
        onError: onFailed,
      },
    )
  }

  const remove = async () => {
    const ok = await confirm({
      title: 'Удалить договор?',
      description: contract.number,
      body: 'Кампании, оформленные по нему, останутся — у них сохранится номер договора.',
    })
    if (!ok) return

    deleteContract(
      { advertiserId: advertiser.id, id: contract.id },
      {
        onSuccess: () => {
          toast.info('Договор удалён')
          onClose()
        },
        onError: (err) =>
          reportContractDeleteError(err, {
            confirm,
            toast,
            number: contract.number,
          }),
      },
    )
  }

  const term =
    form.start && form.end
      ? `${formatDate(form.start)} — ${formatDate(form.end)}`
      : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={FileText}
      title={creating ? 'Новый договор' : `Договор ${contract?.number ?? ''}`}
      description={advertiser?.name || 'Договор бренда'}
      size="lg"
      footer={
        <>
          {canEditTerms && !creating && (
            <Button variant="danger" onClick={remove} className="mr-auto">
              <Trash2 size={16} />
              Удалить
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            {canEditTerms || canEditCampaign ? 'Отмена' : 'Закрыть'}
          </Button>
          {(canEditTerms || canEditCampaign) && (
            <Button variant="primary" onClick={save} disabled={saved}>
              {saved ? (
                <>
                  <Check size={16} />
                  {creating ? 'Договор добавлен' : 'Сохранено'}
                </>
              ) : creating ? (
                'Добавить'
              ) : (
                'Сохранить'
              )}
            </Button>
          )}
        </>
      }
    >
      {!canEditTerms ? (
        <dl className="space-y-2">
          <Row label="Номер договора" value={form.number} />
          {/* Название кампании рекламодатель правит ниже, дублировать не нужно. */}
          {!canEditCampaign && (
            <Row label="Рекламная кампания" value={form.campaignName} />
          )}
          <Row
            label="Статус"
            value={CONTRACT_STATUS[form.status ?? 'active']?.label}
          />
          <Row label="Пакет" value={PACKAGES[form.package]?.label} />
          <Row label="Лиги" value={form.leagues?.map(leagueLabel).join(', ')} />
          <Row label="Срок договора" value={term} />
          <Row
            label="Сроки оплаты"
            value={form.paymentDate ? formatDate(form.paymentDate) : null}
          />
          {form.file && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => downloadFile(form.file)}
                className="flex w-full items-center gap-2 rounded-xl border border-line bg-paper/55 px-3 py-2 text-left text-[13px] font-medium text-ink transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-ring"
              >
                <FileText size={16} className="shrink-0 text-indigo-800" />
                <span className="min-w-0 flex-1 truncate">
                  {form.file.name}
                </span>
                <Download size={15} className="shrink-0 text-ink-muted" />
              </button>
              {form.file.addedAt && (
                <p className="mt-1 text-[11px] text-ink-muted tnum">
                  Добавлен {formatDateTime(form.file.addedAt)}
                </p>
              )}
            </div>
          )}

          {/* Ролик — тем, кто его не правит, показываем ссылкой с датой. */}
          {!canEditCampaign && form.creative && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => downloadFile(form.creative)}
                className="flex w-full items-center gap-2 rounded-xl border border-line bg-paper/55 px-3 py-2 text-left text-[13px] font-medium text-ink transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-ring"
              >
                <Film size={16} className="shrink-0 text-indigo-800" />
                <span className="min-w-0 flex-1 truncate">
                  {form.creative.name}
                </span>
                <Download size={15} className="shrink-0 text-ink-muted" />
              </button>
              {form.creative.addedAt && (
                <p className="mt-1 text-[11px] text-ink-muted tnum">
                  Добавлен {formatDateTime(form.creative.addedAt)}
                </p>
              )}
            </div>
          )}

          {/* Рекламодатель заполняет кампанию и ролик прямо здесь. */}
          {canEditCampaign && (
            <div className="mt-4 space-y-4 rounded-2xl border border-line bg-paper/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Заполняет рекламодатель
              </p>
              <Field label="Название рекламной кампании">
                <Input
                  value={form.campaignName ?? ''}
                  onChange={(e) => set('campaignName', e.target.value)}
                  placeholder="Например, Кондиционеры — лето"
                />
              </Field>
              <Field
                label="Рекламный ролик"
                hint="Выберите ролик или перетащите файл"
              >
                <FilePicker
                  accept="video/*"
                  icon={Film}
                  kind="creative"
                  emptyLabel="Загрузить ролик"
                  downloadLabel="Скачать ролик"
                  name={form.creative?.name}
                  url={form.creative?.url}
                  addedAt={form.creative?.addedAt}
                  onPick={(creative) => set('creative', creative)}
                />
              </Field>
            </div>
          )}
        </dl>
      ) : (
        <div className="space-y-4">
          {/* Срок договора идёт первым — с него заполняют карточку. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Начало">
              <Input
                type="date"
                value={form.start}
                max={form.end || undefined}
                onChange={(e) => set('start', e.target.value)}
              />
            </Field>
            <Field label="Окончание">
              <Input
                type="date"
                value={form.end}
                min={form.start || undefined}
                onChange={(e) => set('end', e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Номер договора" required error={error}>
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

          {/* Название рекламной кампании и ролик заполняет рекламодатель —
              в форме площадки их нет, но значения показываем справкой. */}
          {(form.campaignName || form.creative) && (
            <div className="rounded-2xl border border-line bg-paper/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                От рекламодателя
              </p>
              <dl className="mt-2 space-y-2">
                <Row label="Рекламная кампания" value={form.campaignName} />
              </dl>
              {form.creative && (
                <button
                  type="button"
                  onClick={() => downloadFile(form.creative)}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-left text-[13px] font-medium text-ink transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-ring"
                >
                  <Film size={16} className="shrink-0 text-indigo-800" />
                  <span className="min-w-0 flex-1 truncate">
                    {form.creative.name}
                  </span>
                  <Download size={15} className="shrink-0 text-ink-muted" />
                </button>
              )}
              {form.creative?.addedAt && (
                <p className="mt-1 text-[11px] text-ink-muted tnum">
                  Ролик добавлен {formatDateTime(form.creative.addedAt)}
                </p>
              )}
            </div>
          )}

          {/* Юр. лицо подставляется из карточки бренда, сроки оплаты живут
              в самом договоре — в форме их не спрашиваем. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Статус договора">
              <Select
                value={form.status ?? 'active'}
                onChange={(e) => set('status', e.target.value)}
              >
                {Object.entries(CONTRACT_STATUS).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </Field>
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
      )}
    </Modal>
  )
}
