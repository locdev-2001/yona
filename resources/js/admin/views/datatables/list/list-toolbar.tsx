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
  children?: ReactNode
}

export function ListToolbar({ search, children }: ListToolbarProps) {
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
    <div className='flex gap-4 p-6 max-sm:flex-col sm:items-center sm:justify-between'>
      {search?.onSubmit ? (
        <form
          role='search'
          className='w-full sm:max-w-2xs'
          onSubmit={(event: FormEvent) => {
            event.preventDefault()
            search.onSubmit?.()
          }}
        >
          {input}
        </form>
      ) : (
        <div className='w-full sm:max-w-2xs'>{input}</div>
      )}

      {children ? <div className='flex flex-wrap items-center gap-2 sm:justify-between'>{children}</div> : null}
    </div>
  )
}
