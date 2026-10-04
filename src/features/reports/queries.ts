import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as reportsApi from '@/api/endpoints/reports'
import { isApiError } from '@/api/errors'
import type {
  ManualReportInput,
  Paginated,
  Report,
  ReportImport,
  ReportMonth,
  ReportPeriod,
  ReportSheet,
  ReportSheetCode,
  ReportSheetInput,
} from '@/api/types'

export const reportKeys = {
  all: ['reports'] as const,
  months: (contractId: number) =>
    [...reportKeys.all, 'months', contractId] as const,
  report: (contractId: number, period: ReportPeriod) =>
    [...reportKeys.all, 'report', contractId, period] as const,
  manual: (contractId: number, period: ReportPeriod) =>
    [...reportKeys.all, 'manual', contractId, period] as const,
  imports: (contractId: number, period: ReportPeriod) =>
    [...reportKeys.all, 'imports', contractId, period] as const,
  /** Ключ загрузки файла — по нему отчёт видит, что идёт разбор. */
  importing: () => [...reportKeys.all, 'import'] as const,
}

/**
 * Ошибки 4xx сами не проходят: 404 на договор или месяц повторный запрос не
 * исправит. Повторяем только сбои сети и сервера — как и остальные запросы.
 */
const retryServerErrors = (failureCount: number, error: unknown) =>
  !(isApiError(error) && error.status >= 400 && error.status < 500) &&
  failureCount < 2

/** Месяцы договора, за которые загружен отчёт. */
export function useReportMonths(contractId: number | null | undefined) {
  return useQuery({
    queryKey: reportKeys.months(contractId ?? 0),
    queryFn: (): Promise<ReportMonth[]> =>
      reportsApi.months(contractId as number),
    enabled: !!contractId,
    retry: retryServerErrors,
  })
}

/**
 * Отчёт за месяц целиком — около 2 500 строк, поэтому грузим один раз на
 * месяц, а не по листу. Спрашиваем только тогда, когда месяц есть в списке:
 * за месяц без файла сервер отвечает 404, и такой запрос был бы ошибкой.
 */
export function useReport(
  contractId: number | null | undefined,
  period: ReportPeriod | null | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: reportKeys.report(contractId ?? 0, period ?? ''),
    queryFn: (): Promise<Report> =>
      reportsApi.get(contractId as number, period as ReportPeriod),
    enabled: enabled && !!contractId && !!period,
    retry: retryServerErrors,
  })
}

/**
 * Ручной отчёт за месяц — цифры вкладки Spot. Он отдельный от файлового, и
 * его нет в списке месяцев, поэтому спрашиваем всегда; 404 — ручного
 * отчёта нет, это не ошибка: отдаём null.
 */
export function useManualReport(
  contractId: number | null | undefined,
  period: ReportPeriod | null | undefined,
) {
  return useQuery({
    queryKey: reportKeys.manual(contractId ?? 0, period ?? ''),
    queryFn: async (): Promise<Report | null> => {
      try {
        return await reportsApi.getManual(
          contractId as number,
          period as ReportPeriod,
        )
      } catch (error) {
        if (isApiError(error) && error.status === 404) return null
        throw error
      }
    },
    enabled: !!contractId && !!period,
    retry: retryServerErrors,
  })
}

/**
 * История загрузок файла за месяц, новые сверху. Только для площадки:
 * остальным сервер отвечает 403, а транспорт на 403 разлогинивает, — поэтому
 * включаем запрос лишь там, где его можно задать.
 */
export function useReportImports(
  contractId: number | null | undefined,
  period: ReportPeriod | null | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: reportKeys.imports(contractId ?? 0, period ?? ''),
    queryFn: (): Promise<Paginated<ReportImport>> =>
      reportsApi.imports(contractId as number, {
        period: period as ReportPeriod,
        limit: 50,
      }),
    enabled: enabled && !!contractId && !!period,
    retry: retryServerErrors,
  })
}

/**
 * Загрузка файла за месяц. Ответ — отчёт целиком, поэтому кладём его в кэш
 * сразу: повторно спрашивать сервер незачем. Список месяцев перечитываем —
 * месяц мог появиться впервые.
 */
export function useImportReport() {
  const client = useQueryClient()

  return useMutation({
    mutationKey: reportKeys.importing(),
    mutationFn: ({
      contractId,
      period,
      file,
    }: {
      contractId: number
      period: ReportPeriod
      file: File
    }) => reportsApi.importFile(contractId, period, file),
    onSuccess: (report) => {
      client.setQueryData(
        reportKeys.report(report.contractId, report.period),
        report,
      )
      client.invalidateQueries({
        queryKey: reportKeys.months(report.contractId),
      })
      client.invalidateQueries({
        queryKey: reportKeys.imports(report.contractId, report.period),
      })
    },
  })
}

/**
 * Сохранение ручного отчёта за месяц. Ответ кладём в кэш ручного отчёта
 * сразу — цифры Spot обновятся без ожидания, — и всё равно перечитываем его
 * за период, а с ним список месяцев: месяц мог появиться впервые. Файловый
 * отчёт не трогаем — это отдельный отчёт, ручной ввод его не меняет.
 */
export function useSaveManualReport() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({
      contractId,
      period,
      input,
    }: {
      contractId: number
      period: ReportPeriod
      input: ManualReportInput
    }) => reportsApi.saveManual(contractId, period, input),
    onSuccess: (report, { contractId, period }) => {
      client.setQueryData(reportKeys.manual(contractId, period), report)
      client.invalidateQueries({
        queryKey: reportKeys.manual(contractId, period),
      })
      client.invalidateQueries({ queryKey: reportKeys.months(contractId) })
    },
  })
}

/**
 * Сохранение листа целиком. Сервер отвечает листом с новой `version` —
 * подменяем его в отчёте, чтобы следующее сохранение ушло с ней. На 409
 * отчёт перечитываем: лист успели изменить, показывать старое нельзя.
 */
export function useSaveReportSheet() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({
      contractId,
      period,
      code,
      input,
    }: {
      contractId: number
      period: ReportPeriod
      code: ReportSheetCode
      input: ReportSheetInput
    }) => reportsApi.saveSheet(contractId, period, code, input),
    onSuccess: (sheet: ReportSheet, { contractId, period }) => {
      client.setQueryData<Report>(
        reportKeys.report(contractId, period),
        (report) =>
          report && {
            ...report,
            sheets: report.sheets.map((item) =>
              item.code === sheet.code ? sheet : item,
            ),
          },
      )
    },
    onError: (error, { contractId, period }) => {
      if ((error as { status?: number }).status === 409) {
        client.invalidateQueries({
          queryKey: reportKeys.report(contractId, period),
        })
      }
    },
  })
}

/**
 * Выгрузка отчёта в `.xlsx` с учётом всех правок. Ссылка закрыта токеном,
 * поэтому файл приходит блобом, а имя — из заголовка ответа.
 */
export function useExportReport() {
  return useMutation({
    mutationFn: async ({
      contractId,
      period,
    }: {
      contractId: number
      period: ReportPeriod
    }) => {
      const { blob, filename } = await reportsApi.exportFile(contractId, period)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename ?? `Report_${period}.xlsx`
      document.body.append(link)
      link.click()
      link.remove()
      // Отзываем не сразу: Safari начинает скачивание с задержкой.
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    },
  })
}
