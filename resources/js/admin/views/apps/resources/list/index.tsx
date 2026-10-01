// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { Card } from '@admin/components/ui/card'
import PageHeader from '@admin/views/pages/page-header'

export interface ResourceListAppProps {
  title: string
  description: string
  // Nút tạo mới nằm ở đầu trang như mọi trang khác của console.
  actions?: ReactNode
  // Ô lọc đã nằm trong thanh công cụ; giữ chỗ cho trang cần dải lọc riêng.
  filters?: ReactNode
  toolbar: ReactNode
  table: ReactNode
  pagination: ReactNode
}

// Khung trang danh sách: tiêu đề, rồi một thẻ gồm bộ lọc, thanh công cụ, bảng và phân trang.
const ResourceListApp = ({ title, description, actions, filters, toolbar, table, pagination }: ResourceListAppProps) => {
  return (
    <div className='flex flex-col gap-4 lg:gap-6'>
      <PageHeader title={title} description={description} actions={actions} className='mb-0 md:mb-0' />

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
