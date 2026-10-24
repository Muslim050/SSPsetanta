import { useMutation } from '@tanstack/react-query'
import * as filesApi from '@/api/endpoints/files'
import type { StoredFile } from '@/api/types'

/**
 * Загрузка файла. Сервер отдаёт `{id, name, url, …}`: `id` уходит в сущность
 * (`fileId`, `creativeId`, `logoId`), остальное показываем в интерфейсе.
 * `onProgress` и `signal` — прогресс отправки и отмена (см. useUploadProgress).
 *
 * Показ и скачивание живут в `download.ts`: файл отдаётся по слагу без
 * авторизации, и ссылки на него хватает.
 */
export function useUploadFile() {
  return useMutation({
    mutationFn: ({
      file,
      kind,
      ...options
    }: {
      file: File
      kind: filesApi.FileKind
    } & filesApi.UploadOptions): Promise<StoredFile> =>
      filesApi.upload(file, kind, options),
  })
}
