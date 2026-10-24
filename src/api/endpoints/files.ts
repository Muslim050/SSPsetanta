import { apiOrigin, request } from '../client'
import type { StoredFile } from '../types'

/**
 * Загрузчик файлов. Сервер проверяет тип и размер по назначению: скан
 * договора, рекламный ролик или логотип бренда.
 */
export type FileKind = 'contract' | 'creative' | 'logo'

/** POST /files — multipart. Дату загрузки проставляет сервер. */
export function upload(file: File, kind: FileKind): Promise<StoredFile> {
  const form = new FormData()
  form.append('file', file)
  form.append('kind', kind)
  return request<StoredFile>('/files', { method: 'POST', body: form })
}

/** Ссылка нашего хранилища — в отличие от внешней, на чужой хост. */
export function isStoredUrl(url: string | null | undefined): boolean {
  return /\/api\/v1\/files\/[^/]+\/download\/?$/.test(url ?? '')
}

/**
 * Абсолютный адрес файла. Загрузчик отвечает относительной ссылкой — её
 * доводит до сервера прокси, но когда фронт ходит к API напрямую
 * (`VITE_API_URL`), origin приходится добавлять самим.
 */
export function absoluteUrl(url: string): string {
  if (!url || /^https?:\/\//i.test(url)) return url
  return `${apiOrigin()}${url.startsWith('/') ? '' : '/'}${url}`
}
