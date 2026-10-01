// React Imports
import type { FormEvent, ReactNode } from 'react'

// Third-party Imports
import { SearchIcon } from 'lucide-react'

// Component Imports
import { InputGroup, InputGroupAddon, InputGroupInput } from '@admin/components/ui/input-group'
import { Label } from '@admin/components/ui/label'

export interface ListToolbarSearch {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  // Có thì ô tìm là form: Enter mới gửi lên máy chủ.
  onSubmit?: () => void
}

export interface ListToolbarProps {
  search?: ListToolbarSearch
  // Ô lọc nằm cùng dải, ngay sau ô tìm: một dải lọc duy nhất trên bảng.
  filters?: ReactNode
  children?: ReactNode
}

export function ListToolbar({ search, filters, children }: ListToolbarProps) {
  const input = search ? (
    <>
      <Label htmlFor={search.id} className='sr-only'>
        {search.label}
      </Label>
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          id={search.id}
          value={search.value}
          onChange={event => search.onChange(event.target.value)}
          placeholder={search.placeholder}
          type='search'
        />
      </InputGroup>
    </>
  ) : null

  return (
    <div className='flex gap-3 p-4 max-sm:flex-col sm:items-start sm:justify-between md:px-6'>
      <div className='flex min-w-0 flex-1 flex-wrap gap-3 max-sm:flex-col sm:items-center'>
        {search?.onSubmit ? (
          <form
            role='search'
            className='w-full sm:max-w-60'
            onSubmit={(event: FormEvent) => {
              event.preventDefault()
              search.onSubmit?.()
            }}
          >
            {input}
          </form>
        ) : (
          <div className='w-full sm:max-w-60'>{input}</div>
        )}
        {filters}
      </div>

      {children ? <div className='flex shrink-0 flex-wrap items-center gap-2'>{children}</div> : null}
    </div>
  )
}
