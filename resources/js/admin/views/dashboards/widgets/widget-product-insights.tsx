// Type Imports
import type { ReactNode } from 'react'

// Util Imports
import { cn } from '@admin/lib/utils'

export type InsightStat = {
  key: string
  label: string
  value: string
  // Phần bên phải dòng (huy hiệu, biểu đồ nhỏ…).
  aside?: ReactNode
  className?: string
}

type Props = {
  stats: InsightStat[]
  // Bày các số thành cột thay vì chồng dòng (khi số ít và ô đủ rộng).
  columns?: boolean
  className?: string
}

// Các số nổi bật của một ô: nhãn nhỏ trên, số lớn dưới.
const ProductInsightsStats = ({ stats, columns = false, className }: Props) => {
  return (
    <dl className={cn(columns ? 'grid grid-cols-2 gap-4 @md:grid-cols-3' : 'space-y-4', className)}>
      {stats.map(stat => (
        <div key={stat.key} className='flex items-center justify-between gap-1'>
          <div className='flex flex-col gap-1'>
            <dt className='text-xs'>{stat.label}</dt>
            <dd className={cn('text-2xl font-semibold tabular-nums', stat.className)}>{stat.value}</dd>
          </div>
          {stat.aside}
        </div>
      ))}
    </dl>
  )
}

export default ProductInsightsStats
