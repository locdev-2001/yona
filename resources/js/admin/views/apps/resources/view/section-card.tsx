// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@admin/components/ui/card'

// Util Imports
import { cn } from '@admin/lib/utils'

export interface SectionCardProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
  id?: string
}

// Thẻ có tiêu đề, mô tả và nút phụ bên phải — như các thẻ trong tab của trang chi tiết người dùng.
export function SectionCard({ title, description, action, children, className, id }: SectionCardProps) {
  return (
    <Card className={className}>
      <CardHeader className='flex flex-row items-center justify-between gap-4'>
        <div className='min-w-0'>
          <CardTitle className='text-base' id={id}>
            {title}
          </CardTitle>
          {description ? <CardDescription className='mt-1'>{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      {children ? <CardContent className='space-y-4'>{children}</CardContent> : null}
    </Card>
  )
}

export interface TableCardProps {
  title: ReactNode
  action?: ReactNode
  children: ReactNode
  footer?: ReactNode
  id?: string
}

// Thẻ chứa bảng: tiêu đề + công cụ ở trên, bảng tràn sát mép thẻ.
export function TableCard({ title, action, children, footer, id }: TableCardProps) {
  return (
    <Card className='py-0'>
      <div className='w-full'>
        <div className={cn(footer && 'border-b')}>
          <div className='flex min-h-17 flex-wrap items-center justify-between gap-3 px-4 py-3'>
            <span className='text-lg font-medium' id={id}>
              {title}
            </span>
            {action ? <div className='flex flex-wrap items-center gap-2'>{action}</div> : null}
          </div>
          {children}
        </div>
        {footer}
      </div>
    </Card>
  )
}
