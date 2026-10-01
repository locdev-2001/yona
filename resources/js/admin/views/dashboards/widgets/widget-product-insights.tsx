// Util Imports
import { cn } from '@admin/lib/utils'
import { TONE_BORDER, type Tone } from '@admin/views/dashboards/tones'

export type InsightStat = {
  key: string
  label: string
  value: string
  className?: string
  // false: giá trị là chữ / phiên bản ("4.17.1", "local") thì in chữ thường, không dùng số đều bề rộng
  // (font-num giãn "4.17.1" rộng hơn ~30% so với chữ quanh nó).
  numeric?: boolean
  // Dòng nhỏ dưới số (ngày của số cao nhất…).
  hint?: string
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
      // Ô hẹp: mỗi số một dòng (nhãn trái, số phải) để nhãn không xuống dòng và hàng không vỡ 2+1;
      // ô rộng: ba cột nhãn trên, số dưới.
      <dl className={cn('grid grid-cols-1 gap-3 @md:grid-cols-3 @md:gap-4', className)}>
        {stats.map(stat => (
          <div
            key={stat.key}
            className={cn(
              'flex min-w-0 items-baseline justify-between gap-3 border-l-4 pl-3 @md:flex-col @md:items-start @md:justify-start @md:gap-1',
              TONE_BORDER[stat.tone ?? 'neutral']
            )}
          >
            <dt className='min-w-0 text-sm text-neutral-500'>{stat.label}</dt>
            <dd className={cn('font-num shrink-0 text-right text-lg font-medium text-neutral-900 @md:text-left @md:text-2xl', stat.className)}>
              {stat.value}
              {stat.hint ? <span className='ml-1.5 text-sm font-normal text-neutral-500 @md:ml-0 @md:block'>{stat.hint}</span> : null}
            </dd>
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
          <dd className={cn('shrink-0 text-sm font-medium text-neutral-900', stat.numeric !== false && 'font-num', stat.className)}>{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default ProductInsightsStats
