import { useMutation } from '@tanstack/react-query'
import * as filesApi from '@/api/endpoints/files'
import type { StoredFile } from '@/api/types'

/**
 * Загрузка файла. Сервер отдаёт `{id, name, url, …}`: `id` уходит в сущность
 * (`fileId`, `creativeId`, `logoId`), остальное показываем в интерфейсе.
 *
 * Показ и скачивание живут в `download.ts`: файл отдаётся по слагу без
 * авторизации, и ссылки на него хватает.
 */
export function useUploadFile() {
  return useMutation({
    mutationFn: ({
      file,
      kind,
    }: {
      file: File
      kind: filesApi.FileKind
    }): Promise<StoredFile> => filesApi.upload(file, kind),
  })
}
