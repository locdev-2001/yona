// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { Label } from '@admin/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@admin/components/ui/select'

// Util Imports
import { cn } from '@admin/lib/utils'

// Giá trị "tất cả" của ô chọn; trên URL là khoá vắng mặt.
export const ALL_VALUE = 'all'

export type FilterOption = { label: string; value: string }

export interface ListFiltersProps {
  children: ReactNode
  className?: string
}

export function ListFilters({ children, className }: ListFiltersProps) {
  return (
    <div className='flex flex-col gap-4 border-b p-6'>
      <div
        className={cn('grid grid-cols-1 gap-6 max-md:*:last:col-span-full sm:grid-cols-2 md:grid-cols-3', className)}
      >
        {children}
      </div>
    </div>
  )
}

export interface FilterSelectProps {
  id: string
  label: string
  allLabel: string
  options: FilterOption[]
  // Chuỗi rỗng = chưa lọc.
  value: string
  onChange: (value: string) => void
  // Nằm chung dải với ô tìm: nhãn chỉ cho trình đọc màn hình ("Mọi kênh" đã tự nói nghĩa).
  inline?: boolean
}

export function FilterSelect({ id, label, allLabel, options, value, onChange, inline = false }: FilterSelectProps) {
  const items = [{ label: allLabel, value: ALL_VALUE }, ...options]

  return (
    <div className={cn('flex w-full flex-col gap-2', inline && 'sm:w-44')}>
      <Label htmlFor={id} className={cn(inline && 'sr-only')}>
        {label}
      </Label>
      <Select
        items={items}
        value={value === '' ? ALL_VALUE : value}
        onValueChange={(next: string | null) => {
          if (next) {
            onChange(next === ALL_VALUE ? '' : next)
          }
        }}
      >
        <SelectTrigger id={id} className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
