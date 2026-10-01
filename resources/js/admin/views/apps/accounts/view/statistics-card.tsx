// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { Card, CardContent, CardHeader } from '@admin/components/ui/card'

type StatisticsCardProps = {
  icon: ReactNode
  value: string
  title: string
  description?: ReactNode
  className?: string
}

const StatisticsCard = ({ icon, value, title, description, className }: StatisticsCardProps) => {
  return (
    <Card className={className}>
      <CardHeader className='flex items-center gap-2'>
        <div className='bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-sm'>
          {icon}
        </div>
        <span className='text-2xl'>{value}</span>
      </CardHeader>
      <CardContent className='flex flex-col gap-2'>
        <span className='text-base font-semibold'>{title}</span>
        {description ? <p className='text-muted-foreground'>{description}</p> : null}
      </CardContent>
    </Card>
  )
}

export default StatisticsCard
