// React Imports
import { useId } from 'react'

// Third-party Imports
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

// Component Imports
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from '@admin/components/ui/chart'

export type ChartSeries = { key: string; label: string; values: number[] }

// Màu chuỗi theo sắc độ của màu chính, như các biểu đồ khác trong console.
const SERIES_COLORS = [
  'var(--primary)',
  'color-mix(in oklab, var(--primary) 45%, transparent)',
  'color-mix(in oklab, var(--primary) 20%, transparent)'
]

type Props = {
  title: string
  dates: string[]
  series: ChartSeries[]
  variant?: 'line' | 'bar'
  // Câu tóm tắt cho trình đọc màn hình (tổng, đỉnh…).
  summary: string
  dateLabel: string
  formatDate: (date: string) => string
  formatValue: (value: number) => string
}

// Biểu đồ theo ngày (đường hoặc cột). Trình đọc màn hình đọc câu tóm tắt và bảng số ẩn.
const TimeSeriesChart = ({
  title,
  dates,
  series,
  variant = 'line',
  summary,
  dateLabel,
  formatDate,
  formatValue
}: Props) => {
  const summaryId = useId()

  const chartConfig = Object.fromEntries(
    series.map((item, index) => [item.key, { label: item.label, color: SERIES_COLORS[index % SERIES_COLORS.length] }])
  ) satisfies ChartConfig

  const chartData = dates.map((date, index) => ({
    date,
    ...Object.fromEntries(series.map(item => [item.key, item.values[index] ?? 0]))
  }))

  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey='date'
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        minTickGap={24}
        tickFormatter={(value: string) => formatDate(value)}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={40}
        allowDecimals={false}
        tickFormatter={(value: number) => formatValue(value)}
      />
      <ChartTooltip
        content={<ChartTooltipContent labelFormatter={value => formatDate(String(value))} />}
        cursor={variant === 'bar' ? undefined : false}
      />
      {series.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null}
    </>
  )

  return (
    <figure aria-label={title} aria-describedby={summaryId} className='flex flex-col gap-3'>
      <p id={summaryId} className='sr-only'>
        {summary}
      </p>
      <ChartContainer config={chartConfig} className='aspect-auto h-60 w-full'>
        {variant === 'bar' ? (
          <BarChart accessibilityLayer data={chartData} margin={{ left: -8, right: 8 }}>
            {axes}
            {series.map(item => (
              <Bar key={item.key} dataKey={item.key} fill={`var(--color-${item.key})`} radius={4} />
            ))}
          </BarChart>
        ) : (
          <LineChart accessibilityLayer data={chartData} margin={{ left: -8, right: 8 }}>
            {axes}
            {series.map(item => (
              <Line
                key={item.key}
                dataKey={item.key}
                type='monotone'
                stroke={`var(--color-${item.key})`}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        )}
      </ChartContainer>
      <table className='sr-only'>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope='col'>{dateLabel}</th>
            {series.map(item => (
              <th scope='col' key={item.key}>
                {item.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((date, index) => (
            <tr key={date}>
              <th scope='row'>{formatDate(date)}</th>
              {series.map(item => (
                <td key={item.key}>{item.values[index] ?? 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export default TimeSeriesChart
