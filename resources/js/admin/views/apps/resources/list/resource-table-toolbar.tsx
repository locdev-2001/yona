// React Imports
import type { FormEvent } from 'react'

// Third-party Imports
import { PlusIcon, SearchIcon, XIcon } from 'lucide-react'

// Component Imports
import Link from '@admin/components/Link'
import { buttonVariants } from '@admin/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@admin/components/ui/input-group'
import { Label } from '@admin/components/ui/label'

export interface ResourceTableToolbarProps {
  search: string
  searchLabel: string
  clearLabel: string
  canClear: boolean
  newRecord: { href: string; label: string } | null
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
  newRecord,
  onSearchChange,
  onSubmit,
  onClear
}: ResourceTableToolbarProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <div className='flex gap-4 p-6 max-sm:flex-col sm:items-center sm:justify-between'>
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

      {newRecord ? (
        <div className='flex flex-wrap items-center gap-2 sm:justify-between'>
          <Link href={newRecord.href} className={buttonVariants()}>
            <PlusIcon />
            <span>{newRecord.label}</span>
          </Link>
        </div>
      ) : null}
    </div>
  )
}
