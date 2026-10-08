import { request } from '../client'
import { buildQuery } from '../query'
import type {
  Campaign,
  CampaignInput,
  CampaignStatus,
  Paginated,
} from '../types'

export type ListParams = {
  advertiserId?: number
  contractNumber?: string
  status?: CampaignStatus
  q?: string
  cursor?: string | null
  limit?: number
}

/**
 * GET /campaigns — одна страница выборки. Рекламодателю сервер отдаёт
 * только его кампании, о чём бы клиент ни просил.
 */
export function list(params: ListParams = {}): Promise<Paginated<Campaign>> {
  return request<Paginated<Campaign>>(`/campaigns${buildQuery(params)}`)
}

/** GET /campaigns/:id */
export function get(id: number): Promise<Campaign> {
  return request<Campaign>(`/campaigns/${id}`)
}

/**
 * POST /campaigns — заявку заводит рекламодатель или площадка за бренд.
 * Рекламодателю бренд сервер берёт из сессии и ставит статус `sent`;
 * площадка присылает `advertiserId` обязательно — статус будет `received`.
 */
export function create(input: CampaignInput): Promise<Campaign> {
  return request<Campaign>('/campaigns', { method: 'POST', body: input })
}

/** PATCH /campaigns/:id. Удаления у кампаний нет — так решено в спеке. */
export function update(id: number, input: CampaignInput): Promise<Campaign> {
  return request<Campaign>(`/campaigns/${id}`, {
    method: 'PATCH',
    body: input,
  })
}
