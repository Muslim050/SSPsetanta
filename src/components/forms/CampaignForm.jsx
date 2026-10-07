import { useEffect, useState } from 'react'
import { Download, FileText, Film } from 'lucide-react'
// Кампании переехали на сервер. Мок остаётся для разделов, которые ещё
// не подключены: import { useData } from '@/context/DataContext.jsx'
import { useVisibleAdvertisers } from '@/features/advertisers/queries'
import { useSaveCampaign } from '@/features/campaigns/queries'
import { downloadFile } from '@/features/files/download'
import { useAuth } from '@/features/auth/useAuth'
import { useToast } from '@/components/ui/Toast.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { FilePicker } from '@/components/ui/FilePicker.jsx'
import { absoluteUrl } from '@/api/endpoints/files'
import { Logo } from '@/components/Logo'
import { PACKAGES, STATUS, leagueLabel, statusLabel } from '@/lib/metrics.js'
import { formatDate } from '@/lib/format.js'
import { cn } from '@/lib/cn.js'

/**
 * Статусы, которых нет в выборе: оплату ведёт договор — помесячно и своим
 * статусом, — поэтому у кампании такой статус её дублировал бы. Архив
 * отсюда тоже не ставится.
 */
const HIDDEN_STATUS = ['archived', 'awaiting_payment', 'paid']

const emptyForm = {
  name: '',
  objective: 'awareness',
  status: 'sent',
  startDate: '',
  endDate: '',
  // Ролик приходит из выбранной рекламной кампании — дефолта нет.
  // Внутри — `{ id?, name, url, addedAt }`: id есть у своего файла,
  // у ролика договора его нет, такой уходит ссылкой.
  creative: null,
  contractNumber: '',
  // Бренд заявки — выбирает только площадка на создании.
  advertiserId: null,
}

/** Имя файла из ссылки — подпись ролику, если своей нет. */
const fileNameFromUrl = (url) => (url ? url.split('/').pop() || '' : '')

/**
 * Ролик кампании: загруженный файл лежит в `creative`, у записей постарше
 * вместо него внешняя ссылка в `creativeUrl`.
 */
const campaignCreative = (campaign) => {
  if (campaign.creative?.url) return { ...campaign.creative }
  if (!campaign.creativeUrl) return null
  return {
    name: campaign.creativeName || fileNameFromUrl(campaign.creativeUrl),
    url: campaign.creativeUrl,
    addedAt: campaign.creativeAddedAt || '',
  }
}

/**
 * Ролик в полях запроса. Свой файл уходит идентификатором из загрузчика;
 * ролик договора — ссылкой: id файла договор наружу не отдаёт, только
 * `{name, url, addedAt}`. Ссылка обязана быть абсолютной — `creativeUrl`
 * сервер проверяет как URL.
 */
const creativeInput = (creative) => {
  if (creative?.id) {
    // Файл заменяет ссылку: иначе в кампании осталось бы два ролика сразу.
    return {
      creativeId: creative.id,
      creativeUrl: '',
      creativeName: '',
      creativeAddedAt: null,
    }
  }
  return {
    creativeId: null,
    creativeUrl: creative ? absoluteUrl(creative.url) : '',
    creativeName: creative?.name ?? '',
    // Дату загрузки ставим сами, если ролик появился только что.
    creativeAddedAt: creative
      ? creative.addedAt || new Date().toISOString()
      : null,
  }
}

/** Срок договора одной строкой: «01.01.2026 — 31.12.2026». */
const contractTerm = (contract) =>
  [contract?.start, contract?.end].filter(Boolean).map(formatDate).join(' — ')

/** Кампания с сервера → состояние формы. */
const formFrom = (campaign) => ({
  name: campaign.name,
  objective: campaign.objective || 'awareness',
  status: campaign.status,
  startDate: campaign.startDate ?? '',
  endDate: campaign.endDate ?? '',
  creative: campaignCreative(campaign),
  contractNumber: campaign.contractNumber || '',
})

/**
 * Создание и правка заявки. Заводит заявку рекламодатель — за свой бренд —
 * или площадка за выбранный бренд: тогда сервер ставит статус «Получен».
 * `defaultAdvertiserId` — бренд, который подставить площадке сразу
 * (например, открыта его вкладка).
 */
export function CampaignForm({ open, onClose, initial, defaultAdvertiserId }) {
  const { mutate: saveCampaign, isPending } = useSaveCampaign()
  const { data: advertisers = [] } = useVisibleAdvertisers()
  const { user, isAdmin, isAdvertiser } = useAuth()
  const toast = useToast()
  const editing = !!initial
  // Статус ведёт площадка и только у заведённой заявки.
  const showStatus = isAdmin && editing
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  // Бренд выбирает площадка, когда сама заводит заявку: своего бренда у неё
  // нет, и сервер ждёт `advertiserId` в теле.
  const pickBrand = !editing && !isAdvertiser
  // Бренд заявки: у рекламодателя свой — сервер берёт его из сессии, у
  // правимой кампании — её, у новой заявки площадки — выбранный. У уже
  // заведённой заявки бренд не меняется.
  const advertiserId = editing
    ? initial.advertiserId
    : pickBrand
      ? form.advertiserId
      : user?.advertiserId
  const advertiser = advertisers.find((a) => a.id === advertiserId)
  // Ролик обязателен у новой заявки, если так отмечено у бренда
  // (`isCreativeRequired`). Флага нет — ролик необязателен.
  const creativeRequired = !editing && advertiser?.isCreativeRequired === true
  // Договоры бренда — из них выбирается номер, всё остальное сервер
  // подставит в кампанию сам.
  const contracts = advertiser?.contracts ?? []
  const selectedContract = contracts.find(
    (c) => c.number === form.contractNumber,
  )
  // Рекламодателю ролик приходит из договора — он его не правит и не грузит.
  const creativeLocked = isAdvertiser && !!selectedContract?.creative
  // Ролик заявки. Если поле заблокировано, а своего ролика у кампании нет,
  // берём ролик договора: иначе заявка с другим названием осталась бы без
  // ролика, а загрузить свой рекламодатель не может — поле закрыто.
  const creative =
    form.creative ?? (creativeLocked ? selectedContract.creative : null)

  useEffect(() => {
    if (!open) return
    setForm(
      initial
        ? formFrom(initial)
        : { ...emptyForm, advertiserId: defaultAdvertiserId ?? null },
    )
    setErrors({})
    // Зависимости — по id: после сохранения список обновится, и форма иначе
    // сбросила бы несохранённые правки сама на себя.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  /** Сменили бренд — его договоры другие, выбранный номер сбрасываем. */
  const pickAdvertiser = (id) => {
    setForm((f) => ({ ...f, advertiserId: id, contractNumber: '' }))
    // У другого бренда ролик может быть необязательным.
    setErrors((e) => ({ ...e, advertiserId: undefined, creative: undefined }))
  }

  /**
   * Выбрали рекламную кампанию — вместе с ней подтягивается ролик договора.
   * Дальше это снимок: правка договора существующие кампании не меняет.
   */
  const selectCampaign = (name) => {
    const creative =
      name && name === selectedContract?.campaignName
        ? selectedContract.creative
        : null
    setForm((f) => ({ ...f, name, ...(creative ? { creative } : null) }))
  }

  /** Выбрали или убрали ролик. Загрузчик отдаёт `{ id, name, url, addedAt }`. */
  const pickCreative = (file) => {
    setForm((f) => ({ ...f, creative: file }))
    setErrors((e) => ({ ...e, creative: undefined }))
  }

  const submit = () => {
    const err = {}
    if (pickBrand && !form.advertiserId)
      err.advertiserId = 'Выберите рекламодателя'
    if (!form.name.trim()) err.name = 'Укажите название'
    if (!form.startDate) err.startDate = 'Укажите начало периода'
    if (!form.endDate) err.endDate = 'Укажите окончание периода'
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      err.endDate = 'Окончание должно быть позже начала'
    }
    if (creativeRequired && !creative) {
      err.creative = 'Загрузите рекламный ролик'
    }
    setErrors(err)
    if (Object.keys(err).length) return

    const campaign = {
      name: form.name.trim(),
      objective: form.objective,
      startDate: form.startDate,
      endDate: form.endDate,
      // Условия договора сервер проставляет сам по его номеру: пакет, лиги,
      // юр. лицо, срок и дату оплаты отправлять не нужно.
      contractNumber: form.contractNumber.trim(),
      ...creativeInput(creative),
    }
    // Статус ведёт площадка, и только у существующей заявки: новую сервер
    // заводит сам — «Отправлен» у рекламодателя, «Получен» у площадки.
    if (editing && isAdmin) campaign.status = form.status
    // Площадка заводит заявку за бренд — без него сервер отвечает 400.
    if (pickBrand) campaign.advertiserId = form.advertiserId

    saveCampaign(
      { id: initial?.id, campaign },
      {
        onSuccess: () => {
          if (
            editing &&
            campaign.status &&
            campaign.status !== initial.status
          ) {
            // Смена статуса — событие само по себе, о нём говорим отдельно.
            toast.success(
              `«${campaign.name}»: ${statusLabel(initial.status)} → ${statusLabel(
                campaign.status,
              )}`,
            )
          } else {
            toast.success(editing ? 'Кампания обновлена' : 'Кампания создана')
          }
          onClose()
        },
        onError: (err2) => {
          // Сервер вернул ошибки по полям — показываем их прямо в форме.
          if (err2.fields && Object.keys(err2.fields).length) {
            setErrors(err2.fields)
          }
          toast.error(err2.message || 'Не удалось сохранить кампанию')
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      logo={<Logo size={40} withWord={false} />}
      title={editing ? 'Редактировать кампанию' : 'Новая кампания'}
      description={
        editing
          ? 'Обновите параметры кампании.'
          : 'Заполните параметры запуска кампаний.'
      }
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" onClick={submit} disabled={isPending}>
            {isPending
              ? 'Сохраняем…'
              : editing
                ? 'Сохранить'
                : 'Создать кампанию'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Площадка сначала выбирает рекламодателя: от него зависят договоры. */}
        {pickBrand && (
          <Field label="Рекламодатель" required error={errors.advertiserId}>
            <Select
              value={form.advertiserId ?? ''}
              onChange={(e) => pickAdvertiser(Number(e.target.value) || null)}
            >
              <option value="">— выберите рекламодателя —</option>
              {[...advertisers]
                .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </Select>
          </Field>
        )}

        {/* Период кампании идёт первым — с него начинают заполнять форму. */}
        <div>
          <p className="mb-2 text-[13px] font-medium text-ink-soft">
            Период кампании <span className="text-danger">*</span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Начало периода" required error={errors.startDate}>
              <Input
                type="date"
                value={form.startDate}
                max={form.endDate || undefined}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </Field>
            <Field label="Окончание периода" required error={errors.endDate}>
              <Input
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(e) => set('endDate', e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Сначала договор, затем рекламная кампания из него: с ней в форму
            приходит ролик, а на сервере — условия договора. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Номер договора"
            error={errors.contractNumber}
            hint={
              contracts.length
                ? 'Пакет, лиги, юр. лицо и срок сервер подставит из договора.'
                : 'У бренда нет договоров — добавьте их в карточке рекламодателя.'
            }
          >
            {contracts.length ? (
              <Select
                value={form.contractNumber}
                onChange={(e) => set('contractNumber', e.target.value)}
              >
                <option value="">— выберите договор —</option>
                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.number}>
                    {contract.number}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={form.contractNumber}
                onChange={(e) => set('contractNumber', e.target.value)}
                placeholder="Например, Д-2026/114"
              />
            )}
          </Field>

          {/* Название кампании вписывают руками. Совпало с названием из
              договора — вместе с ним подтянется ролик. */}
          <Field
            label="Рекламная кампания"
            required
            error={errors.name}
            hint={
              selectedContract?.campaignName
                ? `В договоре указана: ${selectedContract.campaignName}`
                : undefined
            }
          >
            <Input
              list={
                selectedContract?.campaignName
                  ? 'contract-campaigns'
                  : undefined
              }
              value={form.name}
              onChange={(e) => selectCampaign(e.target.value)}
              placeholder="Например, Летняя распродажа"
            />
            {selectedContract?.campaignName && (
              <datalist id="contract-campaigns">
                <option value={selectedContract.campaignName} />
              </datalist>
            )}
          </Field>
        </div>

        {/* Пакет и лиги ведёт площадка в договоре: сервер снимает их с него
            сам и на запись у кампании закрывает. Здесь только показываем. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Пакет"
            hint={
              selectedContract ? undefined : 'Появится из выбранного договора.'
            }
          >
            <Input
              value={PACKAGES[selectedContract?.package]?.label ?? ''}
              placeholder="Из договора"
              disabled
              readOnly
            />
          </Field>

          <Field
            label="Лиги"
            hint={
              selectedContract ? undefined : 'Появятся из выбранного договора.'
            }
          >
            <Input
              value={(selectedContract?.leagues ?? [])
                .map(leagueLabel)
                .join(', ')}
              placeholder="Из договора"
              disabled
              readOnly
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Срок договора менять отсюда нельзя — он живёт в карточке бренда. */}
          <Field
            label="Срок договора"
            hint={
              selectedContract ? undefined : 'Появится из выбранного договора.'
            }
          >
            <Input
              value={contractTerm(selectedContract)}
              placeholder="Из договора"
              disabled
              readOnly
            />
          </Field>

          <Field
            label="Рекламный ролик"
            required={creativeRequired}
            error={errors.creative}
            hint={
              creativeLocked
                ? 'Ролик приходит из выбранного договора'
                : 'Выберите ролик или перетащите файл'
            }
          >
            <FilePicker
              kind="creative"
              name={creative?.name}
              url={creative?.url}
              addedAt={creative?.addedAt}
              accept="video/*"
              icon={Film}
              emptyLabel="Загрузить ролик"
              downloadLabel="Посмотреть ролик"
              action="open"
              onPick={pickCreative}
              disabled={creativeLocked}
            />
          </Field>
        </div>

        {/* Файл договора и статус — в одну строку; без статуса файл на всю ширину. */}
        <div className={cn('grid gap-4', showStatus && 'sm:grid-cols-2')}>
          {/* Скан договора: скачивание закрыто токеном, поэтому не ссылка,
              а кнопка — файл тянем транспортом и отдаём блобом. */}
          <Field label="Файл договора">
            {selectedContract?.file?.url ? (
              <button
                type="button"
                onClick={() => downloadFile(selectedContract.file)}
                className="flex h-11 w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 text-left text-[13px] font-medium text-ink transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-ring"
              >
                <FileText size={16} className="shrink-0 text-indigo-800" />
                <span className="min-w-0 flex-1 truncate">
                  {selectedContract.file.name}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-ink-muted">
                  <Download size={15} />
                  Скачать договор
                </span>
              </button>
            ) : (
              <div className="flex h-11 items-center gap-2 rounded-xl border border-dashed border-line px-3 text-[13px] text-ink-muted">
                <FileText size={16} className="shrink-0" />
                {selectedContract ? 'К договору не приложен' : 'Из договора'}
              </div>
            )}
          </Field>

          {showStatus && (
            <Field label="Статус">
              <Select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                {Object.entries(STATUS)
                  // Скрытый статус оставляем, если он уже стоит у кампании:
                  // иначе select показал бы первый вариант и сохранение молча
                  // сменило бы статус заявки.
                  .filter(
                    ([k]) => !HIDDEN_STATUS.includes(k) || k === form.status,
                  )
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
              </Select>
            </Field>
          )}
        </div>
      </div>
    </Modal>
  )
}
