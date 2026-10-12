import { cn } from '@/lib/cn.js'

export function Card({ className, hover = false, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-surface shadow-soft overflow-auto',
        // Карточка, на которую нажимают: при наведении приподнимается и
        // подсвечивается фирменным жёлтым.
        hover &&
          'transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-lift',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex items-start justify-between gap-4 p-5', className)}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn('text-[15px] font-semibold text-ink', className)}
      {...props}
    />
  )
}

export function CardBody({ className, ...props }) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}
