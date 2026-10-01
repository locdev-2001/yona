// React Imports
import type { FormEvent, ReactNode } from 'react'

// Component Imports
import { Card, CardContent } from '@admin/components/ui/card'
import { FieldGroup } from '@admin/components/ui/field'

export interface RecordFormProps {
  title: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
  actions: ReactNode
}

// Trang thêm/sửa: tiêu đề, một thẻ chứa lưới trường hai cột, nút ở cuối.
export function RecordForm({ title, onSubmit, children, actions }: RecordFormProps) {
  return (
    <div className='flex flex-col gap-6'>
      <div className='space-y-3'>
        <h1 className='text-lg font-semibold'>{title}</h1>
        <Card>
          <CardContent>
            <form noValidate onSubmit={onSubmit}>
              <FieldGroup className='grid grid-cols-1 gap-6 sm:grid-cols-2'>{children}</FieldGroup>

              <div className='mt-8 flex flex-col-reverse gap-4 sm:flex-row'>{actions}</div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
