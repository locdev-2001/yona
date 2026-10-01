// Util Imports
import { cn } from '@admin/lib/utils'
import { MEANING_TONE, TONE_RULE } from '@admin/views/dashboards/tones'

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
  // Nhãn trục số (định dạng số theo ngôn ngữ).
  formatValue?: (value: number) => string
  className?: string
}

// Cột tin mỗi ngày trong 30 ngày. Không có rãnh nền cao tối đa (trông như mã vạch, ngày 0 lẫn với
// ngày có tin): chỉ ngày có tin mới có cột; ngày 0 là một vạch mảnh trên đường đáy. Trục số in mức
// cao nhất và 0 cùng đường lưới, trục ngày in hai đầu. Màu cột = họ "tin nhắn" (MEANING_TONE).
export function UsageChart({
  data,
  seriesLabel,
  summary,
  dayLabel,
  startLabel,
  endLabel,
  formatValue = String,
  className
}: UsageChartProps) {
  const max = Math.max(0, ...data.map(day => day.count))
  const scale = Math.max(1, max)

  return (
    <figure className={cn('flex flex-col gap-2', className)}>
      <div className='flex min-h-40 flex-1 gap-2'>
        <div aria-hidden='true' className='font-num flex flex-col justify-between text-right text-xs text-neutral-500'>
          <span className='-translate-y-1/2'>{formatValue(max)}</span>
          <span className='translate-y-1/2'>0</span>
        </div>
        <div
          role='img'
          aria-label={`${seriesLabel}: ${summary}`}
          className='relative flex min-w-0 flex-1 items-end gap-1 border-b border-neutral-300'
        >
          <span aria-hidden='true' className='absolute inset-x-0 top-0 border-t border-dashed border-neutral-200' />
          {data.map(day => (
            <div key={day.date} title={dayLabel(day)} className='flex h-full min-w-0 flex-1 flex-col justify-end'>
              {day.count > 0 ? (
                <div
                  className={cn('w-full rounded-t-sm', TONE_RULE[MEANING_TONE.messages])}
                  style={{ height: `${(day.count / scale) * 100}%` }}
                />
              ) : (
                <div className='h-0.5 w-full bg-neutral-200' />
              )}
            </div>
          ))}
        </div>
      </div>
      <figcaption className='flex justify-between pl-6 text-xs text-neutral-500'>
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </figcaption>
    </figure>
  )
}
