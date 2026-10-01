// React Imports
import type { MouseEvent, ReactNode } from 'react'

// Third-party Imports
import type { Table } from '@tanstack/react-table'
import { flexRender } from '@tanstack/react-table'

// Util Imports
import { cn } from '@admin/lib/utils'

type MobileRowsProps<TData> = {
  table: Table<TData>
  label?: string
  // Bấm vào thẻ mở bản ghi (bảng tài nguyên); bỏ qua khi bấm trúng link, nút.
  onOpenRow?: (event: MouseEvent<HTMLElement>, url: string | null) => void
  urlOf?: (row: TData) => string | null
  // Dòng mở rộng ngay dưới thẻ đang mở.
  expandedRowId?: string | null
  renderExpanded?: (row: TData) => ReactNode
}

// Dưới 768px bảng nhiều cột bị xén ngang; mỗi dòng thành một thẻ: ô đầu là tiêu
// đề, các ô còn lại là cặp nhãn - giá trị, cột thao tác ở cuối thẻ.
export function MobileRows<TData>({
  table,
  label,
  onOpenRow,
  urlOf,
  expandedRowId = null,
  renderExpanded
}: MobileRowsProps<TData>) {
  const rows = table.getRowModel().rows
  const headerOf = (columnId: string) => {
    const header = table.getFlatHeaders().find(candidate => candidate.column.id === columnId)

    return header && !header.isPlaceholder ? flexRender(header.column.columnDef.header, header.getContext()) : null
  }

  if (rows.length === 0) return null

  return (
    <ul aria-label={label} className='divide-y border-t md:hidden'>
      {rows.map(row => {
        const [first, ...rest] = row.getVisibleCells()
        const actions = rest.filter(
          cell => cell.column.columnDef.meta?.mobileRole === 'actions' || cell.column.id === 'actions'
        )
        const fields = rest.filter(cell => !actions.includes(cell))
        const url = urlOf ? urlOf(row.original) : null

        return (
          <li
            key={row.id}
            className={cn('flex flex-col gap-3 px-4 py-4', url && 'cursor-pointer')}
            onClick={onOpenRow ? event => onOpenRow(event, url) : undefined}
          >
            <div className='flex min-w-0 items-start justify-between gap-2'>
              <div className='min-w-0 flex-1'>{flexRender(first.column.columnDef.cell, first.getContext())}</div>
              {actions.map(cell => (
                <div key={cell.id} className='shrink-0'>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ))}
            </div>
            {fields.length > 0 ? (
              <dl className='grid grid-cols-2 gap-x-4 gap-y-2 text-sm'>
                {fields.map(cell => (
                  <div key={cell.id} className='flex min-w-0 flex-col gap-0.5'>
                    <dt className='text-muted-foreground text-xs'>{headerOf(cell.column.id)}</dt>
                    <dd className='min-w-0 break-words *:text-left'>{flexRender(cell.column.columnDef.cell, cell.getContext())}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {renderExpanded && row.id === expandedRowId ? <div>{renderExpanded(row.original)}</div> : null}
          </li>
        )
      })}
    </ul>
  )
}
