// React Imports
import { useId } from 'react'
import type { ReactNode } from 'react'

// Third-party Imports
import { Bar, BarChart, CartesianGrid, Label, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'

// Component Imports
import { Avatar, AvatarFallback } from '@admin/components/ui/avatar'
import { Card, CardContent } from '@admin/components/ui/card'
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

export type MetricBox = { key: string; icon: ReactNode; title: string; value: string }

// Các ô số nhỏ viền mảnh: biểu tượng trong ô vuông, nhãn và số.
export const MetricBoxes = ({ metrics, className }: { metrics: MetricBox[]; className?: string }) => {
  return (
    <div className={className ?? 'grid gap-4 @md:grid-cols-2'}>
      {metrics.map(metric => (
        <Card key={metric.key} className='ring-foreground/10 py-2 shadow-none ring-1'>
          <CardContent className='flex items-center gap-3 px-4'>
            <Avatar className='rounded-sm after:border-0'>
              <AvatarFallback className='bg-primary/10 text-primary shrink-0 rounded-sm'>{metric.icon}</AvatarFallback>
            </Avatar>
            <div className='flex min-w-0 flex-col gap-0.5'>
              <span className='text-muted-foreground truncate text-sm font-medium'>{metric.title}</span>
              <span className='truncate text-lg font-medium tabular-nums'>{metric.value}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Thẻ lồng viền mảnh cho biểu đồ hay khối phụ bên trong một ô.
export const InsetCard = ({ children, className }: { children: ReactNode; className?: string }) => {
  return <Card className={className ?? 'ring-foreground/10 shadow-none ring-1'}>{children}</Card>
}

type GoalSlice = { key: string; label: string; value: number; color: string }

// Vành khuyên có số ở giữa và dòng tỉ lệ bên dưới.
export const GoalDonut = ({
  title,
  slices,
  centerValue,
  centerLabel,
  footerLabel,
  footerValue
}: {
  title: string
  slices: GoalSlice[]
  centerValue: string
  centerLabel: string
  footerLabel: string
  footerValue: string
}) => {
  const config = Object.fromEntries(slices.map(slice => [slice.key, { label: slice.label, color: slice.color }])) satisfies ChartConfig
  const data = slices.map(slice => ({ key: slice.key, value: slice.value, fill: `var(--color-${slice.key})` }))

  return (
    <figure aria-label={title} className='space-y-4'>
      <figcaption className='sr-only'>{`${footerLabel}: ${footerValue}. ${slices.map(slice => `${slice.label}: ${slice.value}`).join(', ')}`}</figcaption>
      <ChartContainer config={config} className='h-38.5 w-full' aria-hidden='true'>
        <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey='key' />} />
          <Pie
            data={data}
            dataKey='value'
            nameKey='key'
            startAngle={300}
            endAngle={660}
            innerRadius={58}
            outerRadius={75}
            paddingAngle={2}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor='middle' dominantBaseline='middle'>
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 12} className='fill-card-foreground text-lg font-medium'>
                        {centerValue}
                      </tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 19} className='fill-muted-foreground text-sm'>
                        {centerLabel}
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className='flex items-center justify-between'>
        <span className='text-xl'>{footerLabel}</span>
        <span className='text-2xl font-medium tabular-nums'>{footerValue}</span>
      </div>
    </figure>
  )
}

export default TimeSeriesChart
