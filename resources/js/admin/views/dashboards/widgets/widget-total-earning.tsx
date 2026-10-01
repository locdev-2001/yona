// Type Imports
import type { ReactNode } from 'react'

// Component Imports
import { Avatar, AvatarFallback } from '@admin/components/ui/avatar'
import { Progress } from '@admin/components/ui/progress'

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
  // Số tổng ở đầu ô kèm dòng chú thích; bỏ trống thì chỉ còn danh sách.
  total?: { value: string; caption?: string }
  items: TotalEarningItem[]
  className?: string
}

// Danh sách xếp hạng: ô vuông biểu tượng, tên + dòng phụ, số và thanh tỉ lệ.
const TotalEarningList = ({ total, items, className }: Props) => {
  return (
    <div className={className ?? 'flex flex-col gap-6'}>
      {total ? (
        <div className='flex flex-col gap-1'>
          <span className='text-2xl font-semibold tabular-nums'>{total.value}</span>
          {total.caption ? <span className='text-muted-foreground text-sm'>{total.caption}</span> : null}
        </div>
      ) : null}
      <ul className='flex flex-1 flex-col justify-evenly gap-4'>
        {items.map(item => (
          <li key={item.key} className='flex items-center justify-between gap-2.5'>
            <div className='flex min-w-0 items-center gap-2.5'>
              <Avatar className='size-9 rounded-sm after:rounded-[inherit] after:border-0'>
                <AvatarFallback className='bg-primary/10 text-primary shrink-0 rounded-sm'>{item.icon}</AvatarFallback>
              </Avatar>
              <div className='flex min-w-0 flex-col gap-1'>
                <span className='truncate text-base font-medium'>{item.title}</span>
                {item.subtitle ? <span className='text-muted-foreground truncate text-sm'>{item.subtitle}</span> : null}
              </div>
            </div>
            <div className='shrink-0 space-y-2 text-right'>
              <p className='text-sm tabular-nums'>{item.value}</p>
              {item.progressPercentage !== undefined ? (
                <Progress
                  value={item.progressPercentage}
                  aria-label={item.label}
                  className='w-24 **:data-[slot=progress-track]:h-1.5 sm:w-36'
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TotalEarningList
