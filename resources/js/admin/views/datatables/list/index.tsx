// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { Card } from '@admin/components/ui/card'

export interface ListCardProps {
  filters?: ReactNode
  toolbar?: ReactNode
  table: ReactNode
  pagination?: ReactNode
}

// Khung trang danh sách: ô lọc, thanh công cụ, bảng, phân trang trong một thẻ.
const ListCard = ({ filters, toolbar, table, pagination }: ListCardProps) => {
  return (
    <Card className='py-0 shadow-none'>
      <div className='w-full'>
        <div className={pagination ? 'border-b' : undefined}>
          {filters}
          {toolbar}
          {table}
        </div>

        {pagination}
      </div>
    </Card>
  )
}

export default ListCard
