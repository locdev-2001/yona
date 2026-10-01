// Third-party Imports
import { Bar, BarChart, XAxis } from 'recharts'

// Component Imports
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@admin/components/ui/chart'

export type UsageDay = { date: string; label: string; count: number }

export interface UsageChartProps {
  data: UsageDay[]
  seriesLabel: string
  summary: string
  startLabel: string
  endLabel: string
}

// Cột tin mỗi ngày trong 30 ngày, ngày không có tin vẫn giữ chỗ bằng nền mờ.
export function UsageChart({ data, seriesLabel, summary, startLabel, endLabel }: UsageChartProps) {
  const chartConfig = {
    count: {
      label: seriesLabel,
      color: 'var(--primary)'
    }
  } satisfies ChartConfig

  return (
    <figure className='flex flex-col gap-2'>
      <ChartContainer config={chartConfig} className='h-40 w-full' role='img' aria-label={`${seriesLabel}: ${summary}`}>
        <BarChart accessibilityLayer data={data} margin={{ left: 0, right: 0 }} maxBarSize={16}>
          <XAxis dataKey='label' hide />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar
            dataKey='count'
            fill='var(--color-count)'
            background={{ fill: 'color-mix(in oklab, var(--primary) 10%, transparent)', radius: 4 }}
            radius={4}
          />
        </BarChart>
      </ChartContainer>
      <figcaption className='text-muted-foreground flex justify-between text-xs'>
        <span>{startLabel}</span>
        <span className='text-foreground font-medium'>{summary}</span>
        <span>{endLabel}</span>
      </figcaption>
    </figure>
  )
}
