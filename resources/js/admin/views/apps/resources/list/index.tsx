// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { Card } from '@admin/components/ui/card'

export interface ResourceListAppProps {
  title: string
  description: string
  filters: ReactNode
  toolbar: ReactNode
  table: ReactNode
  pagination: ReactNode
}

// Khung trang danh sách: tiêu đề, rồi một thẻ gồm bộ lọc, thanh công cụ, bảng và phân trang.
const ResourceListApp = ({ title, description, filters, toolbar, table, pagination }: ResourceListAppProps) => {
  return (
    <div className='flex flex-col gap-3 lg:gap-6'>
      <div>
        <h1 className='text-xl font-bold'>{title}</h1>
        <p className='text-muted-foreground'>{description}</p>
      </div>

      <Card className='py-0 shadow-none'>
        <div className='w-full'>
          <div className='border-b'>
            {filters}
            {toolbar}
            {table}
          </div>

          {pagination}
        </div>
      </Card>
    </div>
  )
}

export default ResourceListApp
