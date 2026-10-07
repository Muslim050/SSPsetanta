import { Logo } from '@/components/Logo'
import { cn } from '@/lib/cn.js'

// Дуга вырезается в кольцо маской: конический градиент сам по себе залил бы
// весь круг. Хвост гаснет — так видно, куда бежит дуга.
const ARC = {
  background:
    'conic-gradient(from 0deg, transparent 0deg 200deg, rgba(255,209,6,0.18) 300deg, #FFD106 352deg, transparent 360deg)',
  WebkitMaskImage:
    'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
  maskImage:
    'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
  animationDuration: '1.6s',
}

/**
 * Ожидание с фирменным знаком: логотип в центре, вокруг бежит дуга.
 * `full` растягивает лоадер на весь экран — это вход в платформу; без него
 * лоадер занимает место содержимого, пока данные раздела не пришли.
 *
 * @param {{
 *   label?: string,
 *   size?: number,
 *   full?: boolean,
 *   className?: string,
 * }} props
 */
export function Loader({ label, size = 264, full = false, className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'flex flex-col items-center justify-center gap-5',
        // Без `full` лоадер занимает всю видимую область раздела: шапка 64px
        // плюс отступы main — иначе он прижимается к верху страницы.
        full
          ? 'min-h-screen bg-paper'
          : 'min-h-[calc(100vh-112px)] sm:min-h-[calc(100vh-128px)]',
        className,
      )}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Мягкое свечение под знаком — оно держит центр композиции. */}
        <span className="absolute inset-[26%] rounded-full bg-[#FFD106]/20 blur-3xl" />
        {/* Дорожка кольца: почти незаметная, дуга бежит по ней. */}
        <span className="absolute inset-0 rounded-full border border-ink/8" />
        <span
          className="absolute inset-0 animate-spin rounded-full"
          style={ARC}
        />

        <div className="relative flex flex-col items-center gap-2.5">
          <Logo size={46} withWord={false} />
          {/* Название набираем в два ряда, как в самом логотипе. */}
          <span className="flex flex-col items-center font-display-cond uppercase text-ink">
            <span className="text-[15px] font-bold leading-none tracking-[0.02em]">
              Setanta Sports
            </span>
            <span className="mt-1 text-[10px] font-medium leading-none tracking-[0.22em] text-ink-muted">
              Platform
            </span>
          </span>
        </div>
      </div>

      {label && <p className="text-[13px] text-ink-muted">{label}</p>}
      <span className="sr-only">Загрузка</span>
    </div>
  )
}
