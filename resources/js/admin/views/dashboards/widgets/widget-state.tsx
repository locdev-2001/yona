// Third-party Imports
import { ChartNoAxesColumnIcon, CircleAlertIcon } from '@admin/components/icons'

// Component Imports
import { Alert, AlertAction, AlertTitle } from '@admin/components/ui/alert'
import { Button } from '@admin/components/ui/button'
import { Skeleton } from '@admin/components/ui/skeleton'

export type WidgetSkeletonKind = 'stats' | 'chart' | 'list'

// Khung xương lúc ô chưa có số, theo hình của nội dung sắp hiện.
export const WidgetSkeleton = ({ kind }: { kind: WidgetSkeletonKind }) => {
  if (kind === 'stats') {
    return (
      <div className='grid grid-cols-2 gap-4 @lg:gap-6 @3xl:grid-cols-4'>
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className='h-32 rounded-xl' />
        ))}
      </div>
    )
  }

  if (kind === 'chart') {
    return <Skeleton className='h-60 w-full' />
  }

  return (
    <div className='flex flex-col gap-4'>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className='flex items-center gap-2.5'>
          <Skeleton className='size-9 shrink-0 rounded-sm' />
          <div className='flex flex-1 flex-col gap-1.5'>
            <Skeleton className='h-4' style={{ width: `${85 - index * 12}%` }} />
            <Skeleton className='h-3 w-1/3' />
          </div>
        </div>
      ))}
    </div>
  )
}

// Ô không có dữ liệu trong khoảng đang xem.
export const WidgetEmpty = ({ title }: { title: string }) => {
  return (
    <div className='text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center'>
      <ChartNoAxesColumnIcon className='text-muted-foreground/40 size-9' aria-hidden='true' />
      <p className='text-foreground text-sm font-medium'>{title}</p>
    </div>
  )
}

// Ô tải lỗi; có số cũ thì vẫn hiện số cũ bên dưới, không có thì kèm nút thử lại.
export const WidgetError = ({
  title,
  retryLabel,
  onRetry
}: {
  title: string
  retryLabel?: string
  onRetry?: () => void
}) => {
  return (
    <Alert variant='destructive'>
      <CircleAlertIcon aria-hidden='true' />
      <AlertTitle>{title}</AlertTitle>
      {onRetry && retryLabel ? (
        <AlertAction>
          <Button variant='outline' size='xs' onClick={onRetry}>
            {retryLabel}
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  )
}
