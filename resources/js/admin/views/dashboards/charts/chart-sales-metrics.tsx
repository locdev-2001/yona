// React Imports
import { useId } from 'react'
import type { ReactNode } from 'react'

// Third-party Imports
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Label, LabelList, Pie, PieChart, XAxis, YAxis } from 'recharts'

// Component Imports
import { Avatar, AvatarFallback } from '@admin/components/ui/avatar'
import { Card, CardContent } from '@admin/components/ui/card'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@admin/components/ui/chart'

// Util Imports
import { cn } from '@admin/lib/utils'
import { CHART_SERIES, TONE_CHIP, TONE_RULE, type Tone } from '@admin/views/dashboards/tones'

export type ChartSeries = {
  key: string
  label: string
  values: number[]
  // Màu nét; bỏ trống thì lấy theo thứ tự chuỗi app.md §5.
  color?: string
  // Nét đứt: chuỗi thứ hai đọc được kể cả khi không phân biệt màu.
  dashed?: boolean
}

// Mảng dưới đường: một màu phẳng, độ mờ thấp. Không gradient.
const AREA_FILL_OPACITY = 0.12

// Chú giải có hình: mẫu nét liền / nét đứt cùng màu với đường, nhãn chữ trung tính.
const SeriesLegend = ({ series, colorOf }: { series: ChartSeries[]; colorOf: (index: number) => string }) => (
  <ul className='flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-neutral-700'>
    {series.map((item, index) => (
      <li key={item.key} className='flex items-center gap-2'>
        <span
          aria-hidden='true'
          className={cn('w-5 border-t-2', item.dashed ? 'border-dashed' : 'border-solid')}
          style={{ borderColor: colorOf(index) }}
        />
        {item.label}
      </li>
    ))}
  </ul>
)

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

  const colorOf = (index: number) => series[index]?.color ?? CHART_SERIES[index % CHART_SERIES.length]

  const chartConfig = Object.fromEntries(
    series.map((item, index) => [item.key, { label: item.label, color: colorOf(index) }])
  ) satisfies ChartConfig

  const chartData = dates.map((date, index) => ({
    date,
    ...Object.fromEntries(series.map(item => [item.key, item.values[index] ?? 0]))
  }))

  const axes = (
    <>
      <CartesianGrid vertical={false} stroke='var(--color-neutral-200)' />
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
              <Bar
                key={item.key}
                dataKey={item.key}
                fill={`var(--color-${item.key})`}
                radius={[4, 4, 0, 0]}
                animationDuration={300}
              >
                {/* Nhãn số trực tiếp trên cột có giá trị: đọc được không qua màu. */}
                <LabelList
                  dataKey={item.key}
                  position='top'
                  offset={6}
                  className='fill-neutral-700 font-num text-xs'
                  formatter={(value: unknown) => (typeof value === 'number' && value > 0 ? formatValue(value) : '')}
                />
              </Bar>
            ))}
          </BarChart>
        ) : (
          <AreaChart accessibilityLayer data={chartData} margin={{ left: -8, right: 8 }}>
            {axes}
            {series.map(item => (
              <Area
                key={item.key}
                dataKey={item.key}
                type='monotone'
                stroke={`var(--color-${item.key})`}
                strokeWidth={2}
                strokeDasharray={item.dashed ? '6 4' : undefined}
                fill={`var(--color-${item.key})`}
                fillOpacity={AREA_FILL_OPACITY}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                animationDuration={300}
              />
            ))}
          </AreaChart>
        )}
      </ChartContainer>
      {series.length > 1 ? <SeriesLegend series={series} colorOf={colorOf} /> : null}
      <table className='sr-only'>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope='col' className='font-normal'>
              {dateLabel}
            </th>
            {series.map(item => (
              <th scope='col' key={item.key} className='font-normal'>
                {item.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((date, index) => (
            <tr key={date}>
              <th scope='row' className='font-normal'>
                {formatDate(date)}
              </th>
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

export type MetricBox = { key: string; icon: ReactNode; title: string; value: string; tone?: Tone }

// Các ô số nhỏ viền mảnh: vạch màu mép trái, biểu tượng trong ô vuông cùng màu, nhãn và số.
export const MetricBoxes = ({ metrics, className }: { metrics: MetricBox[]; className?: string }) => {
  return (
    <div className={className ?? 'grid gap-4 @md:grid-cols-2'}>
      {metrics.map(metric => (
        <Card key={metric.key} className='relative bg-neutral-50 py-2 shadow-none'>
          <span aria-hidden='true' className={cn('absolute inset-y-0 left-0 w-1', TONE_RULE[metric.tone ?? 'primary'])} />
          <CardContent className='flex items-center gap-3 px-4'>
            <Avatar className='rounded-sm after:border-0'>
              <AvatarFallback className={cn('shrink-0 rounded-sm', TONE_CHIP[metric.tone ?? 'primary'])}>{metric.icon}</AvatarFallback>
            </Avatar>
            <div className='flex min-w-0 flex-col gap-0.5'>
              <span className='truncate text-sm font-medium text-neutral-500'>{metric.title}</span>
              <span className='truncate text-lg font-medium text-neutral-900'>{metric.value}</span>
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

// Vành khuyên có số ở giữa, dòng tỉ lệ (tuỳ chọn) và chú giải từng phần bên dưới (tuỳ chọn).
// Phần bằng 0 không vẽ: một phần duy nhất phủ kín vòng, không có khe nối.
export const GoalDonut = ({
  title,
  slices,
  centerValue,
  centerLabel,
  footerLabel,
  footerValue,
  footerClassName,
  legend
}: {
  title: string
  slices: GoalSlice[]
  centerValue: string
  centerLabel: string
  footerLabel?: string
  footerValue?: string
  footerClassName?: string
  legend?: ReactNode
}) => {
  const shown = slices.filter(slice => slice.value > 0)
  const config = Object.fromEntries(
    [...slices, { key: 'empty', label: '', color: 'var(--muted)' }].map(slice => [
      slice.key,
      { label: slice.label, color: slice.color }
    ])
  ) satisfies ChartConfig
  const data =
    shown.length > 0
      ? shown.map(slice => ({ key: slice.key, value: slice.value, fill: `var(--color-${slice.key})` }))
      : [{ key: 'empty', value: 1, fill: 'var(--color-empty)' }]
  const summary = slices.map(slice => `${slice.label}: ${slice.value}`).join(', ')

  return (
    <figure aria-label={title} className='space-y-4'>
      <figcaption className='sr-only'>{footerLabel ? `${footerLabel}: ${footerValue}. ${summary}` : summary}</figcaption>
      <ChartContainer config={config} className='h-38.5 w-full' aria-hidden='true'>
        <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
          {shown.length > 0 ? <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey='key' />} /> : null}
          <Pie
            data={data}
            dataKey='value'
            nameKey='key'
            startAngle={90}
            endAngle={-270}
            innerRadius={58}
            outerRadius={75}
            paddingAngle={shown.length > 1 ? 2 : 0}
            stroke='none'
            isAnimationActive={false}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor='middle' dominantBaseline='middle'>
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 10} className='fill-card-foreground text-lg font-medium'>
                        {centerValue}
                      </tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 14} className='fill-muted-foreground text-sm'>
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
      {footerLabel ? (
        <div className='flex items-baseline justify-between gap-3'>
          <span className='text-muted-foreground text-sm'>{footerLabel}</span>
          <span className={cn('text-lg font-medium', footerClassName ?? 'text-neutral-900')}>{footerValue}</span>
        </div>
      ) : null}
      {legend}
    </figure>
  )
}

export default TimeSeriesChart
