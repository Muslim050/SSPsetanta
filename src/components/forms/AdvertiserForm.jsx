import { useEffect, useState } from 'react'
import { Check, FileText, Image as ImageIcon, Plus, Trash2 } from 'lucide-react'
import { Logo } from '@/components/Logo'
import {
  partialSaveOf,
  useSaveAdvertiser,
} from '@/features/advertisers/queries'
import { contractFileInput } from '@/features/contracts/files'
import { useDeleteContract } from '@/features/contracts/queries'
import { reportContractDeleteError } from '@/features/contracts/deleteError'
import { fileHref } from '@/features/files/download'
import { useToast } from '@/components/ui/Toast.jsx'
import { useConfirm } from '@/components/ui/Confirm.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { MultiSelect } from '@/components/ui/MultiSelect.jsx'
import { FilePicker } from '@/components/ui/FilePicker.jsx'
import { SegmentTabs } from '@/components/ui/Tabs.jsx'
import { ADV_STATUS, LEAGUES, PACKAGES } from '@/lib/metrics.js'
import { uid } from '@/lib/id.js'
import { cn } from '@/lib/cn.js'

const PALETTE = [
  '#FFD106',
  '#0EA5E9',
  '#12A150',
  '#E5484D',
  '#8B5CF6',
  '#F59E0B',
  '#EC4899',
]

const emptyForm = {
  name: '',
  contact: '',
  email: '',
  category: 'Финансы',
  status: 'active',
  balance: '',
  legalName: '',
  requisites: '',
  color: PALETTE[0],
  // Логотип бренда: { name, url } либо null.
  logo: null,
  contracts: [],
}

/** Слепок договоров — по нему понимаем, менялся ли раздел «Договоры». */
const contractsFingerprint = (contracts = []) =>
  JSON.stringify(
    contracts.map((contract) => ({
      id: contract.id,
      number: (contract.number ?? '').trim(),
      campaignName: (contract.campaignName ?? '').trim(),
      legalName: (contract.legalName ?? '').trim(),
      package: contract.package ?? '',
      leagues: [...(contract.leagues ?? [])],
      start: contract.start ?? '',
      end: contract.end ?? '',
      paymentDate: contract.paymentDate ?? '',
      file: contract.file?.url ?? null,
      creative: contract.creative?.url ?? null,
    })),
  )

/**
 * Логотип для формы. Загруженный файл приходит отдельным полем `logoFile`;
 * у брендов, чей логотип лежит на чужом хосте, вместо него ссылка в `logo` —
 * имя файла достаём из неё.
 */
const logoToFile = (advertiser) => {
  const file = advertiser?.logoFile
  if (file?.url) return { ...file }

  const logo = advertiser?.logo
  if (!logo) return null
  return { name: logo.split('/').pop() || 'Логотип', url: logo }
}

const REQUISITES_LABELS = {
  inn: 'ИНН',
  account: 'Р/с',
  bank: 'Банк',
  mfo: 'МФО',
  oked: 'ОКЭД',
  vat: 'НДС',
  address: 'Адрес',
  phone: 'Телефон',
  email: 'Email',
}

/** В старых записях реквизиты лежат объектом — в форме показываем их текстом. */
const requisitesToText = (requisites) => {
  if (!requisites) return ''
  if (typeof requisites === 'string') return requisites
  return Object.entries(REQUISITES_LABELS)
    .filter(([key]) => requisites[key])
    .map(([key, label]) => `${label}: ${requisites[key]}`)
    .join('\n')
}

/** Пустой договор бренда — из него кампания берёт номер и условия. */
const newContract = (legalName = '') => ({
  id: uid('ctr'),
  number: '',
  // Рекламная кампания, под которую заключён договор.
  campaignName: '',
  legalName,
  package: '',
  leagues: [],
  start: '',
  end: '',
  paymentDate: `${new Date().getFullYear()}-08-31`,
  file: null,
  // Ролик договора — подставляется в кампании по этому договору.
  creative: null,
})

/** Пустая строка в поле-дате означает «не задано» — сервер ждёт null. */
const dateOrNull = (value) => (value?.trim() ? value : null)

/**
 * Оставляет у договора только то, что принимает API: суммы он здесь
 * не редактирует. Файлы едут отдельными полями — id из загрузчика.
 */
const toContractInput = (contract, before) => ({
  id: contract.id,
  number: contract.number.trim(),
  campaignName: (contract.campaignName ?? '').trim(),
  legalName: (contract.legalName ?? '').trim(),
  package: contract.package ?? '',
  leagues: [...(contract.leagues ?? [])],
  start: dateOrNull(contract.start),
  end: dateOrNull(contract.end),
  paymentDate: dateOrNull(contract.paymentDate),
  ...contractFileInput(contract, before),
})

/** Карточка с сервера → состояние формы. */
const formFrom = (advertiser) => ({
  name: advertiser.name,
  contact: advertiser.contact,
  email: advertiser.email,
  category: advertiser.category,
  status: advertiser.status,
  balance: String(advertiser.balance),
  legalName: advertiser.legalName || '',
  requisites: requisitesToText(advertiser.requisites),
  color: advertiser.color,
  logo: logoToFile(advertiser),
  contracts: (advertiser.contracts ?? []).map((contract) => ({
    ...contract,
    leagues: [...(contract.leagues ?? [])],
  })),
})

export function AdvertiserForm({ open, onClose, initial }) {
  const { mutate: saveAdvertiser, isPending } = useSaveAdvertiser()
  const { mutate: deleteContract, isPending: deletingContract } =
    useDeleteContract()
  const toast = useToast()
  const confirm = useConfirm()
  const editing = !!initial
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [tab, setTab] = useState('main')
  // Подтверждение на кнопке: карточка после сохранения остаётся открытой.
  const [saved, setSaved] = useState(false)
  // Карточка в том виде, в каком она сейчас на сервере. После сохранения
  // заменяется свежим ответом: там уже есть id созданных договоров, и с ним
  // же сравниваются следующие правки.
  const [source, setSource] = useState(initial)
  // Бренд, заведённый в сорванном сохранении. Держим отдельно от source:
  // карточку могло не выйти перечитать, но id уже занят, и повтор должен
  // править его, а не заводить второй.
  const [createdId, setCreatedId] = useState(null)
  const logoPreview = fileHref(form.logo?.url)

  /**
   * Переносит форму на то, что реально лежит на сервере, не трогая ввод:
   * source становится новой опорой для диффа, а договорам, которые успели
   * создаться, локальный id меняется на серверный. Сопоставляем по номеру —
   * договор без номера форма и не отправляет.
   */
  const adoptServerState = (fresh) => {
    setSource(fresh)
    const savedIdByNumber = new Map(
      (fresh.contracts ?? []).map((contract) => [
        (contract.number ?? '').trim(),
        contract.id,
      ]),
    )
    setForm((current) => ({
      ...current,
      contracts: current.contracts.map((contract) =>
        typeof contract.id === 'number'
          ? contract
          : {
              ...contract,
              id:
                savedIdByNumber.get((contract.number ?? '').trim()) ??
                contract.id,
            },
      ),
    }))
  }

  // Держим «Сохранено» на кнопке и закрываем карточку: список под ней уже
  // перечитан, и правку — например, новый логотип — видно сразу.
  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(onClose, 900)
    return () => clearTimeout(timer)
    // onClose родитель отдаёт новой функцией на каждый рендер: держать его
    // в зависимостях нельзя, иначе обновление списка перезапускало бы таймер.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved])

  useEffect(() => {
    if (!open) return
    setTab('main')
    setSource(initial)
    setCreatedId(null)
    setForm(initial ? formFrom(initial) : emptyForm)
    setErrors({})
    setSaved(false)
    // Зависимости — по id: после сохранения бренд в сторе обновится, и форма
    // иначе сбросила бы несохранённые правки сама на себя.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const addContract = () =>
    setForm((f) => ({
      ...f,
      contracts: [...f.contracts, newContract(f.legalName.trim())],
    }))

  const setContract = (id, patch) =>
    setForm((f) => ({
      ...f,
      contracts: f.contracts.map((contract) =>
        contract.id === id ? { ...contract, ...patch } : contract,
      ),
    }))

  /**
   * Новый договор просто убираем из формы. Сохранённый удаляем на сервере
   * сразу, с подтверждением: ждать «Сохранить» здесь неочевидно, и к тому же
   * сохранение упирается в проверку полей бренда на другой вкладке.
   */
  const removeContract = async (contract) => {
    const dropFromForm = () =>
      setForm((f) => ({
        ...f,
        contracts: f.contracts.filter((item) => item.id !== contract.id),
      }))
    if (typeof contract.id !== 'number') {
      dropFromForm()
      return
    }

    const ok = await confirm({
      title: 'Удалить договор?',
      description: contract.number,
      body: 'Кампании, оформленные по нему, останутся — у них сохранится номер договора.',
    })
    if (!ok) return

    deleteContract(
      { advertiserId: source?.id ?? createdId, id: contract.id },
      {
        onSuccess: () => {
          dropFromForm()
          // Договора на сервере больше нет — убираем его и из опоры для
          // сравнения, иначе «Сохранить» попробовал бы удалить его ещё раз.
          setSource(
            (current) =>
              current && {
                ...current,
                contracts: (current.contracts ?? []).filter(
                  (item) => item.id !== contract.id,
                ),
              },
          )
          toast.info('Договор удалён')
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

  const submit = () => {
    const err = {}
    if (!form.name.trim()) err.name = 'Укажите название'
    if (!form.email.trim() || !form.email.includes('@'))
      err.email = 'Некорректный email'
    setErrors(err)
    if (Object.keys(err).length) {
      // Поля бренда — на вкладке «Реквизиты»: с вкладки договоров ошибку
      // иначе не видно, и кажется, что «Сохранить» не сработал.
      setTab('main')
      toast.error('Заполните обязательные поля бренда')
      return
    }

    const advertiser = {
      name: form.name.trim(),
      contact: form.contact.trim(),
      email: form.email.trim(),
      category: form.category,
      status: form.status,
      // Суммы на сервере — decimal, то есть строка.
      balance: String(Number(form.balance) || 0),
      legalName: form.legalName.trim(),
      requisites: form.requisites.trim(),
      color: form.color,
    }

    // Логотип: файл уходит идентификатором из загрузчика, логотип на чужом
    // хосте — ссылкой. Нетронутый не отправляем вовсе, иначе правка одного
    // поля бренда переписывала бы и его.
    const before = logoToFile(source)
    if ((form.logo?.url ?? null) !== (before?.url ?? null)) {
      if (form.logo?.id) advertiser.logoId = form.logo.id
      else if (!form.logo) {
        advertiser.logoId = null
        advertiser.logo = ''
      } else advertiser.logo = form.logo.url
    }

    // Договоры без номера не сохраняем — из них нечего выбирать в кампании.
    const previousById = new Map(
      (source?.contracts ?? []).map((contract) => [contract.id, contract]),
    )
    const contracts = form.contracts
      .filter((contract) => contract.number.trim())
      .map((contract) =>
        toContractInput(contract, previousById.get(contract.id)),
      )

    const contractsChanged =
      contractsFingerprint(contracts) !==
      contractsFingerprint(source?.contracts)

    saveAdvertiser(
      {
        id: source?.id ?? createdId,
        advertiser,
        contracts,
        previousAdvertiser: source,
        previousContracts: source?.contracts ?? [],
      },
      {
        onSuccess: (fresh) => {
          // Переносим форму на свежее состояние: если сохранение сорвётся
          // на следующем шаге, повтор не выполнит уже применённые правки.
          setSource(fresh)
          setForm(formFrom(fresh))
          if (editing) {
            // Про договоры говорим отдельно — их правят чаще остального.
            toast.success(
              contractsChanged
                ? `Раздел «Договоры» у рекламодателя ${advertiser.name} успешно обновлён`
                : `Карточка бренда ${advertiser.name} сохранена`,
            )
            // Карточка закроется сама, показав «Сохранено».
            setSaved(true)
            return
          }
          toast.success(`Рекламодатель ${advertiser.name} добавлен`)
          onClose()
        },
        onError: (err) => {
          // Цепочка сохранения неатомарна: часть запросов могла примениться
          // до сбоя. Переводим форму на фактическое состояние сервера,
          // сохраняя несохранённый ввод, — иначе повтор завёл бы второй
          // бренд или дубли уже созданных договоров.
          const partial = partialSaveOf(err)
          if (partial) {
            setCreatedId(partial.advertiserId)
            if (partial.advertiser) adoptServerState(partial.advertiser)
          }

          // Сервер вернул ошибки по полям — показываем их прямо в форме.
          if (err.fields && Object.keys(err.fields).length) {
            setErrors(err.fields)
          }

          const message = err.message || 'Не удалось сохранить рекламодателя'
          toast.error(
            // Бренд завели мы же, в этой попытке: без этой оговорки человек
            // закроет карточку и заведёт его ещё раз.
            partial && !editing
              ? `${message}. Бренд ${advertiser.name} уже заведён — сохраните ещё раз, дубля не будет`
              : message,
          )
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      logo={<Logo size={40} withWord={false} />}
      title={editing ? 'Редактировать рекламодателя' : 'Новый рекламодатель'}
      description="Карточка бренда с контактами."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {editing ? 'Закрыть' : 'Отмена'}
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={saved || isPending}
          >
            {saved ? (
              <>
                <Check size={16} />
                Сохранено
              </>
            ) : isPending ? (
              'Сохраняем…'
            ) : editing ? (
              'Сохранить'
            ) : (
              'Добавить'
            )}
          </Button>
        </>
      }
    >
      <SegmentTabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'main', label: 'Реквизиты' },
          {
            value: 'contracts',
            label: 'Договоры',
            count: form.contracts.length,
          },
        ]}
      />

      <div className={cn('space-y-4', tab !== 'main' && 'hidden')}>
        <Field label="Название бренда" required error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Как бренд будет подписан в кабинете"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Контактное лицо">
            <Input
              value={form.contact}
              onChange={(e) => set('contact', e.target.value)}
              placeholder="Имя Фамилия"
            />
          </Field>
          <Field label="Email" required error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="name@brand.ru"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Подставляется в договоры бренда и в кампании. */}
          <Field label="Наименование юр. лица">
            <Input
              value={form.legalName}
              onChange={(e) => set('legalName', e.target.value)}
              placeholder="ООО «Пример»"
            />
          </Field>

          {/* Тот же статус, что в плитке бренда: активен или завершен. */}
          <Field label="Статус">
            <Select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              {Object.entries(ADV_STATUS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Реквизиты"
          hint="По строке на пункт: ИНН, банк, счёт, адрес."
        >
          <Textarea
            rows={7}
            value={form.requisites}
            onChange={(e) => set('requisites', e.target.value)}
            className="min-h-[164px]"
            // Формат вместо примера: настоящие реквизиты в подсказке
            // легко принять за уже заполненные.
            placeholder={
              'ИНН: 9 цифр\nБанк: название банка, город\nМФО: 5 цифр\nР/с: 20 цифр\nАдрес: город, улица, дом'
            }
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Цвет бренда">
            <div className="flex flex-wrap gap-2 pt-1">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  className={cn(
                    'h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-surface transition-all',
                    form.color === c
                      ? 'ring-ink/40 scale-110'
                      : 'ring-transparent',
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </Field>

          {/* Логотип показывается вместо инициалов в карточках и таблицах. */}
          <Field
            label="Логотип рекламодателя"
            hint="Выберите логотип или перетащите файл"
          >
            <div className="flex items-center gap-3">
              {logoPreview && (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
                  <img
                    src={logoPreview}
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                </span>
              )}
              <FilePicker
                accept="image/*"
                icon={ImageIcon}
                kind="logo"
                emptyLabel="Загрузить логотип"
                name={form.logo?.name}
                url={form.logo?.url}
                addedAt={form.logo?.addedAt}
                onPick={(logo) => set('logo', logo)}
                className="min-w-0 flex-1"
              />
            </div>
          </Field>
        </div>
      </div>

      <div className={cn('space-y-3', tab !== 'contracts' && 'hidden')}>
        {!form.contracts.length && (
          <div className="rounded-2xl border border-dashed border-line p-6 text-center">
            <FileText size={24} className="mx-auto text-ink-muted" />
            <p className="mt-3 text-sm font-medium text-ink-soft">
              Договоров пока нет
            </p>
            <p className="mt-1 text-[13px] text-ink-muted">
              Из этих договоров рекламодатель выбирает номер при создании
              кампании.
            </p>
          </div>
        )}

        {form.contracts.map((contract, index) => (
          <div
            key={contract.id}
            className="space-y-4 rounded-2xl border border-line bg-paper/55 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Договор {index + 1}
              </p>
              <Button
                size="sm"
                variant="danger"
                className="h-8 w-8 px-0"
                onClick={() => removeContract(contract)}
                disabled={deletingContract}
                title="Удалить договор"
                aria-label={`Удалить договор ${index + 1}`}
              >
                <Trash2 size={15} />
              </Button>
            </div>

            {/* Срок договора идёт первым — с него заполняют карточку. */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Начало">
                <Input
                  type="date"
                  value={contract.start}
                  max={contract.end || undefined}
                  onChange={(e) =>
                    setContract(contract.id, { start: e.target.value })
                  }
                />
              </Field>
              <Field label="Окончание">
                <Input
                  type="date"
                  value={contract.end}
                  min={contract.start || undefined}
                  onChange={(e) =>
                    setContract(contract.id, { end: e.target.value })
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Номер договора" required>
                <Input
                  value={contract.number}
                  onChange={(e) =>
                    setContract(contract.id, { number: e.target.value })
                  }
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
                  name={contract.file?.name}
                  url={contract.file?.url}
                  addedAt={contract.file?.addedAt}
                  onPick={(file) => setContract(contract.id, { file })}
                />
              </Field>
            </div>

            {/* Юр. лицо и сроки оплаты берём из карточки бренда и договора —
                в самой форме договора их не спрашиваем. */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Пакет">
                <Select
                  value={contract.package}
                  onChange={(e) =>
                    setContract(contract.id, { package: e.target.value })
                  }
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
                  value={contract.leagues}
                  onChange={(leagues) => setContract(contract.id, { leagues })}
                  placeholder="— не выбраны —"
                />
              </Field>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={addContract}>
            <Plus size={16} />
            Добавить договор
          </Button>
          {/* Договоры живут в карточке бренда — сохраняются вместе с ней. */}
          <p className="text-[12px] text-ink-muted">
            Договоры сохранятся вместе с карточкой — нажмите «
            {editing ? 'Сохранить' : 'Добавить'}» внизу.
          </p>
        </div>
      </div>
    </Modal>
  )
}
