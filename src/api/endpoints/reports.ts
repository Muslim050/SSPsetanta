import { request, requestFile } from '../client'
import { buildQuery } from '../query'
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
} from '../types'

/**
 * Отчёт за месяц по договору. Площадка раз в месяц загружает файл
 * статистики, сервер разбирает его на девять листов и хранит по месяцам.
 *
 * Читают и выгружают все роли; загружать и править может только площадка —
 * остальным сервер отвечает 403, а транспорт на 403 разлогинивает. Поэтому
 * запросы на запись и историю загрузок вызываем только у admin.
 */

const base = (contractId: number) => `/contracts/${contractId}/reports`

/** GET /contracts/:id/reports — месяцы с отчётом, новые сверху. Не страница. */
export function months(contractId: number): Promise<ReportMonth[]> {
  return request<ReportMonth[]>(base(contractId))
}

/** GET /contracts/:id/reports/:period — девять листов. Нет файла за месяц — 404. */
export function get(contractId: number, period: ReportPeriod): Promise<Report> {
  return request<Report>(`${base(contractId)}/${period}`)
}

/**
 * POST /contracts/:id/reports/:period/import — файл за месяц, multipart.
 * Повторный импорт заменяет месяц целиком, вместе с ручными правками.
 * Ошибки разбора — 400 `report_invalid` со списком в `details`.
 */
export function importFile(
  contractId: number,
  period: ReportPeriod,
  file: File,
): Promise<Report> {
  const form = new FormData()
  form.append('file', file)
  return request<Report>(`${base(contractId)}/${period}/import`, {
    method: 'POST',
    body: form,
  })
}

/**
 * GET /contracts/:id/reports/:period/manual — ручной отчёт за месяц (цифры
 * вкладки Spot): `spots` по каналам, промо и прероллы, `sheets` пустой.
 * Ручного отчёта за месяц нет — 404.
 */
export function getManual(
  contractId: number,
  period: ReportPeriod,
): Promise<Report> {
  return request<Report>(`${base(contractId)}/${period}/manual`)
}

/**
 * POST /contracts/:id/reports/:period/manual — ручной отчёт за месяц: цифры
 * по каналам, промо и прероллы. Заводит его или заменяет прежний ручной.
 * Файловый отчёт того же месяца не меняется — это отдельный отчёт.
 */
export function saveManual(
  contractId: number,
  period: ReportPeriod,
  input: ManualReportInput,
): Promise<Report> {
  return request<Report>(`${base(contractId)}/${period}/manual`, {
    method: 'POST',
    body: input,
  })
}

/**
 * PUT /contracts/:id/reports/:period/sheets/:code — лист целиком. Отвечает
 * листом с новой `version`; 409 `version_conflict` — лист успели изменить.
 */
export function saveSheet(
  contractId: number,
  period: ReportPeriod,
  code: ReportSheetCode,
  input: ReportSheetInput,
): Promise<ReportSheet> {
  return request<ReportSheet>(`${base(contractId)}/${period}/sheets/${code}`, {
    method: 'PUT',
    body: input,
  })
}

/**
 * GET /contracts/:id/reports/:period/export — отчёт в `.xlsx` с учётом правок.
 * Ссылка закрыта токеном, поэтому файл тянем транспортом.
 */
export function exportFile(
  contractId: number,
  period: ReportPeriod,
): Promise<{ blob: Blob; filename: string | null }> {
  return requestFile(`${base(contractId)}/${period}/export`)
}

export type ImportsParams = {
  period?: ReportPeriod
  cursor?: string | null
  limit?: number
}

/** GET /contracts/:id/reports/imports — история загрузок. Только admin. */
export function imports(
  contractId: number,
  params: ImportsParams = {},
): Promise<Paginated<ReportImport>> {
  return request<Paginated<ReportImport>>(
    `${base(contractId)}/imports${buildQuery(params)}`,
  )
}
