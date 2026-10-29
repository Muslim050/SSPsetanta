import { request } from '../client'
import { buildQuery } from '../query'
import type {
  Contract,
  ContractInput,
  ContractStatusEntry,
  Paginated,
  Payment,
  PaymentStatus,
} from '../types'

/**
 * Договор — самостоятельный ресурс: у него свой адрес, не зависящий от
 * бренда. Заводятся договоры внутри бренда (`/advertisers/:id/contracts`,
 * см. `endpoints/advertisers.ts`): у `POST /contracts` поле `advertiserId`
 * только на чтение, бренд там не задать. Читаются, правятся и удаляются —
 * по своему адресу.
 *
 * `PUT /contracts/:id` не используем: он заменяет договор целиком,
 * а всё нужное делает `PATCH`.
 */

export type ListParams = {
  advertiserId?: number
  cursor?: string | null
  limit?: number
  /**
   * `YYYY-MM` — договоры, чей срок пересекает месяц хотя бы одним днём,
   * кроме тех, у кого он в `hiddenMonths`. Без него скрытые месяцы ни на что
   * не влияют.
   */
  month?: string | null
}

/**
 * GET /contracts — одна страница. Бренд договора — в `advertiserId`. Только
 * для площадки (`admin`).
 */
export function list(params: ListParams = {}): Promise<Paginated<Contract>> {
  return request<Paginated<Contract>>(`/contracts${buildQuery(params)}`)
}

/** GET /contracts/:id */
export function get(id: number): Promise<Contract> {
  return request<Contract>(`/contracts/${id}`)
}

/** DELETE /contracts/:id — отказ по существу приходит 409. */
export function remove(id: number): Promise<void> {
  return request<void>(`/contracts/${id}`, { method: 'DELETE' })
}

/**
 * GET /contracts/:id/status-log — история смен статуса оплаты, курсорная.
 */
export function statusLog(
  id: number,
  params: { cursor?: string | null; limit?: number } = {},
): Promise<Paginated<ContractStatusEntry>> {
  return request<Paginated<ContractStatusEntry>>(
    `/contracts/${id}/status-log${buildQuery(params)}`,
  )
}

/**
 * Запись истории статусов оплаты: правка статуса, месяца и/или даты смены
 * (нужно хотя бы одно поле) и удаление. Статус затронутых месяцев сервер
 * пересчитывает по журналу — берёт самую позднюю по `changedAt` запись
 * месяца; не осталось записей — месяц пропадает из `paymentStatusByPeriod`.
 * Оба отдают весь договор.
 */
export const statusEntries = {
  /** PATCH /contracts/:id/status-log/:entryId */
  update(
    contractId: number,
    entryId: number,
    input: Partial<PaymentStatusInput>,
  ): Promise<Contract> {
    return request<Contract>(`/contracts/${contractId}/status-log/${entryId}`, {
      method: 'PATCH',
      body: input,
    })
  },
  /** DELETE /contracts/:id/status-log/:entryId */
  remove(contractId: number, entryId: number): Promise<Contract> {
    return request<Contract>(`/contracts/${contractId}/status-log/${entryId}`, {
      method: 'DELETE',
    })
  },
}

/** PATCH /contracts/:id — условия договора: срок, пакет, лиги, статус. */
export function update(id: number, input: ContractInput): Promise<Contract> {
  return request<Contract>(`/contracts/${id}`, {
    method: 'PATCH',
    body: input,
  })
}

/**
 * PATCH /contracts/:id/campaign-info — два поля рекламодателя: название
 * рекламной кампании и ролик (`creativeId` из загрузчика файлов).
 * Присланное сверх этого списка сервер игнорирует.
 */
export function saveCampaignInfo(
  id: number,
  input: { campaignName?: string; creativeId?: number | null },
): Promise<Contract> {
  return request<Contract>(`/contracts/${id}/campaign-info`, {
    method: 'PATCH',
    body: input,
  })
}

/** Правка сумм договора. Пустые поля сервер не трогает. */
export interface AmountsInput {
  budget?: string
  spent?: string
  /**
   * Дата поступления. В договоре не хранится: сервер оформляет им прирост
   * «Оплачено» — то есть новое поступление создаётся не отдельным запросом,
   * а увеличением `spent`.
   */
  paidAt?: string
}

/** PATCH /contracts/:id/amounts — сумма договора и оплаченное. */
export function updateAmounts(
  id: number,
  input: AmountsInput,
): Promise<Contract> {
  return request<Contract>(`/contracts/${id}/amounts`, {
    method: 'PATCH',
    body: input,
  })
}

/** Смена статуса оплаты за конкретный месяц договора. */
export interface PaymentStatusInput {
  status: Exclude<PaymentStatus, ''>
  /** Месяц договора: `2026-08`. */
  period: string
  changedAt: string
}

/** PUT /contracts/:id/payment-status */
export function setPaymentStatus(
  id: number,
  input: PaymentStatusInput,
): Promise<Contract> {
  return request<Contract>(`/contracts/${id}/payment-status`, {
    method: 'PUT',
    body: input,
  })
}

/** Поступления живут внутри своего договора. */
export const payments = {
  /**
   * GET /contracts/:id/payments — история выплат. В схеме ответ описан
   * одним поступлением, по смыслу это список: принимаем и массив,
   * и страницу `{ items }`.
   */
  async list(contractId: number): Promise<Payment[]> {
    const data = await request<Payment[] | Paginated<Payment>>(
      `/contracts/${contractId}/payments`,
    )
    return Array.isArray(data) ? data : (data?.items ?? [])
  },
  /**
   * POST /contracts/:id/payments — новое поступление, сервер прибавляет его
   * к «Оплачено». `idempotencyKey` — один на попытку внести это поступление:
   * повтор после обрыва связи не задвоит деньги.
   */
  create(
    contractId: number,
    input: { amount: string; paidAt: string; comment?: string },
    idempotencyKey: string,
  ): Promise<Payment> {
    return request<Payment>(`/contracts/${contractId}/payments`, {
      method: 'POST',
      body: input,
      headers: { 'Idempotency-Key': idempotencyKey },
    })
  },
  /** PATCH /contracts/:id/payments/:paymentId — отдаёт весь договор. */
  update(
    contractId: number,
    paymentId: number,
    input: { amount?: string; paidAt?: string; comment?: string },
  ): Promise<Contract> {
    return request<Contract>(`/contracts/${contractId}/payments/${paymentId}`, {
      method: 'PATCH',
      body: input,
    })
  },
  /** DELETE /contracts/:id/payments/:paymentId — отдаёт весь договор. */
  remove(contractId: number, paymentId: number): Promise<Contract> {
    return request<Contract>(`/contracts/${contractId}/payments/${paymentId}`, {
      method: 'DELETE',
    })
  },
}
