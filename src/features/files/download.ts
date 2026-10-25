import { absoluteUrl } from '@/api/endpoints/files'

/** Файл так, как его хранит сущность: скан договора, ролик, логотип. */
export interface FileLink {
  name?: string
  url?: string | null
}

/**
 * Адрес файла для браузера — в `<img src>`, `<a href>` и `window.open`.
 *
 * Хранилище отдаёт файл по слагу без авторизации, поэтому ссылку можно
 * отдать браузеру напрямую. Раньше было иначе: файл закрывал токен, за
 * содержимым приходилось ходить транспортом и показывать его блобом.
 *
 * Ссылка загрузчика относительная — до сервера её доводит прокси. Когда
 * фронт ходит к API напрямую (`VITE_BASE_URL`), origin добавляет `absoluteUrl`.
 */
export function fileHref(url: string | null | undefined): string | undefined {
  return url ? absoluteUrl(url) : undefined
}

/**
 * Сохранить файл на диск. Имя приходит и в `Content-Disposition`, так что
 * читаемым оно останется даже при запросе на чужой origin, где атрибут
 * `download` не действует.
 */
export function downloadFile(file: FileLink | null | undefined): void {
  const href = fileHref(file?.url)
  if (!href) return

  const link = document.createElement('a')
  link.href = href
  link.download = file?.name ?? ''
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
}

/** Открыть файл в новой вкладке — так удобнее смотреть ролик. */
export function openFile(file: FileLink | null | undefined): void {
  const href = fileHref(file?.url)
  if (href) window.open(href, '_blank', 'noopener')
}
