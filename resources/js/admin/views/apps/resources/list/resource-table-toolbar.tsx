// React Imports
import type { FormEvent, ReactNode } from 'react'

// Third-party Imports
import { SearchIcon, XIcon } from 'lucide-react'

// Component Imports
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@admin/components/ui/input-group'
import { Label } from '@admin/components/ui/label'

export interface ResourceTableToolbarProps {
  search: string
  searchLabel: string
  clearLabel: string
  canClear: boolean
  // Ô lọc nằm cùng dải với ô tìm.
  filters?: ReactNode
  onSearchChange: (search: string) => void
  onSubmit: () => void
  onClear: () => void
}

// Tìm kiếm gửi lên máy chủ khi nhấn Enter, giữ nguyên sắp xếp đang xem.
export function ResourceTableToolbar({
  search,
  searchLabel,
  clearLabel,
  canClear,
  filters,
  onSearchChange,
  onSubmit,
  onClear
}: ResourceTableToolbarProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <div className='flex gap-3 px-6 py-4 max-sm:flex-col sm:items-center sm:justify-between'>
      <div className='flex min-w-0 flex-1 gap-3 max-sm:flex-col sm:items-center'>
        <form role='search' onSubmit={submit} className='w-full sm:max-w-xs'>
          <Label htmlFor='search-records' className='sr-only'>
            {searchLabel}
          </Label>
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              id='search-records'
              name='search'
              type='search'
              value={search}
              onChange={event => onSearchChange(event.target.value)}
              placeholder={searchLabel}
            />
            {canClear ? (
              <InputGroupAddon align='inline-end'>
                <InputGroupButton size='icon-xs' aria-label={clearLabel} onClick={onClear}>
                  <XIcon />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
        </form>
        {filters}
      </div>
    </div>
  )
}
