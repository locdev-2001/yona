// Util Imports
import { cn } from '@admin/lib/utils'

export type UsageDay = { date: string; label: string; count: number }

export interface UsageChartProps {
  data: UsageDay[]
  seriesLabel: string
  // Câu tóm tắt cho trình đọc màn hình ("49 tin").
  summary: string
  // Nội dung chú thích khi rê chuột lên một cột: "02/09/2026: 3 tin".
  dayLabel: (day: UsageDay) => string
  startLabel: string
  endLabel: string
  className?: string
}

// Cột tin mỗi ngày trong 30 ngày. Mọi ngày đều có rãnh nền (kể cả ngày 0 tin) nên
// nhịp cột đều; chú thích là title gốc của trình duyệt, không có hộp nổi che cột.
export function UsageChart({ data, seriesLabel, summary, dayLabel, startLabel, endLabel, className }: UsageChartProps) {
  const max = Math.max(1, ...data.map(day => day.count))

  return (
    <figure className={cn('flex flex-col gap-2', className)}>
      <div role='img' aria-label={`${seriesLabel}: ${summary}`} className='flex min-h-40 flex-1 items-stretch gap-1'>
        {data.map(day => (
          <div
            key={day.date}
            title={dayLabel(day)}
            className='bg-primary/10 relative flex min-w-0 flex-1 flex-col justify-end overflow-hidden rounded-sm'
          >
            {day.count > 0 ? (
              <div className='bg-primary w-full rounded-sm' style={{ height: `${(day.count / max) * 100}%` }} />
            ) : null}
          </div>
        ))}
      </div>
      <figcaption className='text-muted-foreground flex justify-between text-xs tabular-nums'>
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </figcaption>
    </figure>
  )
}
