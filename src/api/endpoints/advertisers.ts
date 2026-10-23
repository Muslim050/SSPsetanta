import { request } from '../client'
import { buildQuery } from '../query'
import type {
  Advertiser,
  AdvertiserInput,
  Contract,
  ContractInput,
  Paginated,
} from '../types'

export type ListParams = {
  cursor?: string | null
  limit?: number
}

/** GET /advertisers — одна страница выборки. */
export function list(params: ListParams = {}): Promise<Paginated<Advertiser>> {
  return request<Paginated<Advertiser>>(`/advertisers${buildQuery(params)}`)
}

/** POST /advertisers */
export function create(input: AdvertiserInput): Promise<Advertiser> {
  return request<Advertiser>('/advertisers', { method: 'POST', body: input })
}

/** PATCH /advertisers/:id */
export function update(
  id: number,
  input: AdvertiserInput,
): Promise<Advertiser> {
  return request<Advertiser>(`/advertisers/${id}`, {
    method: 'PATCH',
    body: input,
  })
}

/** DELETE /advertisers/:id */
export function remove(id: number): Promise<void> {
  return request<void>(`/advertisers/${id}`, { method: 'DELETE' })
}

/**
 * Договоры лежат внутри бренда только на чтение — меняются они этими
 * эндпоинтами, по одному.
 */
export const contracts = {
  /** GET /advertisers/:id/contracts/:contractId — свежий договор с поступлениями. */
  get(advertiserId: number, id: number): Promise<Contract> {
    return request<Contract>(`/advertisers/${advertiserId}/contracts/${id}`)
  },
  create(advertiserId: number, input: ContractInput): Promise<Contract> {
    return request<Contract>(`/advertisers/${advertiserId}/contracts`, {
      method: 'POST',
      body: input,
    })
  },
  update(
    advertiserId: number,
    id: number,
    input: ContractInput,
  ): Promise<Contract> {
    return request<Contract>(`/advertisers/${advertiserId}/contracts/${id}`, {
      method: 'PATCH',
      body: input,
    })
  },
  remove(advertiserId: number, id: number): Promise<void> {
    return request<void>(`/advertisers/${advertiserId}/contracts/${id}`, {
      method: 'DELETE',
    })
  },
}

/** GET /advertisers/:id — свежая карточка вместе с договорами. */
export function get(id: number): Promise<Advertiser> {
  return request<Advertiser>(`/advertisers/${id}`)
}
