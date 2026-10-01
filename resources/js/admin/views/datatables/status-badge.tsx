// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { Badge } from '@admin/components/ui/badge'

// Util Imports
import { cn } from '@admin/lib/utils'

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral'

// Nền tint + chữ đậm màu cùng họ trạng thái (tokens.md): mọi cặp ≥4.5:1, chữ trong nhãn nói rõ trạng thái.
const STATUS_STYLES: Record<StatusTone, string> = {
  success: 'bg-success-tint text-success [a&]:hover:bg-success-tint/70',
  warning: 'bg-warning-tint text-warning [a&]:hover:bg-warning-tint/70',
  danger: 'bg-danger-tint text-danger [a&]:hover:bg-danger-tint/70',
  neutral: 'bg-neutral-100 text-neutral-700'
}

// Chấm cùng màu trước chữ: thêm một dấu hình cho trạng thái, chữ vẫn là nguồn nghĩa chính.
const STATUS_DOT: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-neutral-500'
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
      className={cn('h-auto gap-1.5 rounded-sm border-none focus-visible:outline-none', STATUS_STYLES[tone], className)}
    >
      <span aria-hidden='true' className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOT[tone])} />
      {children}
    </Badge>
  )
}

export default StatusBadge
