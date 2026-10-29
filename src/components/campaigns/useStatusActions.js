import {
  useDeleteStatusEntry,
  useUpdateStatusEntry,
} from '@/features/contracts/queries'
import { useToast } from '@/components/ui/Toast.jsx'
import { useConfirm } from '@/components/ui/Confirm.jsx'
import { MONTHS_FULL } from '@/components/campaigns/MonthTabs.jsx'
import { formatDateTime } from '@/lib/format.js'

/** «Октябрь 2026» из '2026-10'. */
const monthLabel = (period) => {
  const [year, month] = String(period ?? '').split('-')
  return MONTHS_FULL[Number(month) - 1]
    ? `${MONTHS_FULL[Number(month) - 1]} ${year}`
    : 'Без месяца'
}

/**
 * Правка и удаление записи истории статусов оплаты — из поповера статуса.
 * Общие для «Статуса оплаты» и «Рекламных размещений», как и
 * usePaymentActions для выплат. Статус месяца после них сервер
 * пересчитывает сам по журналу.
 */
export function useStatusActions() {
  const { mutateAsync: updateEntry } = useUpdateStatusEntry()
  const { mutate: deleteEntry } = useDeleteStatusEntry()
  const toast = useToast()
  const confirm = useConfirm()

  /**
   * Статус, месяц и дата смены — только изменённые поля. Отдаёт true, если
   * сохранили, — тогда запись выходит из правки.
   */
  const editStatusEntry = async (contract, entryId, input) => {
    if (!contract) return false
    try {
      await updateEntry({ contractId: contract.id, entryId, input })
      toast.success('Запись истории изменена')
      return true
    } catch (err) {
      toast.error(err.message || 'Не удалось изменить запись истории')
      return false
    }
  }

  /** Удаление записи: статус месяца откатится к предыдущей записи. */
  const removeStatusEntry = async (contract, entry, statusLabel) => {
    if (!contract || !entry) return

    const ok = await confirm({
      title: 'Удалить запись истории?',
      description: `${monthLabel(entry.period)} · ${statusLabel} · ${formatDateTime(
        entry.changedAt,
      )}`,
      body: 'Статус месяца вернётся к предыдущей записи, а если её нет — отметка за месяц пропадёт.',
    })
    if (!ok) return

    deleteEntry(
      { contractId: contract.id, entryId: entry.id },
      {
        onSuccess: () => toast.info('Запись истории удалена'),
        onError: (err) =>
          toast.error(err.message || 'Не удалось удалить запись истории'),
      },
    )
  }

  return { editStatusEntry, removeStatusEntry }
}
