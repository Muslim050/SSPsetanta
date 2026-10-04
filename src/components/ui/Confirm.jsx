import { createContext, useContext, useCallback, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal.jsx'
import { Button } from './Button'

const ConfirmCtx = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const resolver = useRef(null)

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        resolver.current = resolve
        setState({
          title: 'Подтвердите действие',
          // `alert` — окно-уведомление с одной кнопкой: подтверждать нечего.
          confirmText: opts?.alert ? 'Понятно' : 'Удалить',
          tone: opts?.alert ? 'primary' : 'danger',
          ...opts,
        })
      }),
    [],
  )

  const close = (value) => {
    resolver.current?.(value)
    resolver.current = null
    setState(null)
  }

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title}
        description={state?.description}
        icon={AlertTriangle}
        size="sm"
        footer={
          <>
            {!state?.alert && (
              <Button variant="ghost" onClick={() => close(false)}>
                Отмена
              </Button>
            )}
            <Button
              variant={state?.tone === 'danger' ? 'danger' : 'primary'}
              onClick={() => close(true)}
            >
              {state?.confirmText}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          {state?.body || 'Это действие нельзя отменить.'}
        </p>
      </Modal>
    </ConfirmCtx.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx)
  if (!ctx)
    throw new Error('useConfirm должен вызываться внутри <ConfirmProvider>')
  return ctx
}
