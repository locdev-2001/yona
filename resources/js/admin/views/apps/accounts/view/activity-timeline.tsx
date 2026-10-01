// React Imports
import type { ReactNode } from 'react'

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

// Dòng thời gian: chấm và đường nối liền một mạch ở cột trái; câu mô tả cỡ thân (nhỏ hơn
// tiêu đề thẻ), người làm / chi tiết ở dòng phụ. Giờ căn theo dòng đầu ở màn rộng, xuống
// dưới câu ở màn hẹp để câu không bị ép thành nhiều dòng.
export function ActivityTimeline({ activityLog }: ActivityTimelineProps) {
  return (
    <ol className='flex flex-col'>
      {activityLog.map((item, index) => {
        const isLast = index === activityLog.length - 1

        return (
          <li key={item.id} className='relative flex gap-3 pb-4 last:pb-0'>
            {!isLast ? <span aria-hidden='true' className='bg-border absolute top-4.5 -bottom-1 left-1.5 w-px' /> : null}
            <span aria-hidden='true' className='bg-primary/20 mt-1 flex size-3.5 shrink-0 items-center justify-center rounded-full'>
              <span className='bg-primary size-2 rounded-full' />
            </span>
            <div className='flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
              <div className='flex min-w-0 flex-col gap-0.5'>
                <span className='text-foreground text-sm break-words'>{item.description}</span>
                {item.detail ? (
                  <span className='text-muted-foreground text-xs break-words'>{item.detail}</span>
                ) : null}
              </div>
              <span
                className='text-muted-foreground shrink-0 text-xs whitespace-nowrap sm:pt-0.5'
                title={item.timestampTitle}
              >
                {item.timestamp}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
