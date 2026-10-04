import { isApiError } from '@/api/errors'

type ConfirmOptions = {
  alert?: boolean
  title?: string
  description?: string
  body?: string
}

interface ReportDeps {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  toast: { error: (message: string) => void }
  /** Номер договора — подпись окна. */
  number?: string
}

/**
 * Отказ в удалении договора. 409 — отказ по существу (например, по договору
 * есть кампании): его показываем окном, из тоста такой текст легко не
 * дочитать. Остальное — сбой, ему хватает тоста.
 */
export function reportContractDeleteError(
  error: unknown,
  { confirm, toast, number }: ReportDeps,
): void {
  if (isApiError(error) && error.status === 409) {
    void confirm({
      alert: true,
      title: 'Договор нельзя удалить',
      description: number,
      body: error.message,
    })
    return
  }
  const message = error instanceof Error ? error.message : ''
  toast.error(message || 'Не удалось удалить договор')
}
