// Type Imports
import type { ReactNode } from 'react'

// Third-party Imports
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

// Component Imports
import { Card, CardContent } from '@admin/components/ui/card'

// Statistics card data type
type StatisticsCardProps = {
  icon: ReactNode
  value: string
  title: string
  // Chênh lệch đã định dạng ("+12,5%"); null thì dòng cuối là `note`.
  changePercentage: string | null
  trend?: 'up' | 'down' | 'flat'
  comparisonText: string
  // Dòng cuối khi không có chênh lệch để so: luôn có một dòng để mọi thẻ cao bằng nhau.
  note: string
  className?: string
}

// Thẻ chỉ số: nhãn xám nhỏ trên cùng, số lớn, rồi một dòng so sánh. Cùng thứ bậc với
// các ô số khác của trang (nhãn trước, số sau).
const StatisticsCard = ({
  icon,
  value,
  title,
  changePercentage,
  trend = 'flat',
  comparisonText,
  note,
  className
}: StatisticsCardProps) => {
  return (
    <Card size='sm' className={className}>
      <CardContent className='flex flex-col gap-2'>
        {/* Lưới hai cột (điện thoại) giữ chỗ hai dòng nhãn để nhãn dài xuống dòng không làm lệch chiều cao các hàng thẻ. */}
        <div className='flex min-h-10 items-start justify-between gap-2 @3xl:min-h-0 @3xl:items-center'>
          <span className='text-muted-foreground min-w-0 text-sm'>{title}</span>
          <span className='bg-(--tone)/15 text-(--tone) flex size-7 shrink-0 items-center justify-center rounded-sm'>
            {icon}
          </span>
        </div>
        <span className='text-2xl font-medium tabular-nums'>{value}</span>
        <p className='text-muted-foreground flex min-w-0 items-center gap-1 text-xs'>
          {changePercentage !== null ? (
            <>
              <span className='text-foreground flex items-center gap-0.5 tabular-nums'>
                {trend === 'up' ? <ChevronUpIcon className='size-3.5' aria-hidden='true' /> : null}
                {trend === 'down' ? <ChevronDownIcon className='size-3.5' aria-hidden='true' /> : null}
                {changePercentage}
              </span>
              <span className='truncate'>{comparisonText}</span>
            </>
          ) : (
            <span className='truncate'>{note}</span>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

export default StatisticsCard
