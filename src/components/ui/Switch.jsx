import { cn } from '@/lib/cn.js'

/**
 * Переключатель вкл/выкл. Внутри <label> переключается и кликом по подписи.
 * checked — состояние, onChange(next) — новое значение.
 */
export function Switch({ checked, onChange, disabled, className, ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors focus-ring disabled:opacity-50',
        checked ? 'bg-indigo-500' : 'bg-ink/15',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow-soft transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}
