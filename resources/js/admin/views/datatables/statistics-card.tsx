// Type Imports
import type { ReactNode } from 'react'

// Component Imports
import { Card, CardContent, CardHeader } from '@admin/components/ui/card'

// Util Imports
import { cn } from '@admin/lib/utils'
import { TONE_CHIP, TONE_RULE, TONE_TEXT, type Tone } from '@admin/views/dashboards/tones'

// Statistics card data type
type StatisticsCardProps = {
  icon: ReactNode
  value: string
  title: string
  description?: ReactNode
  // Màu theo nghĩa: vạch đỉnh thẻ, ô biểu tượng và màu số.
  tone?: Tone
  className?: string
}

const StatisticsCard = ({ icon, value, title, description, tone = 'primary', className }: StatisticsCardProps) => {
  return (
    <Card className={cn('relative', className)}>
      <span aria-hidden='true' className={cn('absolute inset-x-0 top-0 h-1', TONE_RULE[tone])} />
      <CardHeader className='flex items-center gap-2'>
        <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-sm', TONE_CHIP[tone])}>{icon}</div>
        <span className={cn('text-2xl font-medium', TONE_TEXT[tone])}>{value}</span>
      </CardHeader>
      <CardContent className='flex flex-col gap-2'>
        <span className='text-base font-medium text-neutral-900'>{title}</span>
        {description ? <p className='text-neutral-500'>{description}</p> : null}
      </CardContent>
    </Card>
  )
}

export default StatisticsCard
