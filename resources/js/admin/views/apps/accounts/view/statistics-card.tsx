// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { Card, CardContent } from '@admin/components/ui/card'

// Util Imports
import { cn } from '@admin/lib/utils'
import { TONE_CHIP, TONE_RULE, type Tone } from '@admin/views/dashboards/tones'

type StatisticsCardProps = {
  icon: ReactNode
  value: string
  title: string
  description?: ReactNode
  tone?: Tone
  className?: string
}

// Cùng khuôn thẻ chỉ số của trang Tổng quan: nhãn xám nhỏ trên, số lớn dưới.
const StatisticsCard = ({ icon, value, title, description, tone = 'primary', className }: StatisticsCardProps) => {
  return (
    <Card size='sm' className={cn('relative', className)}>
      <span aria-hidden='true' className={cn('absolute inset-x-0 top-0 h-1', TONE_RULE[tone])} />
      <CardContent className='flex flex-col gap-2'>
        <div className='flex items-center justify-between gap-2'>
          <span className='min-w-0 text-sm text-neutral-500'>{title}</span>
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-sm', TONE_CHIP[tone])}>
            {icon}
          </span>
        </div>
        <span className='text-2xl font-medium text-neutral-900'>{value}</span>
        {description ? <p className='text-xs text-neutral-500'>{description}</p> : null}
      </CardContent>
    </Card>
  )
}

export default StatisticsCard
