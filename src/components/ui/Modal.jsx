import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn.js'
import { fileHref } from '@/features/files/download'

// Сколько держим модалку в DOM после закрытия — ровно на время анимации.
const CLOSE_MS = 180

const sizes = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  // Логотип бренда — показываем вместо иконки, если он есть.
  logo,
  children,
  footer,
  // Слой поверх всего окна — например, ход загрузки на время сохранения.
  overlay,
  size = 'md',
}) {
  const logoSrc = fileHref(typeof logo === 'string' ? logo : null)

  // Размонтируем сами, по таймеру: AnimatePresence в связке с порталом
  // доигрывала анимацию закрытия, но оставляла оверлей в DOM — он перекрывал
  // страницу и гасил все клики.
  const [mounted, setMounted] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const timer = setTimeout(() => setMounted(false), CLOSE_MS)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <motion.div
      className={cn(
        'fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4',
        // Пока доигрывает закрытие, кликам мешать нельзя.
        !open && 'pointer-events-none',
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: open ? 1 : 0 }}
      transition={{ duration: CLOSE_MS / 1000 }}
    >
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={
          open
            ? { y: 0, opacity: 1, scale: 1 }
            : { y: 24, opacity: 0, scale: 0.98 }
        }
        transition={
          open
            ? { type: 'spring', stiffness: 320, damping: 30 }
            : { duration: CLOSE_MS / 1000 }
        }
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-lift sm:rounded-3xl',
          sizes[size],
        )}
      >
        <div className="flex items-start gap-3 border-b border-line px-6 py-5">
          {/* logo — либо ссылка на картинку бренда, либо готовый знак. */}
          {logo && typeof logo !== 'string' ? (
            <span className="flex shrink-0 items-center">{logo}</span>
          ) : logoSrc ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
              <img
                src={logoSrc}
                alt=""
                className="h-full w-full object-contain p-1"
              />
            </span>
          ) : (
            Icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900">
                <Icon size={20} strokeWidth={2} />
              </div>
            )
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink focus-ring"
          >
            <X size={18} />
          </button>
        </div>

        {/* Тело — только если есть что показать: у коротких предупреждений
            его нет, и пустые отступы разрывали бы шапку и кнопки. */}
        {children != null && children !== false && (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {children}
          </div>
        )}

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-paper/50 px-6 py-4">
            {footer}
          </div>
        )}

        {overlay && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/90 p-6 backdrop-blur-[2px]">
            {overlay}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  )
}
