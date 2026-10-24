import { useEffect, useRef, useState } from 'react'

const MB = 1024 * 1024

/** Байты → «12,3 МБ». */
export function formatBytes(bytes) {
  return `${(bytes / MB).toLocaleString('ru-RU', {
    maximumFractionDigits: bytes < 10 * MB ? 1 : 0,
  })} МБ`
}

/** Секунды → «ещё 23 с» / «ещё 2 мин 5 с». */
function formatRemaining(seconds) {
  const total = Math.max(1, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return minutes ? `ещё ${minutes} мин ${rest} с` : `ещё ${rest} с`
}

/** Загрузку отменили (кнопкой или закрыв форму) — это не ошибка. */
export function isAborted(error) {
  const cause = error?.cause ?? error
  return cause?.name === 'AbortError'
}

/**
 * Прогресс загрузки файла для интерфейса: проценты, скорость, сколько
 * осталось — и отмена. `start()` зовут перед отправкой: он отдаёт
 * `{ onProgress, signal }` для запроса. `stop()` — когда запрос закончился,
 * `cancel()` — прервать. Компонент ушёл со страницы — загрузка прерывается.
 *
 * `sent` — файл ушёл целиком, ждём ответа сервера (он ещё сохраняет или
 * разбирает файл).
 */
export function useUploadProgress() {
  // { loaded, total, startedAt, at } — null, пока загрузки нет.
  const [state, setState] = useState(null)
  const controller = useRef(null)

  useEffect(() => () => controller.current?.abort(), [])

  const start = () => {
    controller.current?.abort()
    controller.current = new AbortController()
    const startedAt = Date.now()
    setState({ loaded: 0, total: 0, startedAt, at: startedAt })
    return {
      signal: controller.current.signal,
      onProgress: ({ loaded, total }) =>
        setState((current) =>
          current ? { ...current, loaded, total, at: Date.now() } : current,
        ),
    }
  }

  const stop = () => {
    controller.current = null
    setState(null)
  }

  const cancel = () => controller.current?.abort()

  const loaded = state?.loaded ?? 0
  const total = state?.total ?? 0
  const percent = total ? Math.min(100, Math.round((loaded / total) * 100)) : 0
  const elapsed = state ? (state.at - state.startedAt) / 1000 : 0
  // Средняя скорость с начала — меньше скачет, чем мгновенная.
  const speed = elapsed >= 1 && loaded ? loaded / elapsed : null
  const sent = total > 0 && loaded >= total

  // «12 из 60 МБ · 2,1 МБ/с · ещё 23 с»; пока скорость не ясна — без неё.
  const caption = state
    ? sent
      ? 'Файл отправлен — сервер сохраняет его…'
      : [
          total ? `${formatBytes(loaded)} из ${formatBytes(total)}` : null,
          speed ? `${formatBytes(speed)}/с` : null,
          speed && total ? formatRemaining((total - loaded) / speed) : null,
        ]
          .filter(Boolean)
          .join(' · ') || 'Начинаем загрузку…'
    : ''

  return {
    active: !!state,
    percent,
    sent,
    caption,
    start,
    stop,
    cancel,
  }
}
