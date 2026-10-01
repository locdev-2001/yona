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

export interface ListTableProps<TData> {
  data: TData[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[]
  getRowId: (row: TData) => string
  empty: ReactNode
  // Dòng mở rộng ngay dưới dòng đang mở.
  expandedRowId?: string | null
  renderExpanded?: (row: TData) => ReactNode
}

// Bảng của trang danh sách: lọc, sắp xếp và phân trang đều chạy ở máy chủ.
export function ListTable<TData>({
  data,
  columns,
  getRowId,
  empty,
  expandedRowId = null,
  renderExpanded
}: ListTableProps<TData>) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    enableRowSelection: false
  })

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id} className='h-14 border-t'>
            {headerGroup.headers.map(header => (
              <TableHead
                key={header.id}
                className={cn(
                  'text-muted-foreground first:pl-4 last:px-4',
                  header.column.columnDef.meta?.headerClassName
                )}
              >
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map(row => (
            <Fragment key={row.id}>
              <TableRow data-state={row.id === expandedRowId ? 'selected' : undefined}>
                {row.getVisibleCells().map(cell => (
                  <TableCell
                    key={cell.id}
                    className={cn('h-14 first:pl-4 last:px-4', cell.column.columnDef.meta?.cellClassName)}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
              {renderExpanded && row.id === expandedRowId ? (
                <TableRow className='hover:bg-transparent'>
                  <TableCell colSpan={row.getVisibleCells().length} className='px-4 py-3 whitespace-normal'>
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
  )
}
