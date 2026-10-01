// Util Imports
import { cn } from '@admin/lib/utils'
import { TONE_BORDER, type Tone } from '@admin/views/dashboards/tones'

export type InsightStat = {
  key: string
  label: string
  value: string
  className?: string
  // Vạch màu mép trái (kiểu cột); dòng không có tone giữ viền trung tính.
  tone?: Tone
}

type Props = {
  stats: InsightStat[]
  // Bày các số thành cột (nhãn trên, số dưới) khi số ít và ô đủ rộng;
  // mặc định là các dòng nhãn trái, số phải, viền mảnh giữa các dòng.
  columns?: boolean
  className?: string
}

// Các số của một ô. Cả hai kiểu cùng thứ bậc với thẻ chỉ số: nhãn xám nhỏ trước, số sau.
const ProductInsightsStats = ({ stats, columns = false, className }: Props) => {
  if (columns) {
    return (
      <dl className={cn('grid grid-cols-2 gap-4 @md:grid-cols-3', className)}>
        {stats.map(stat => (
          <div
            key={stat.key}
            className={cn('flex min-w-0 flex-col gap-1 border-l-4 pl-3', TONE_BORDER[stat.tone ?? 'neutral'])}
          >
            <dt className='text-sm text-neutral-500'>{stat.label}</dt>
            <dd className={cn('text-2xl font-medium text-neutral-900', stat.className)}>{stat.value}</dd>
          </div>
        ))}
      </dl>
    )
  }

  return (
    <dl className={cn('divide-border flex flex-col divide-y', className)}>
      {stats.map(stat => (
        <div key={stat.key} className='flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0'>
          <dt className='min-w-0 text-sm text-neutral-500'>{stat.label}</dt>
          <dd className={cn('font-num shrink-0 text-sm font-medium text-neutral-900', stat.className)}>{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default ProductInsightsStats
