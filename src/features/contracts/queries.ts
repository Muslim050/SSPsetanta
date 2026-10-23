import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as advertisersApi from '@/api/endpoints/advertisers'
import * as contractsApi from '@/api/endpoints/contracts'
import { advertiserKeys, useAdvertisers } from '@/features/advertisers/queries'
import { PAGE_SIZE, fetchAllPages } from '@/lib/paginate'
import type {
  Advertiser,
  Contract,
  ContractInput,
  ContractStatusEntry,
  Payment,
} from '@/api/types'

/**
 * Ключи договоров лежат под `advertiserKeys.all`: договоры приходят и
 * вложенными в бренды, поэтому любая правка бренда или договора
 * перечитывает и то и другое одной инвалидацией.
 */
export const contractKeys = {
  all: [...advertiserKeys.all, 'contracts'] as const,
  list: () => [...contractKeys.all, 'list'] as const,
  one: (id: number) => [...contractKeys.all, 'one', id] as const,
  payments: (id: number) => [...contractKeys.all, 'payments', id] as const,
  statusLog: (id: number) => [...contractKeys.all, 'status-log', id] as const,
}

/** Договор вместе с брендом, которому он принадлежит. */
export interface ContractRow {
  contract: Contract
  advertiser: Advertiser
}

/**
 * Все договоры площадки — строками «договор + бренд».
 *
 * Договоры берём из `GET /contracts`, бренд — по `advertiserId` из списка
 * брендов: рядом с договором экран показывает название, логотип и цвет.
 * Список брендов — тот же запрос, что у «Рекламодателей», он делится
 * между экранами через кэш. Договор без бренда в списке не показываем.
 */
export function useContracts() {
  const contracts = useQuery({
    queryKey: contractKeys.list(),
    queryFn: (): Promise<Contract[]> =>
      fetchAllPages((cursor) =>
        contractsApi.list({ cursor, limit: PAGE_SIZE }),
      ),
  })
  const advertisers = useAdvertisers()

  const byId = new Map(
    (advertisers.data ?? []).map((advertiser) => [advertiser.id, advertiser]),
  )
  const rows: ContractRow[] = (contracts.data ?? []).flatMap((contract) => {
    const advertiser = byId.get(contract.advertiserId)
    return advertiser ? [{ contract, advertiser }] : []
  })

  return {
    rows,
    isPending: contracts.isPending || advertisers.isPending,
    isError: contracts.isError || advertisers.isError,
    error: contracts.error ?? advertisers.error,
    refetch: () => Promise.all([contracts.refetch(), advertisers.refetch()]),
  }
}

/**
 * Один договор — `GET /contracts/:id`. Карточка договора читает его при
 * каждом открытии, а не берёт из списка.
 */
export function useContract(id: number | null | undefined) {
  return useQuery({
    queryKey: contractKeys.one(id ?? 0),
    queryFn: (): Promise<Contract> => contractsApi.get(id as number),
    enabled: !!id,
    staleTime: 0,
  })
}

/** История выплат договора — `GET /contracts/:id/payments`. */
export function useContractPayments(id: number | null | undefined) {
  return useQuery({
    queryKey: contractKeys.payments(id ?? 0),
    queryFn: (): Promise<Payment[]> => contractsApi.payments.list(id as number),
    enabled: !!id,
    staleTime: 0,
  })
}

/** История смен статуса оплаты — `GET /contracts/:id/status-log`. */
export function useStatusLog(id: number | null | undefined) {
  return useQuery({
    queryKey: contractKeys.statusLog(id ?? 0),
    queryFn: (): Promise<ContractStatusEntry[]> =>
      fetchAllPages((cursor) =>
        contractsApi.statusLog(id as number, { cursor, limit: PAGE_SIZE }),
      ),
    enabled: !!id,
    staleTime: 0,
  })
}

/**
 * Один договор бренда — `GET /advertisers/:id/contracts/:contractId`.
 * Поповер сумм берёт договор отсюда, а не из вложенных в список брендов:
 * при каждом открытии читаем свежие суммы и поступления. Ключ лежит под
 * `advertiserKeys.all`, так что правки сумм и поступлений его перечитывают.
 */
export function useBrandContract(
  advertiserId: number | null | undefined,
  id: number | null | undefined,
) {
  return useQuery({
    queryKey: [...advertiserKeys.all, 'contract', advertiserId, id],
    queryFn: (): Promise<Contract> =>
      advertisersApi.contracts.get(advertiserId as number, id as number),
    enabled: !!advertiserId && !!id,
    // Без кэша на 30 секунд: повторное открытие того же договора тоже читает.
    staleTime: 0,
  })
}

/**
 * Правка условий договора: срок, пакет, лиги, статус. Договоры лежат внутри
 * брендов, поэтому обновляем весь список брендов — иначе экран покажет
 * старое значение.
 */
export function useUpdateContract() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ContractInput }) =>
      contractsApi.update(id, input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: advertiserKeys.all })
    },
  })
}

/**
 * Новый договор заводится внутри бренда — своего адреса для создания
 * у договора нет.
 */
export function useCreateContract() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({
      advertiserId,
      input,
    }: {
      advertiserId: number
      input: ContractInput
    }) => advertisersApi.contracts.create(advertiserId, input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: advertiserKeys.all })
    },
  })
}

/** Удаление договора — по его собственному адресу. */
export function useDeleteContract() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: number }) => contractsApi.remove(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: advertiserKeys.all })
    },
  })
}

/**
 * То немногое в договоре, что ведёт рекламодатель: название рекламной
 * кампании и ролик. Ролик уходит идентификатором из загрузчика файлов.
 */
export function useSaveCampaignInfo() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number
      input: { campaignName?: string; creativeId?: number | null }
    }) => contractsApi.saveCampaignInfo(id, input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: advertiserKeys.all })
    },
  })
}

/** Что прислал поповер сумм. */
export interface ContractMoney {
  budget: number
  /** «Оплачено» вместе с разовым поступлением. */
  spent: number
  /** Разовое поступление; 0 — его нет. */
  amount: number
  paidAt: string
}

/**
 * Суммы договора из поповера. Внесли только разовое поступление — это
 * `POST /contracts/:id/payments` (плюс правка суммы договора, если её
 * меняли). Поправили «Оплачено» руками — `PATCH /contracts/:id/amounts`:
 * прирост сервер сам оформит поступлением.
 */
export function useSaveContractMoney() {
  const client = useQueryClient()
  // Ключ идемпотентности держим, пока это поступление не дошло: повтор после
  // сбоя уходит с тем же ключом, и сервер не задвоит деньги.
  const pending = useRef<{ signature: string; key: string } | null>(null)

  return useMutation({
    mutationFn: async ({
      contract,
      money,
    }: {
      contract: Contract
      money: ContractMoney
    }) => {
      // Поповер показывает «Оплачено» целыми — сравниваем тоже целыми.
      const spentBefore = Math.round(Number(contract.spent) || 0)
      const onlyIncome =
        money.amount > 0 && money.spent - money.amount === spentBefore

      if (!onlyIncome) {
        await contractsApi.updateAmounts(contract.id, {
          budget: String(money.budget),
          spent: String(money.spent),
          paidAt: money.paidAt,
        })
        return
      }

      if (money.budget !== Math.round(Number(contract.budget) || 0)) {
        await contractsApi.updateAmounts(contract.id, {
          budget: String(money.budget),
        })
      }
      const signature = `${contract.id}:${money.amount}:${money.paidAt}`
      if (pending.current?.signature !== signature) {
        pending.current = { signature, key: crypto.randomUUID() }
      }
      await contractsApi.payments.create(
        contract.id,
        { amount: String(money.amount), paidAt: money.paidAt },
        pending.current.key,
      )
      pending.current = null
    },
    // И после сбоя: сумма договора могла успеть сохраниться.
    onSettled: () => {
      client.invalidateQueries({ queryKey: advertiserKeys.all })
    },
  })
}

/** Статус оплаты за месяц договора: «ожидает оплату» / «оплачено». */
export function useSetPaymentStatus() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number
      input: contractsApi.PaymentStatusInput
    }) => contractsApi.setPaymentStatus(id, input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: advertiserKeys.all })
    },
  })
}

/** Правка поступления — в интерфейсе меняется только его дата. */
export function useUpdatePayment() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({
      contractId,
      paymentId,
      input,
    }: {
      contractId: number
      paymentId: number
      input: { amount?: string; paidAt?: string; comment?: string }
    }) => contractsApi.payments.update(contractId, paymentId, input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: advertiserKeys.all })
    },
  })
}

/** Удаление поступления. Освоенное сервер пересчитывает сам. */
export function useDeletePayment() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({
      contractId,
      paymentId,
    }: {
      contractId: number
      paymentId: number
    }) => contractsApi.payments.remove(contractId, paymentId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: advertiserKeys.all })
    },
  })
}
