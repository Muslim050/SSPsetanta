import {
  QueryClient,
  type InvalidateOptions,
  type InvalidateQueryFilters,
  type QueryKey,
} from '@tanstack/react-query'
import { isApiError } from '@/api/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // 401/403 повторять бессмысленно — сессия недействительна.
      retry: (failureCount, error) => {
        if (isApiError(error) && error.isAuthError) return false
        return failureCount < 2
      },
    },
    mutations: { retry: false },
  },
})

/**
 * Правки — во все вкладки. Кэш запросов у каждой вкладки свой: скрыли
 * месяцы договора в «Рекламодателях» — открытые рядом «Рекламные
 * размещения» показывали бы старое до перезагрузки. Поэтому каждый сброс
 * кэша по ключу уходит в BroadcastChannel, и остальные вкладки перечитывают
 * то же у себя. Пришедший сброс дальше не рассылаем — иначе вкладки
 * перекидывали бы его друг другу без конца.
 */
const channel =
  typeof BroadcastChannel === 'undefined'
    ? null
    : new BroadcastChannel('setanta-queries')

if (channel) {
  const invalidate = queryClient.invalidateQueries.bind(queryClient)

  queryClient.invalidateQueries = ((
    filters?: InvalidateQueryFilters,
    options?: InvalidateOptions,
  ) => {
    // Рассылаем только ключ: фильтр с функцией через канал не передать.
    if (filters?.queryKey) {
      channel.postMessage({ queryKey: filters.queryKey, exact: filters.exact })
    }
    return invalidate(filters, options)
  }) as typeof queryClient.invalidateQueries

  channel.onmessage = (
    event: MessageEvent<{ queryKey: QueryKey; exact?: boolean }>,
  ) => {
    void invalidate({
      queryKey: event.data.queryKey,
      exact: event.data.exact,
    })
  }
}
