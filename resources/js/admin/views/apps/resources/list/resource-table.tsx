// React Imports
import type { MouseEvent } from 'react'

// Third-party Imports
import type { ColumnDef } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

// Component Imports
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@admin/components/ui/table'

// Util Imports
import { cn } from '@admin/lib/utils'

import '@admin/views/datatables/column-meta'
import { MobileRows } from '@admin/views/datatables/list/mobile-rows'

import type { ResourceRow } from './resource-table-columns'

export type ResourceSorting = { id: string; desc: boolean }

export interface ResourceTableProps {
  label: string
  rows: ResourceRow[]
  columns: ColumnDef<ResourceRow>[]
  totalPages: number
  sorting: ResourceSorting | null
  sortTitle: (header: string) => string
  onSort: (columnId: string) => void
  onOpenRow: (url: string) => void
}

// Sắp xếp, lọc, phân trang đều do máy chủ làm; bảng chỉ vẽ trang hiện tại.
export function ResourceTable({
  label,
  rows,
  columns,
  totalPages,
  sorting,
  sortTitle,
  onSort,
  onOpenRow
}: ResourceTableProps) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    pageCount: totalPages,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, index) => row.url ?? String(index),
    enableRowSelection: false,
    enableSortingRemoval: false,
    state: {
      sorting: sorting ? [sorting] : []
    }
  })

  const openRow = (event: MouseEvent<HTMLElement>, url: string | null) => {
    if (!url || (event.target as HTMLElement).closest('a, button, input, select, textarea, [role="menuitem"]')) {
      return
    }

    onOpenRow(url)
  }

  return (
    <>
      <MobileRows table={table} label={label} onOpenRow={openRow} urlOf={row => row.url} />
      <Table aria-label={label} className='max-md:hidden'>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id} className='h-14 border-t'>
              {headerGroup.headers.map(header => {
                const sorted = header.column.getIsSorted()
                const numeric = header.column.columnDef.meta?.numeric
                const headerLabel =
                  typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : ''

                return (
                  <TableHead
                    key={header.id}
                    scope='col'
                    aria-sort={
                      header.column.getCanSort()
                        ? sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : 'none'
                        : undefined
                    }
                    className={cn(
                      'text-muted-foreground first:pl-4 last:px-4',
                      (header.column.id === 'actions' || numeric) && 'text-right'
                    )}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <div
                        role='button'
                        title={sortTitle(headerLabel)}
                        className={cn(
                          'flex h-full cursor-pointer items-center gap-2 select-none',
                          numeric ? 'justify-end' : 'justify-between'
                        )}
                        onClick={() => onSort(header.column.id)}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onSort(header.column.id)
                          }
                        }}
                        tabIndex={0}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ChevronUpIcon className='size-4 shrink-0 opacity-60' aria-hidden='true' />,
                          desc: <ChevronDownIcon className='size-4 shrink-0 opacity-60' aria-hidden='true' />
                        }[sorted as string] ?? null}
                      </div>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow
              key={row.id}
              className={cn(row.original.url && 'cursor-pointer')}
              onClick={event => openRow(event, row.original.url)}
            >
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id} className='h-14 first:pl-4 last:px-4'>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
