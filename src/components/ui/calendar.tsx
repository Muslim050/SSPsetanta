import * as React from 'react'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
} from 'react-day-picker'
import { ru } from 'react-day-picker/locale'
import { cn } from '@/lib/cn.js'

/**
 * Calendar из shadcn/ui (ui.shadcn.com/docs/components/calendar) — обёртка
 * над react-day-picker v9. Изменено против оригинала: `cn` из проекта;
 * вместо shadcn-токенов (primary, accent, ring) и его `buttonVariants` —
 * цвета и классы проекта; по умолчанию русская локаль (неделя с понедельника).
 */
const navButton =
  'inline-flex size-(--cell-size) items-center justify-center rounded-lg p-0 text-ink-muted transition-colors select-none hover:bg-ink/6 hover:text-ink focus-ring aria-disabled:opacity-50'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  locale = ru,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale}
      className={cn(
        'group/calendar p-3 [--cell-size:--spacing(8)]',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString('ru', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn(
          'relative flex flex-col gap-4 md:flex-row',
          defaultClassNames.months,
        ),
        month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
        nav: cn(
          'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
          defaultClassNames.nav,
        ),
        button_previous: cn(navButton, defaultClassNames.button_previous),
        button_next: cn(navButton, defaultClassNames.button_next),
        month_caption: cn(
          'flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)',
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          'flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium',
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          'relative rounded-lg border border-line has-focus:border-indigo-300',
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          'absolute inset-0 bg-surface opacity-0',
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          'font-medium text-ink capitalize select-none',
          captionLayout === 'label'
            ? 'text-sm'
            : 'flex h-8 items-center gap-1 rounded-lg pr-1 pl-2 text-sm [&>svg]:size-3.5 [&>svg]:text-ink-muted',
          defaultClassNames.caption_label,
        ),
        month_grid: cn('w-full border-collapse', defaultClassNames.month_grid),
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'flex-1 rounded-lg text-[0.8rem] font-normal text-ink-muted capitalize select-none',
          defaultClassNames.weekday,
        ),
        week: cn('mt-1 flex w-full', defaultClassNames.week),
        week_number_header: cn(
          'w-(--cell-size) select-none',
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          'text-[0.8rem] text-ink-muted select-none',
          defaultClassNames.week_number,
        ),
        day: cn(
          'group/day relative aspect-square h-full w-full p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-lg',
          props.showWeekNumber
            ? '[&:nth-child(2)[data-selected=true]_button]:rounded-l-lg'
            : '[&:first-child[data-selected=true]_button]:rounded-l-lg',
          defaultClassNames.day,
        ),
        range_start: cn(
          'rounded-l-lg bg-indigo-50',
          defaultClassNames.range_start,
        ),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn('rounded-r-lg bg-indigo-50', defaultClassNames.range_end),
        today: cn(
          'rounded-lg bg-ink/5 text-ink data-[selected=true]:rounded-none',
          defaultClassNames.today,
        ),
        outside: cn(
          'text-ink-muted/60 aria-selected:text-ink-muted',
          defaultClassNames.outside,
        ),
        disabled: cn('text-ink-muted opacity-40', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return (
              <ChevronLeftIcon className={cn('size-4', className)} {...props} />
            )
          }

          if (orientation === 'right') {
            return (
              <ChevronRightIcon
                className={cn('size-4', className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn('size-4', className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        'flex aspect-square size-auto w-full min-w-(--cell-size) flex-col items-center justify-center gap-1 rounded-lg text-[13px] leading-none font-normal text-ink-soft transition-colors tnum hover:bg-ink/5 hover:text-ink focus-ring disabled:pointer-events-none',
        'group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-indigo-300',
        'data-[range-end=true]:rounded-lg data-[range-end=true]:rounded-r-lg data-[range-end=true]:bg-indigo-500 data-[range-end=true]:text-ink',
        'data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-indigo-50 data-[range-middle=true]:text-ink',
        'data-[range-start=true]:rounded-lg data-[range-start=true]:rounded-l-lg data-[range-start=true]:bg-indigo-500 data-[range-start=true]:text-ink',
        'data-[selected-single=true]:bg-indigo-500 data-[selected-single=true]:font-semibold data-[selected-single=true]:text-ink',
        '[&>span]:text-xs [&>span]:opacity-70',
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
