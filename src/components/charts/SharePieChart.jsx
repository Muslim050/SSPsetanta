import { Cell, Pie, PieChart } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { colorAt } from './palette.js'
import { formatShare } from '@/lib/format.js'

/**
 * Кольцо на shadcn/ui Chart (Recharts под капотом). Грузится отдельным
 * чанком — см. SharePie.jsx, там же размеры и центр диаграммы.
 */
export default function SharePieChart({ data, size, thickness }) {
  // Тултип берёт подпись и цвет из config по nameKey.
  const config = Object.fromEntries(
    data.map((item, index) => [
      item.label,
      { label: item.label, color: colorAt(item, index) },
    ]),
  )

  const outer = size / 2
  const inner = Math.max(0, outer - thickness)

  return (
    <ChartContainer
      config={config}
      className="aspect-square h-full w-full"
      initialDimension={{ width: size, height: size }}
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              nameKey="label"
              hideLabel
              formatter={(value, name) => (
                <div className="flex flex-1 items-center justify-between gap-3">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="font-medium text-foreground tnum">
                    {formatShare(value)}
                  </span>
                </div>
              )}
            />
          }
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={inner}
          outerRadius={outer}
          // Зазор между секторами — второй признак к цвету.
          paddingAngle={2}
          stroke="var(--color-surface)"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {data.map((item, index) => (
            <Cell
              key={item.id ?? item.label ?? index}
              fill={colorAt(item, index)}
            />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
