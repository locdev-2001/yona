// React Imports
import type { ReactNode } from 'react'

// Component Imports
import {
  Timeline,
  TimelineContent,
  TimelineDot,
  TimelineHeading,
  TimelineItem,
  TimelineLine
} from '@admin/components/ui/timeline'

export type ActivityItem = {
  id: string
  description: ReactNode
  timestamp: ReactNode
  timestampTitle?: string
  detail?: ReactNode
}

export interface ActivityTimelineProps {
  activityLog: ActivityItem[]
}

export function ActivityTimeline({ activityLog }: ActivityTimelineProps) {
  return (
    <div className='flex flex-col gap-2.5'>
      <Timeline>
        {activityLog.map((item, index) => {
          const isLast = index === activityLog.length - 1

          return (
            <TimelineItem key={item.id} status='done' className='gap-x-0'>
              <TimelineDot
                status='custom'
                className='bg-primary/20 flex size-4.5 shrink-0 items-center justify-center rounded-full'
              >
                <span className='bg-primary size-3 rounded-full' />
              </TimelineDot>
              {!isLast && <TimelineLine done className='bg-muted min-h-10' />}
              <TimelineHeading className='text-foreground flex w-full items-center justify-between gap-3 pt-2.5 pb-2 pl-4 text-sm font-medium text-wrap md:text-base'>
                <span className='min-w-0 break-words'>{item.description}</span>
                <span
                  className='text-muted-foreground text-xs font-normal text-nowrap md:text-sm'
                  title={item.timestampTitle}
                >
                  {item.timestamp}
                </span>
              </TimelineHeading>
              {item.detail ? (
                <TimelineContent className='flex flex-col gap-2 pb-3 pl-4'>
                  <span className='text-muted-foreground text-sm break-words'>{item.detail}</span>
                </TimelineContent>
              ) : (
                <TimelineContent className='pb-3 pl-4' />
              )}
            </TimelineItem>
          )
        })}
      </Timeline>
    </div>
  )
}
