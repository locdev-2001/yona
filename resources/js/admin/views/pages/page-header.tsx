// React Imports
import type { ReactNode } from 'react'

// Util Imports
import { cn } from '@admin/lib/utils'
import '../../../superadmin/resource/resources.css'

type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  // Nút thao tác bên phải tiêu đề.
  actions?: ReactNode
  // Dòng nhỏ phía trên tiêu đề (link quay lại...).
  eyebrow?: ReactNode
  className?: string
}

// Tiêu đề trang của console, cùng khuôn với đầu trang Cài đặt người dùng.
const PageHeader = ({ title, description, actions, eyebrow, className }: PageHeaderProps) => {
  return (
    <div className={cn('console-page-header mb-4 flex flex-col gap-4 md:mb-6 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className='min-w-0'>
        {eyebrow}
        <h1 className='text-xl font-medium break-words'>{title}</h1>
        {description ? <p className='text-muted-foreground'>{description}</p> : null}
      </div>
      {actions ? <div className='flex shrink-0 flex-wrap items-center gap-2'>{actions}</div> : null}
    </div>
  )
}

export default PageHeader
