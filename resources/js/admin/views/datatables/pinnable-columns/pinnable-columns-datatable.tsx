// React Imports
import type { CSSProperties, ReactNode } from 'react'
import { useState } from 'react'

// Third-party Imports
import type { Column, ColumnDef, ColumnPinningState } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'

import { ArrowLeftFromLineIcon, ArrowRightFromLineIcon, EllipsisIcon, PinOffIcon } from 'lucide-react'

// Component Imports
import { Button } from '@admin/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@admin/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@admin/components/ui/table'

// Util Imports
import { cn } from '@admin/lib/utils'

import '@admin/views/datatables/column-meta'

export type PinLabels = {
  stickLeft: string
  stickRight: string
  unpin: (column: string) => string
  options: (column: string) => string
}

const getPinningStyles = <TData,>(column: Column<TData>): CSSProperties => {
  const isPinned = column.getIsPinned()

  return {
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    position: isPinned ? 'sticky' : 'relative',
    zIndex: isPinned ? 1 : 0
  }
}

type DataTablePinnableColumnsProps<TData> = {
  data: TData[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[]
  getRowId: (row: TData, index: number) => string
  initialPinning?: ColumnPinningState
  labels: PinLabels
  empty: ReactNode
  className?: string
}

// Bảng nhiều cột: ghim cột sang trái/phải, ô giữ một dòng. Sắp xếp và phân trang ở máy chủ.
const DataTablePinnableColumns = <TData,>({
  data,
  columns,
  getRowId,
  initialPinning = {},
  labels,
  empty,
  className
}: DataTablePinnableColumnsProps<TData>) => {
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(initialPinning)

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    onColumnPinningChange: setColumnPinning,
    state: {
      columnPinning
    },
    manualSorting: true,
    manualPagination: true
  })

  return (
    <div className='w-full'>
      <div className='rounded-md'>
        <Table
          className={cn(
            '[&_td]:border-border [&_th]:border-border border-separate border-spacing-0 [&_tfoot_td]:border-t [&_th]:border-b [&_tr]:border-none [&_tr:not(:last-child)_td]:border-b',
            className
          )}
        >
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const { column } = header
                  const isPinned = column.getIsPinned()
                  const isLastLeftPinned = isPinned === 'left' && column.getIsLastColumn('left')
                  const isFirstRightPinned = isPinned === 'right' && column.getIsFirstColumn('right')
                  const columnName = column.id

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'data-pinned:bg-muted/90 relative h-10 truncate data-pinned:backdrop-blur-xs [&:not([data-pinned]):has(+[data-pinned])_div.cursor-col-resize:last-child]:opacity-0 [&[data-last-col=left]_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=right]:last-child_div.cursor-col-resize:last-child]:opacity-0',
                        column.columnDef.meta?.headerClassName
                      )}
                      colSpan={header.colSpan}
                      style={{ ...getPinningStyles(column) }}
                      data-pinned={isPinned || undefined}
                      data-last-col={isLastLeftPinned ? 'left' : isFirstRightPinned ? 'right' : undefined}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <span className='truncate'>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </span>

                        {!header.isPlaceholder &&
                          header.column.getCanPin() &&
                          (header.column.getIsPinned() ? (
                            <Button
                              size='icon'
                              variant='ghost'
                              className='-mr-1 size-7'
                              onClick={() => header.column.pin(false)}
                              aria-label={labels.unpin(columnName)}
                              title={labels.unpin(columnName)}
                            >
                              <PinOffIcon className='opacity-60' aria-hidden='true' />
                            </Button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    size='icon'
                                    variant='ghost'
                                    className='-mr-1 size-7'
                                    aria-label={labels.options(columnName)}
                                    title={labels.options(columnName)}
                                  >
                                    <EllipsisIcon className='opacity-60' aria-hidden='true' />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align='end' className='w-40'>
                                <DropdownMenuItem onClick={() => header.column.pin('left')}>
                                  <ArrowLeftFromLineIcon size={16} className='opacity-60' aria-hidden='true' />
                                  {labels.stickLeft}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => header.column.pin('right')}>
                                  <ArrowRightFromLineIcon size={16} className='opacity-60' aria-hidden='true' />
                                  {labels.stickRight}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ))}
                      </div>
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => {
                    const { column } = cell
                    const isPinned = column.getIsPinned()
                    const isLastLeftPinned = isPinned === 'left' && column.getIsLastColumn('left')
                    const isFirstRightPinned = isPinned === 'right' && column.getIsFirstColumn('right')

                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'data-pinned:bg-background/90 truncate data-pinned:backdrop-blur-xs',
                          column.columnDef.meta?.cellClassName
                        )}
                        style={{ ...getPinningStyles(column) }}
                        data-pinned={isPinned || undefined}
                        data-last-col={isLastLeftPinned ? 'left' : isFirstRightPinned ? 'right' : undefined}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
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

export default DataTablePinnableColumns
