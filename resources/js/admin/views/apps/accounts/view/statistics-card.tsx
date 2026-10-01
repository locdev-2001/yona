// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { Card, CardContent } from '@admin/components/ui/card'

type StatisticsCardProps = {
  icon: ReactNode
  value: string
  title: string
  description?: ReactNode
  className?: string
}

// Cùng khuôn thẻ chỉ số của trang Tổng quan: nhãn xám nhỏ trên, số lớn dưới.
const StatisticsCard = ({ icon, value, title, description, className }: StatisticsCardProps) => {
  return (
    <Card size='sm' className={className}>
      <CardContent className='flex flex-col gap-2'>
        <div className='flex items-center justify-between gap-2'>
          <span className='text-muted-foreground min-w-0 text-sm'>{title}</span>
          <span className='bg-(--tone)/15 text-(--tone) flex size-7 shrink-0 items-center justify-center rounded-sm'>
            {icon}
          </span>
        </div>
        <span className='text-2xl font-medium tabular-nums'>{value}</span>
        {description ? <p className='text-muted-foreground text-xs'>{description}</p> : null}
      </CardContent>
    </Card>
  )
}

export default StatisticsCard
