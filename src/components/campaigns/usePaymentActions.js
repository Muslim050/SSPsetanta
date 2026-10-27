import {
  useDeletePayment,
  useUpdatePayment,
} from '@/features/contracts/queries'
import { useToast } from '@/components/ui/Toast.jsx'
import { useConfirm } from '@/components/ui/Confirm.jsx'
import { formatDateTime, formatMoneyCompact } from '@/lib/format.js'

/**
 * Правка и удаление уже внесённого поступления — из истории выплат.
 * Общие для «Статуса оплаты» и «Рекламных размещений»: оба показывают
 * историю одним и тем же поповером.
 */
export function usePaymentActions() {
  const { mutateAsync: updatePayment } = useUpdatePayment()
  const { mutate: deletePayment } = useDeletePayment()
  const toast = useToast()
  const confirm = useConfirm()

  /**
   * Дата, сумма и комментарий поступления — телом PATCH целиком. «Оплачено»
   * договора по спецификации — сумма поступлений, её считает сервер.
   * Отдаёт true, если сохранили, — тогда строка выходит из правки.
   */
  const editPayment = async (contract, paymentId, input) => {
    if (!contract) return false
    try {
      await updatePayment({ contractId: contract.id, paymentId, input })
      toast.success('Поступление изменено')
      return true
    } catch (err) {
      toast.error(err.message || 'Не удалось изменить поступление')
      return false
    }
  }

  /** Удаление поступления: сумма вычитается из оплаченного по договору. */
  const removePayment = async (contract, payment) => {
    if (!contract || !payment) return

    const ok = await confirm({
      title: 'Удалить поступление?',
      description: `${formatMoneyCompact(payment.amount)} · ${formatDateTime(
        payment.paidAt,
      )}`,
      body: 'Сумма вычтется из оплаченного по договору.',
    })
    if (!ok) return

    deletePayment(
      { contractId: contract.id, paymentId: payment.id },
      {
        onSuccess: () => toast.info('Поступление удалено'),
        onError: (err) =>
          toast.error(err.message || 'Не удалось удалить поступление'),
      },
    )
  }

  return { editPayment, removePayment }
}
