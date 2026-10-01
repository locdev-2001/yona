// React Imports
import { Fragment } from 'react'
import type { ReactNode } from 'react'

// Third-party Imports
import type { ColumnDef } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'

// Component Imports
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@admin/components/ui/table'

// Util Imports
import { cn } from '@admin/lib/utils'

import '@admin/views/datatables/column-meta'

type DataTableFiltersProps<TData> = {
  data: TData[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[]
  getRowId: (row: TData) => string
  // Ô lọc phía trên bảng; lọc chạy ở máy chủ nên trang tự lo giá trị.
  filters?: ReactNode
  empty: ReactNode
  // Dòng mở rộng ngay dưới dòng đang mở (dữ liệu gửi kèm...).
  expandedRowId?: string | null
  renderExpanded?: (row: TData) => ReactNode
  className?: string
}

// Bảng kèm hàng ô lọc phía trên; dữ liệu đã lọc và phân trang sẵn từ máy chủ.
const DataTableFilters = <TData,>({
  data,
  columns,
  getRowId,
  filters,
  empty,
  expandedRowId = null,
  renderExpanded,
  className
}: DataTableFiltersProps<TData>) => {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true
  })

  return (
    <div className={cn('w-full', className)}>
      {filters ? <div className='flex flex-wrap gap-3 px-4 py-6'>{filters}</div> : null}
      <div className={cn(filters ? 'border-t' : '')}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className='bg-muted/50'>
                {headerGroup.headers.map(header => {
                  return (
                    <TableHead
                      key={header.id}
                      className={cn('relative h-10 select-none first:pl-4', header.column.columnDef.meta?.headerClassName)}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <Fragment key={row.id}>
                  <TableRow data-state={row.id === expandedRowId ? 'selected' : undefined}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id} className={cn('first:pl-4', cell.column.columnDef.meta?.cellClassName)}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {renderExpanded && row.id === expandedRowId ? (
                    <TableRow className='hover:bg-transparent'>
                      <TableCell colSpan={row.getVisibleCells().length} className='px-4 whitespace-normal'>
                        {renderExpanded(row.original)}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              ))
            ) : (
              <TableRow className='hover:bg-transparent'>
                <TableCell colSpan={columns.length} className='h-24 text-center whitespace-normal'>
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default DataTableFilters
