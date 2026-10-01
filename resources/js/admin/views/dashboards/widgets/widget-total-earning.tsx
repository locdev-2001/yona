// Type Imports
import type { ReactNode } from 'react'

// Component Imports
import { Avatar, AvatarFallback } from '@admin/components/ui/avatar'
import { Progress } from '@admin/components/ui/progress'

// Util Imports
import { cn } from '@admin/lib/utils'

export type TotalEarningItem = {
  key: string
  // Tên đọc được của dòng, dùng làm nhãn cho thanh tiến độ.
  label: string
  title: ReactNode
  subtitle?: ReactNode
  icon: ReactNode
  value: ReactNode
  // 0–100; bỏ trống thì dòng không có thanh tiến độ.
  progressPercentage?: number
}

type Props = {
  items: TotalEarningItem[]
  className?: string
}

// Danh sách xếp hạng: avatar, tên + số cùng một hàng, dòng phụ hoặc thanh tỉ lệ ngay dưới tên.
// Mọi dòng cao bằng nhau ở mọi bề rộng, số không bao giờ rơi xuống dòng riêng.
const TotalEarningList = ({ items, className }: Props) => {
  return (
    <ul className={cn('flex flex-col gap-4', className)}>
      {items.map(item => (
        <li key={item.key} className='flex items-center gap-3'>
          <Avatar className='size-9 after:border-0'>
            <AvatarFallback className='bg-(--tone)/15 text-(--tone) shrink-0'>{item.icon}</AvatarFallback>
          </Avatar>
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <div className='flex min-w-0 items-baseline justify-between gap-3'>
              <span className='min-w-0 truncate text-sm font-medium'>{item.title}</span>
              <span className='text-muted-foreground shrink-0 text-sm tabular-nums'>{item.value}</span>
            </div>
            {item.progressPercentage !== undefined ? (
              <Progress
                value={item.progressPercentage}
                aria-label={item.label}
                className='w-full **:data-[slot=progress-track]:h-1.5'
              />
            ) : null}
            {item.subtitle ? <span className='text-muted-foreground truncate text-sm'>{item.subtitle}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default TotalEarningList
