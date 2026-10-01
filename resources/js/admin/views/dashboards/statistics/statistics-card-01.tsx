// Type Imports
import type { ReactNode } from 'react'

// Third-party Imports
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

// Component Imports
import { Card, CardContent, CardHeader } from '@admin/components/ui/card'

// Statistics card data type
type StatisticsCardProps = {
  icon: ReactNode
  value: string
  title: string
  // Chênh lệch đã định dạng ("+12,5%"); null khi không có kỳ trước để so.
  changePercentage: string | null
  trend?: 'up' | 'down' | 'flat'
  comparisonText: string
  className?: string
}

const StatisticsCard = ({
  icon,
  value,
  title,
  changePercentage,
  trend = 'flat',
  comparisonText,
  className
}: StatisticsCardProps) => {
  return (
    <Card className={className}>
      <CardHeader className='flex items-center gap-2'>
        <div className='bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-sm'>
          {icon}
        </div>
        <span className='text-2xl tabular-nums'>{value}</span>
      </CardHeader>
      <CardContent className='flex flex-col gap-2'>
        <span className='text-base font-semibold'>{title}</span>
        {changePercentage !== null ? (
          <p className='flex flex-wrap items-center gap-x-2'>
            <span className='flex items-center gap-1 tabular-nums'>
              {trend === 'up' ? <ChevronUpIcon className='size-4' aria-hidden='true' /> : null}
              {trend === 'down' ? <ChevronDownIcon className='size-4' aria-hidden='true' /> : null}
              {changePercentage}
            </span>
            <span className='text-muted-foreground'>{comparisonText}</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default StatisticsCard
