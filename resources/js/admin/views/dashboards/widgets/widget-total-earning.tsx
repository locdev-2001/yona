// Type Imports
import type { ReactNode } from 'react'

// Component Imports
import { Avatar, AvatarFallback } from '@admin/components/ui/avatar'
import { Progress } from '@admin/components/ui/progress'

// Util Imports
import { cn } from '@admin/lib/utils'
import { TONE_CHIP, TONE_PROGRESS, type Tone } from '@admin/views/dashboards/tones'

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
  // Lớp của ô avatar; bỏ trống thì nền trung tính.
  avatarClassName?: string
  // Màu thanh tỉ lệ theo nghĩa của số (MEANING_TONE).
  progressTone?: Tone
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
            <AvatarFallback className={cn('shrink-0', item.avatarClassName ?? TONE_CHIP.neutral)}>{item.icon}</AvatarFallback>
          </Avatar>
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <div className='flex min-w-0 items-baseline justify-between gap-3'>
              <span className='min-w-0 truncate text-sm font-medium'>{item.title}</span>
              <span className='font-num shrink-0 text-sm text-neutral-700'>{item.value}</span>
            </div>
            {item.progressPercentage !== undefined ? (
              <Progress
                value={item.progressPercentage}
                aria-label={item.label}
                className={cn('w-full **:data-[slot=progress-track]:h-1.5', TONE_PROGRESS[item.progressTone ?? 'primary'])}
              />
            ) : null}
            {item.subtitle ? <span className='truncate text-sm text-neutral-500'>{item.subtitle}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default TotalEarningList
