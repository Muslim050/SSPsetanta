import { ApiError, NetworkError, type ApiErrorBody } from './errors'
import { getAccessToken, getRefreshToken, setTokens } from './token'
import type { RefreshResponse, TokenPair } from './types'

/**
 * Адрес бэкенда. По умолчанию пуст — запросы идут на собственный origin,
 * откуда их переправляет прокси: в разработке это server.proxy из
 * vite.config.js, на Vercel — Routing rules проекта. Так сделано
 * потому, что бэкенд не отдаёт CORS-заголовки.
 *
 * VITE_API_URL позволяет обратиться к серверу напрямую — это заработает,
 * когда на нём настроят CORS.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? ''
const API_PREFIX = '/api/v1'

/**
 * Origin бэкенда. Пустой BASE_URL значит «свой же origin через прокси» —
 * тогда берём адрес страницы. Нужен там, где ссылку на файл требуется
 * отдать серверу абсолютной: `creativeUrl` у кампании — обычное URL-поле.
 */
export function apiOrigin(): string {
  if (BASE_URL) return BASE_URL.replace(/\/+$/, '')
  return typeof window === 'undefined' ? '' : window.location.origin
}

/** Уходят без заголовка Authorization: токена ещё (или уже) нет. */
const ANONYMOUS_PATHS = ['/auth/login', '/auth/refresh']
/**
 * Не пытаются обновить токен по 401. Logout сюда входит, хотя и требует
 * Authorization: гасить сессию, попутно продлевая её, бессмысленно.
 */
const NO_REFRESH_PATHS = [...ANONYMOUS_PATHS, '/auth/logout']

/** Сессия окончательно недействительна — приложение должно разлогиниться. */
let onUnauthorized: (() => void) | null = null
/** Токены обновились — надо сохранить новую пару в сторе. */
let onTokensRefreshed: ((tokens: TokenPair) => void) | null = null

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

export function setTokensRefreshedHandler(
  handler: (tokens: TokenPair) => void,
): void {
  onTokensRefreshed = handler
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  /** FormData уходит как есть — её Content-Type с границей ставит браузер. */
  body?: unknown
  signal?: AbortSignal
  /** Дополнительные заголовки, например `Idempotency-Key`. */
  headers?: Record<string, string>
  /**
   * Сколько тела уже ушло на сервер. С ним запрос идёт через XMLHttpRequest:
   * у fetch прогресса отправки нет. Нужен загрузкам файлов.
   */
  onUploadProgress?: (progress: UploadProgress) => void
}

/** Прогресс отправки тела запроса, в байтах. */
export interface UploadProgress {
  loaded: number
  total: number
}

/** Заголовки ответа XMLHttpRequest — строкой — в объект Headers. */
function parseHeaders(raw: string): Headers {
  const headers = new Headers()
  for (const line of raw.trim().split(/[\r\n]+/)) {
    const index = line.indexOf(':')
    if (index > 0) {
      headers.append(line.slice(0, index).trim(), line.slice(index + 1).trim())
    }
  }
  return headers
}

/**
 * Тот же запрос, что fetch, но через XMLHttpRequest — ради прогресса
 * отправки. Ответ заворачиваем в Response, чтобы дальше он разбирался так же,
 * как обычный: ошибки, обновление токена, JSON.
 */
function sendWithProgress(
  url: string,
  {
    method,
    headers,
    body,
    signal,
    onUploadProgress,
  }: {
    method: string
    headers: Record<string, string>
    body: XMLHttpRequestBodyInit | undefined
    signal?: AbortSignal
    onUploadProgress: (progress: UploadProgress) => void
  },
): Promise<Response> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    xhr.responseType = 'blob'
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value)
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onUploadProgress({ loaded: event.loaded, total: event.total })
      }
    }
    xhr.onload = () =>
      resolve(
        new Response(xhr.status === 204 ? null : xhr.response, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders()),
        }),
      )
    xhr.onerror = () => reject(new TypeError('Network request failed'))
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'))
    signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(body ?? null)
  })
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody = {
    code: 'unknown',
    message: `Ошибка ${response.status}`,
  }
  try {
    const payload = await response.json()
    if (payload?.error) body = payload.error
  } catch {
    // Сервер ответил не-JSON — оставляем заготовку выше.
  }
  return new ApiError(response.status, body)
}

async function send(
  path: string,
  { method = 'GET', body, signal, headers, onUploadProgress }: RequestOptions,
  withAuth: boolean,
): Promise<Response> {
  const access = withAuth ? getAccessToken() : null
  const isForm = body instanceof FormData
  const url = `${BASE_URL}${API_PREFIX}${path}`
  const init = {
    method,
    signal,
    headers: {
      // У multipart свой Content-Type с границей — его ставит браузер.
      ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...headers,
    },
    body: body
      ? isForm
        ? (body as FormData)
        : JSON.stringify(body)
      : undefined,
  }
  try {
    return onUploadProgress
      ? await sendWithProgress(url, { ...init, onUploadProgress })
      : await fetch(url, init)
  } catch (cause) {
    throw new NetworkError(cause)
  }
}

/**
 * Обновление пары токенов. Refresh на сервере одноразовый: как только им
 * воспользовались, он гаснет. Поэтому параллельные обновления недопустимы —
 * все запросы, столкнувшиеся с 401, ждут один и тот же промис.
 */
let refreshing: Promise<string> | null = null

function refreshTokens(): Promise<string> {
  refreshing ??= (async () => {
    const refresh = getRefreshToken()
    if (!refresh) {
      throw new ApiError(401, {
        code: 'unauthorized',
        message: 'Сессия истекла, войдите заново',
      })
    }

    const response = await send(
      '/auth/refresh',
      { method: 'POST', body: { refresh } },
      false,
    )
    if (!response.ok) throw await parseError(response)

    const pair = (await response.json()) as RefreshResponse
    setTokens(pair)
    onTokensRefreshed?.(pair)
    return pair.access
  })().finally(() => {
    refreshing = null
  })

  return refreshing
}

async function toResult<T>(response: Response): Promise<T> {
  // 204 — валидный ответ без тела (например, выход).
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/**
 * Единственная точка выхода в сеть. Здесь живут префикс, токен, разбор
 * ошибок и прозрачное обновление истёкшего access. Ответ отдаётся сырым —
 * разбирает его `request`.
 */
async function perform(
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  const withAuth = !ANONYMOUS_PATHS.includes(path)
  const canRefresh = !NO_REFRESH_PATHS.includes(path)
  // Запоминаем, с каким access ушёл запрос: если к моменту ответа токен уже
  // сменился, значит его обновил кто-то другой и обновлять повторно нельзя —
  // сервер гасит refresh при каждом использовании.
  const sentWith = canRefresh ? getAccessToken() : null
  let response = await send(path, options, withAuth)

  if (response.ok) return response

  // Access живёт 15 минут. Истёк — меняем его по refresh и повторяем запрос
  // ровно один раз; на самих auth-эндпоинтах этого не делаем.
  if (response.status === 401 && canRefresh) {
    if (getAccessToken() === sentWith) {
      try {
        await refreshTokens()
      } catch {
        onUnauthorized?.()
        throw await parseError(response)
      }
    }
    response = await send(path, options, true)
    if (response.ok) return response
  }

  const error = await parseError(response)
  if (error.isAuthError && canRefresh) onUnauthorized?.()
  throw error
}

/** Запрос с разбором JSON — обычный случай. */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return toResult<T>(await perform(path, options))
}

/**
 * Имя файла из Content-Disposition. Кириллицу сервер кодирует как
 * `filename*=utf-8''…`, латиницу отдаёт обычным `filename="…"`.
 */
function filenameFrom(disposition: string | null): string | null {
  if (!disposition) return null
  const encoded = disposition.match(/filename\*=utf-8''([^;]+)/i)
  if (encoded) return decodeURIComponent(encoded[1])
  const plain = disposition.match(/filename="?([^";]+)"?/i)
  return plain ? plain[1] : null
}

/**
 * Файл, который отдаётся только с токеном, — например, выгрузка отчёта.
 * Обычные файлы хранилища открыты по слагу и идут прямой ссылкой.
 */
export async function requestFile(
  path: string,
): Promise<{ blob: Blob; filename: string | null }> {
  const response = await perform(path)
  return {
    blob: await response.blob(),
    filename: filenameFrom(response.headers.get('Content-Disposition')),
  }
}
