// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { Badge } from '@admin/components/ui/badge'

// Util Imports
import { cn } from '@admin/lib/utils'

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral'

const STATUS_STYLES: Record<StatusTone, string> = {
  success:
    'bg-green-600/10 text-green-600 focus-visible:ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:focus-visible:ring-green-400/40 [a&]:hover:bg-green-600/5 dark:[a&]:hover:bg-green-400/5',
  warning:
    'bg-amber-600/10 text-amber-600 focus-visible:ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-400 dark:focus-visible:ring-amber-400/40 [a&]:hover:bg-amber-600/5 dark:[a&]:hover:bg-amber-400/5',
  danger:
    'bg-destructive/10 [a&]:hover:bg-destructive/5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive',
  neutral: 'bg-muted text-muted-foreground'
}

type StatusBadgeProps = {
  tone: StatusTone
  children: ReactNode
  className?: string
}

// Nhãn trạng thái trong ô bảng (khoẻ / cảnh báo / lỗi).
const StatusBadge = ({ tone, children, className }: StatusBadgeProps) => {
  return (
    <Badge
      className={cn('h-auto rounded-sm border-none focus-visible:outline-none', STATUS_STYLES[tone], className)}
    >
      {children}
    </Badge>
  )
}

export default StatusBadge
