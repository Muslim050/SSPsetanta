import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutationState } from '@tanstack/react-query'
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  History,
  Upload,
} from 'lucide-react'
import { isApiError } from '@/api/errors'
import { useAuth } from '@/features/auth/useAuth'
import {
  reportKeys,
  useExportReport,
  useImportReport,
  useReport,
  useReportImports,
  useReportMonths,
  useManualReport,
  useTotalStatistics,
} from '@/features/reports/queries'
import { spotSummary, totalSummary } from '@/features/reports/summary'
import { fileHref } from '@/features/files/download'
import { useToast } from '@/components/ui/Toast.jsx'
import { useConfirm } from '@/components/ui/Confirm.jsx'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal.jsx'
import { Loader } from '@/components/ui/Loader.jsx'
import { formatDateTime } from '@/lib/format.js'
import { cn } from '@/lib/cn.js'
import { MONTHS_FULL } from './MonthTabs.jsx'
import { CampaignTabs, useCampaignTabs } from './CampaignMediaTabs.jsx'
import { ReportSheetTable } from './ReportSheetTable.jsx'
import { Materialize, TableGenerating } from './ReportUploadEffects.jsx'
import {
  ChannelSummaryReport,
  TotalStatisticsReport,
} from './CampaignReportPanels.jsx'

/**
 * Вкладки листов из файла отчёта — постоянные, их не добавляют и не
 * убирают. Соцсеть в файле одним листом, а вкладок две: по сети на каждую.
 */
const REPORT_GROUPS = [
  {
    name: 'Live spot',
    items: [
      { value: 'live1', code: 'live1', label: 'Setanta Sports 1' },
      { value: 'live2', code: 'live2', label: 'Setanta Sports 2' },
    ],
  },
  {
    name: 'Standart spot',
    items: [
      { value: 'ss1uzb', code: 'ss1uzb', label: 'SS1' },
      { value: 'ss2uzb', code: 'ss2uzb', label: 'SS2' },
    ],
  },
  {
    name: 'Event promo',
    items: [
      { value: 'promo1', code: 'promo1', label: 'SS1' },
      { value: 'promo2', code: 'promo2', label: 'SS2' },
    ],
  },
  {
    name: 'Social media',
    items: [
      {
        value: 'social_ig',
        code: 'social',
        network: 'instagram',
        label: 'Instagram',
      },
      {
        value: 'social_tg',
        code: 'social',
        network: 'telegram',
        label: 'Telegram',
      },
    ],
  },
  {
    name: 'OTT',
    items: [
      { value: 'ottlive', code: 'ottlive', label: 'Live spot' },
      { value: 'ottpreroll', code: 'ottpreroll', label: 'Preroll' },
    ],
  },
].map((group) => ({
  ...group,
  items: group.items.map((item) => ({
    ...item,
    kind: 'report',
    group: group.name,
  })),
}))

/** `2026-01` → «январь 2026». */
function periodLabel(period) {
  const [year, month] = String(period ?? '').split('-')
  const name = MONTHS_FULL[Number(month) - 1]
  return name ? `${name.toLowerCase()} ${year}` : period
}

// Файл за другой месяц сервер описывает одной строкой в details. Отдельного
// кода у неё нет, поэтому узнаём по тексту (docs/backend.md, п. 3.26).
const WRONG_PERIOD = /^Файл не за выбранный месяц/

/**
 * Ошибки разбора файла. Файл не за тот месяц — частый случай: выбрали не ту
 * вкладку месяца или не тот файл. Разбор по строкам тут ничего не даёт,
 * поэтому — короткое предупреждение. Остальное — списком «лист · строка ·
 * колонка».
 */
function ImportErrors({ error, onClose }) {
  // Помним последнюю ошибку: пока окно закрывается, error уже null, и без
  // этого содержимое успевало бы смениться на другой вид.
  const [last, setLast] = useState(error)
  if (error && error !== last) setLast(error)
  const shown = error ?? last
  const wrongPeriod = (shown?.details ?? []).some((detail) =>
    WRONG_PERIOD.test(detail.message),
  )

  const footer = (
    <Button variant="primary" onClick={onClose}>
      Понятно
    </Button>
  )

  if (wrongPeriod) {
    return (
      <Modal
        open={!!error}
        onClose={onClose}
        logo={
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle size={20} />
          </span>
        }
        title="Важно"
        description="Файл не соответствует выбранному месяцу. Проверьте файл перед загрузкой."
        footer={footer}
      />
    )
  }

  return (
    <Modal
      open={!!error}
      onClose={onClose}
      icon={AlertTriangle}
      title="Файл не принят"
      description={shown?.message}
      size="lg"
      footer={footer}
    >
      <ul className="max-h-[420px] divide-y divide-line overflow-auto rounded-2xl border border-line">
        {(shown?.details ?? []).map((detail, index) => {
          // Место ошибки: лист · строка · колонка — чего нет, то пропускаем.
          const place = [
            detail.sheet,
            detail.row != null && `строка ${detail.row}`,
            detail.column,
          ]
            .filter(Boolean)
            .join(' · ')
          return (
            <li key={index} className="px-4 py-2.5 text-[13px]">
              {place && (
                <p className="text-[11px] font-medium text-ink-muted">
                  {place}
                </p>
              )}
              <p className="text-ink">{detail.message}</p>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-[12px] text-ink-muted">
        Файл принимается целиком или никак — ничего не сохранено. Исправьте
        ошибки и загрузите его снова.
      </p>
    </Modal>
  )
}

// Короткие подписи листов — для счётчика строк в истории загрузок.
const SHEET_SHORT = {
  live1: 'Live SS1',
  live2: 'Live SS2',
  ss1uzb: 'SS1',
  ss2uzb: 'SS2',
  promo1: 'Promo SS1',
  promo2: 'Promo SS2',
  social: 'Social',
  ottlive: 'OTT Live',
  ottpreroll: 'OTT Preroll',
}

/**
 * История загрузок файла за месяц — только площадке. Исходный файл каждой
 * загрузки скачивается без токена, поэтому хватает обычной ссылки.
 */
function ImportHistory({ open, onClose, contractId, period }) {
  const { data, isPending, isError } = useReportImports(contractId, period, {
    enabled: open,
  })
  const items = data?.items ?? []

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={History}
      title="История загрузок"
      description={`Файлы статистики за ${periodLabel(period)}, новые сверху`}
      size="lg"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Закрыть
        </Button>
      }
    >
      {isPending ? (
        <p className="py-6 text-center text-[13px] text-ink-muted">
          Загружаем историю…
        </p>
      ) : isError ? (
        <p className="py-6 text-center text-[13px] text-danger">
          Не удалось загрузить историю
        </p>
      ) : !items.length ? (
        <p className="py-6 text-center text-[13px] text-ink-muted">
          Файлов за этот месяц ещё не загружали
        </p>
      ) : (
        <ul className="max-h-[420px] divide-y divide-line overflow-auto rounded-2xl border border-line">
          {items.map((item, index) => (
            <li key={item.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-ink">
                  {formatDateTime(item.at)} · {item.by}
                </p>
                {/* Отчёт сейчас собран из последней загрузки. */}
                {index === 0 && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-900">
                    текущий
                  </span>
                )}
              </div>
              {item.file && (
                <a
                  href={fileHref(item.file.url)}
                  download={item.file.name}
                  className="mt-1 inline-flex max-w-full items-center gap-1.5 text-[12px] text-indigo-900 underline-offset-2 hover:underline"
                >
                  <Download size={13} className="shrink-0" />
                  <span className="truncate">{item.file.name}</span>
                </a>
              )}
              <p className="mt-1 text-[11px] text-ink-muted tnum">
                {Object.entries(item.rowCounts ?? {})
                  .map(
                    ([code, count]) => `${SHEET_SHORT[code] ?? code} ${count}`,
                  )
                  .join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

/**
 * Файл статистики за месяц: загружен ли, когда и кем, плюс загрузка и
 * выгрузка. Загружать может только площадка; скачивать — все.
 */
function ReportFileBar({ contractId, period, months, report, onImported }) {
  const { canEdit, isAdvertiser } = useAuth()
  const canUpload = canEdit && !isAdvertiser
  const toast = useToast()
  const confirm = useConfirm()
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [importError, setImportError] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const { mutate: importReport, isPending: importing } = useImportReport()
  // Имя разбираемого файла — подпись под «проявляющимся» отчётом.
  const [pendingName, setPendingName] = useState('')
  const { mutate: exportReport, isPending: exporting } = useExportReport()

  const month = periodLabel(period)
  const loaded = !!report.data
  const lastImport = report.data?.lastImport

  const upload = async (file) => {
    if (!file || importing) return
    if (!/\.xlsx$/i.test(file.name)) {
      toast.error('Нужен файл Excel в формате .xlsx')
      return
    }
    // Повторная загрузка заменяет файловый отчёт месяца целиком — вместе с
    // правками листов. Ручной отчёт (цифры Spot) отдельный, его она не трогает.
    if (loaded && report.data.reportType !== 'manual') {
      const ok = await confirm({
        title: 'Заменить отчёт?',
        description: `Отчёт за ${month} уже загружен`,
        body: 'Все листы месяца заменятся данными из нового файла, ручные правки листов пропадут. Прежний файл останется в истории загрузок.',
        confirmText: 'Заменить',
      })
      if (!ok) return
    }
    setPendingName(file.name)
    importReport(
      { contractId, period, file },
      {
        onSuccess: () => {
          toast.success(`Отчёт за ${month} загружен`)
          onImported?.()
        },
        onError: (error) => {
          if (isApiError(error) && error.details.length) {
            setImportError(error)
            return
          }
          toast.error(
            (isApiError(error) && error.fields.file) ||
              error.message ||
              'Не удалось загрузить файл',
          )
        },
      },
    )
  }

  const download = () =>
    exportReport(
      { contractId, period },
      {
        onError: (error) =>
          toast.error(error.message || 'Не удалось скачать отчёт'),
      },
    )

  // Ошибка списка месяцев — это не «файла нет»: сервер просто не ответил.
  const status = importing
    ? `Загружаем файл «${pendingName}» — отчёт появится ниже`
    : months.isError
      ? 'Не удалось проверить, загружен ли файл'
      : months.isPending
        ? 'Проверяем, загружен ли файл…'
        : report.isPending && report.fetchStatus !== 'idle'
          ? `Загружаем отчёт за ${month}…`
          : loaded
            ? report.data.reportType === 'manual'
              ? `Отчёт введён вручную на вкладке Spot · ${formatDateTime(report.data.updatedAt)}`
              : lastImport
                ? `Файл загружен ${formatDateTime(lastImport.at)} · ${lastImport.by}`
                : `Обновлён ${formatDateTime(report.data.updatedAt)}`
            : canUpload
              ? `Файл статистики за ${month} ещё не загружен`
              : // Загружает только площадка: остальным говорим, что отчёт
                // в работе, — иначе пустая плашка без кнопки выглядит как поломка.
                'Отчёт в процессе формирования!'

  // Месяц без файла — здесь загрузка главное, что можно сделать. Даём ей
  // целую зону, а не кнопку на краю плашки: на широком экране кнопку там
  // легко не заметить, а плашка на скриншотах режется ровно по ней.
  // Пока файл разбирается, зона сворачивается в плашку: само ожидание
  // рисуется на месте таблицы, туда же, где потом появится отчёт.
  const empty =
    canUpload &&
    !importing &&
    months.isSuccess &&
    !loaded &&
    report.fetchStatus === 'idle'

  const inputId = useId()
  const dragHandlers = {
    onDragOver: (e) => {
      if (!canUpload) return
      e.preventDefault()
      setDragging(true)
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
    },
    onDrop: (e) => {
      if (!canUpload) return
      e.preventDefault()
      setDragging(false)
      upload(e.dataTransfer.files?.[0])
    },
  }

  // Поле файла одно на оба вида: зона загрузки открывает его подписью,
  // кнопка «Заменить файл» — кликом. Невидимое, но доступное с клавиатуры
  // там, где до него добираются Tab'ом, — в зоне загрузки.
  const fileInput = canUpload && (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      accept=".xlsx"
      className="sr-only"
      tabIndex={empty ? 0 : -1}
      disabled={importing}
      onChange={(e) => {
        const file = e.target.files?.[0]
        // Сбрасываем, иначе тот же файл второй раз не выберется.
        e.target.value = ''
        upload(file)
      }}
    />
  )

  const dialogs = (
    <>
      <ImportErrors error={importError} onClose={() => setImportError(null)} />
      {canUpload && (
        <ImportHistory
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          contractId={contractId}
          period={period}
        />
      )}
    </>
  )

  if (empty) {
    return (
      <>
        <motion.label
          htmlFor={inputId}
          {...dragHandlers}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, scale: dragging ? 1.01 : 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="group relative mb-4 block cursor-pointer overflow-hidden rounded-3xl has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-indigo-300"
        >
          {fileInput}
          {/* Бегущая рамка: пока файл держат над зоной, по краю идёт свет. */}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300',
              dragging ? 'opacity-100' : 'opacity-0',
            )}
          >
            <span className="aspect-square w-[150%] shrink-0 animate-glow bg-[conic-gradient(from_0deg,transparent_0deg,#ffd106_70deg,#ff8a3d_140deg,transparent_210deg)]" />
          </span>

          <span
            className={cn(
              'relative m-[2px] flex flex-col items-center gap-4 rounded-[22px] border-2 border-dashed px-6 py-10 text-center transition-colors duration-300',
              dragging
                ? 'border-transparent bg-indigo-50'
                : 'border-indigo-300 bg-surface hover:border-indigo-500 hover:bg-indigo-50/60',
            )}
          >
            <span className="flex flex-col items-center gap-4">
              {/* Иконка парит, а под файлом приподнимается навстречу. */}
              <motion.span
                animate={
                  dragging
                    ? { y: -10, rotate: -8, scale: 1.12 }
                    : { y: 0, rotate: 0, scale: 1 }
                }
                transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-900 shadow-soft"
              >
                <span className={cn('flex', !dragging && 'animate-float')}>
                  <FileSpreadsheet size={26} />
                </span>
              </motion.span>
              <span className="block">
                <span className="block font-display text-lg font-semibold text-ink">
                  {dragging
                    ? 'Отпустите файл — загрузим его за этот месяц'
                    : `Загрузите файл статистики за ${month}`}
                </span>
                <span className="mx-auto mt-1 block max-w-xl text-[13px] text-ink-muted">
                  Перетащите файл .xlsx сюда или выберите его на компьютере.
                  Нужен «Шаблон импортируемого отчёта Setanta Statistics» — все
                  девять листов, даты за этот месяц.
                </span>
              </span>
              {/* Кнопка — только вид: нажатие ловит вся зона-подпись. */}
              <span className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-[13px] font-semibold text-ink shadow-soft transition-transform group-hover:scale-105">
                <Upload size={16} />
                Выбрать файл
              </span>
            </span>
          </span>
        </motion.label>
        {/* Окна — снаружи подписи: клик в них не должен открывать выбор файла. */}
        {dialogs}
      </>
    )
  }

  return (
    <>
      <motion.div
        {...dragHandlers}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'mb-4 flex flex-col gap-3 rounded-2xl border bg-surface p-4 shadow-soft transition-colors sm:flex-row sm:items-center sm:justify-between',
          dragging
            ? 'border-dashed border-indigo-400 bg-indigo-50'
            : 'border-line',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              loaded
                ? 'bg-indigo-100 text-indigo-900'
                : 'bg-ink/6 text-ink-muted',
            )}
          >
            <FileSpreadsheet size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">
              Статистика за {month}
            </p>
            {/* Не обрезаем: подсказка «кто может загрузить» стоит в конце. */}
            <p className="text-[12px] text-ink-muted">
              {dragging
                ? 'Отпустите файл — загрузим его за этот месяц'
                : status}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {loaded && (
            <Button
              size="sm"
              variant="secondary"
              onClick={download}
              disabled={exporting}
              title="Отчёт в .xlsx — в раскладке исходного файла, с учётом правок"
            >
              <Download size={15} />
              {exporting ? 'Готовим файл…' : 'Скачать Excel'}
            </Button>
          )}
          {canUpload && loaded && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHistoryOpen(true)}
              title="Какие файлы загружали за этот месяц"
            >
              <History size={15} />
              История
            </Button>
          )}
          {canUpload && (
            <>
              {fileInput}
              <Button
                size="sm"
                variant={loaded ? 'secondary' : 'primary'}
                onClick={() => inputRef.current?.click()}
                disabled={importing || months.isPending || months.isError}
              >
                <Upload size={15} />
                {importing
                  ? 'Загружаем…'
                  : loaded
                    ? 'Заменить файл'
                    : 'Загрузить файл'}
              </Button>
            </>
          )}
        </div>
      </motion.div>
      {dialogs}
    </>
  )
}

/**
 * Отчёт по договору за месяц: сводки и листы из загруженного файла.
 *
 * Листы — эфиры, логи выходов, промо, соцсети и OTT — приходят с сервера.
 * Сводки Total и Spot считаются из этих листов; вручную в Total ведутся
 * только устройства и география. Без договора листов нет — отчёт ведётся
 * по договору.
 */
export function MediaReport({
  className,
  contractId,
  period,
  emptyHint = 'Выберите договор — отчёт из файла статистики ведётся по договору.',
}) {
  const [tab, setTab] = useState('channels')
  // Сколько раз за месяц загружали файл — по нему проявление играет заново.
  const [reveal, setReveal] = useState(0)
  // Идёт ли разбор файла и какого — из состояния загрузки, её запускает
  // плашка файла, а мутнеть должны таблицы под ней.
  const importingNames = useMutationState({
    filters: { mutationKey: reportKeys.importing(), status: 'pending' },
    select: (mutation) => mutation.state.variables?.file?.name ?? '',
  })
  const importing = importingNames.length > 0
  const months = useReportMonths(contractId)
  const inList = (months.data ?? []).some((item) => item.period === period)
  // Спрашиваем отчёт, только если месяц есть в списке: за месяц без файла
  // сервер отвечает 404. Только что загруженный отчёт уже лежит в кэше.
  const report = useReport(contractId, period, { enabled: inList })
  const sheets = report.data?.sheets ?? []
  // Итоги Total считает сервер по обоим отчётам месяца (`GET …/total-statistics`).
  const totalStats = useTotalStatistics(contractId, period)
  const summary = useMemo(
    () => (totalStats.data ? totalSummary(totalStats.data) : null),
    [totalStats.data],
  )
  const summaryLoading =
    totalStats.isPending && totalStats.fetchStatus !== 'idle'
  // Цифры Spot — отдельный ручной отчёт месяца (`GET …/manual`).
  const manual = useManualReport(contractId, period)
  const spot = useMemo(() => spotSummary(manual.data), [manual.data])

  // Вкладка листа — только если в нём есть строки; у соцсетей — строки этой
  // сети. Группа без вкладок пропадает целиком. У ручного отчёта листов нет —
  // остаются только Total и Spot.
  const reportGroups = useMemo(() => {
    const byCode = Object.fromEntries(
      (report.data?.sheets ?? []).map((item) => [item.code, item]),
    )
    return REPORT_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const rows = byCode[item.code]?.rows ?? []
        return item.network
          ? rows.some((row) => row.network === item.network)
          : rows.length > 0
      }),
    })).filter((group) => group.items.length > 0)
  }, [report.data?.sheets])

  const { groups, tabs, addCategory, removeCategory } = useCampaignTabs(
    contractId ?? 'default',
    reportGroups,
  )
  const current = tabs.find((item) => item.value === tab)

  // Открытая вкладка могла исчезнуть: сменился договор, месяц или у месяца
  // нет файла — возвращаемся к сводке.
  const tabKeys = tabs.map((item) => item.value).join('|')
  useEffect(() => {
    if (!tabs.some((item) => item.value === tab)) setTab('channels')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKeys])

  // Категорию открываем сразу на её первом канале.
  const createCategory = (name) => {
    const created = addCategory(name)
    if (created?.channels?.length) setTab(created.channels[0].id)
  }

  // Убрали категорию с открытой вкладкой — возвращаемся к сводке.
  const dropCategory = (categoryId) => {
    removeCategory(categoryId)
    if (current?.categoryId === categoryId) setTab('channels')
  }

  const sheet =
    current?.kind === 'report'
      ? sheets.find((item) => item.code === current.code)
      : null

  // Месяц открыли впервые — пока не пришли список месяцев, отчёт и цифры
  // Total/Spot, показываем одно понятное ожидание вместо плашки с мелкой
  // подписью, недоступной кнопки и пустой сводки. Перечитывание уже
  // загруженного (после импорта или правки) сюда не попадает: у запроса
  // есть данные, и isPending у него false.
  const fetchingFirst = (query) =>
    query.isPending && query.fetchStatus !== 'idle'
  const monthLoading =
    !!contractId &&
    (fetchingFirst(months) ||
      (inList && fetchingFirst(report)) ||
      fetchingFirst(manual) ||
      fetchingFirst(totalStats))

  if (monthLoading) {
    return (
      <div className={className}>
        <Loader
          size={360}
          label={`Загружаем отчёт за ${periodLabel(period)}…`}
          className="min-h-0 py-6 sm:min-h-0"
        />
      </div>
    )
  }

  return (
    <div className={className}>
      {contractId ? (
        <ReportFileBar
          contractId={contractId}
          period={period}
          months={months}
          report={report}
          onImported={() => setReveal((count) => count + 1)}
        />
      ) : (
        <p className="mb-4 rounded-2xl border border-dashed border-line bg-surface px-4 py-3 text-[13px] text-ink-muted">
          {emptyHint}
        </p>
      )}

      {/* Вкладки и таблица проявляются вместе, когда отчёт пришёл. */}
      <Materialize key={reveal} play={reveal > 0}>
        <CampaignTabs
          value={tab}
          onChange={setTab}
          groups={groups}
          onAddCategory={createCategory}
          onRemoveCategory={dropCategory}
        />

        {/* Замена файла у загруженного месяца: на месте таблицы — поле из
            точек, пока сервер разбирает новый файл. */}
        <div className="relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab === 'stats' ? (
                <TotalStatisticsReport
                  summary={summary}
                  loading={summaryLoading}
                  error={totalStats.isError}
                />
              ) : tab === 'channels' ? (
                <ChannelSummaryReport
                  key={`${contractId}-${period}`}
                  spot={spot}
                  loading={manual.isPending && manual.fetchStatus !== 'idle'}
                  contractId={contractId}
                  period={period}
                />
              ) : sheet ? (
                <ReportSheetTable
                  key={`${contractId}-${period}-${current.value}`}
                  sheet={sheet}
                  contractId={contractId}
                  period={period}
                  network={current.network}
                  title={`${current.group} — ${current.label}`}
                  subtitle={`Лист «${sheet.title}» · ${periodLabel(period)}`}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {importing && <TableGenerating fileName={importingNames[0]} />}
          </AnimatePresence>
        </div>
      </Materialize>
    </div>
  )
}
