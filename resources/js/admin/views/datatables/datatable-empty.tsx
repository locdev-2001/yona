// Type Imports
import type { ReactNode } from 'react'

type DataTableEmptyProps = {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
}

// Nội dung ô "không có dòng nào" của bảng.
const DataTableEmpty = ({ icon, title, description }: DataTableEmptyProps) => {
  return (
    <div className='flex flex-col items-center gap-1 py-6'>
      {icon ? (
        <div className='bg-(--tone)/15 text-(--tone) mb-2 flex size-8 shrink-0 items-center justify-center rounded-sm'>
          {icon}
        </div>
      ) : null}
      <p className='font-medium'>{title}</p>
      {description ? <p className='text-muted-foreground text-sm'>{description}</p> : null}
    </div>
  )
}

export default DataTableEmpty
