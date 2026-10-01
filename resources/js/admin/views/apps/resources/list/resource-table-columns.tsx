// Third-party Imports
import type { ColumnDef } from '@tanstack/react-table'
import { EllipsisVerticalIcon, EyeIcon, LayoutDashboardIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { router } from '@inertiajs/react'

// React Imports
import type { ReactNode } from 'react'

// Component Imports
import Link from '@admin/components/Link'
import { Button } from '@admin/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@admin/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@admin/components/ui/tooltip'

// Util Imports
import { cn } from '@admin/lib/utils'

// Ô đầu tiên là liên kết tới bản ghi, trừ khi ô đó tự là liên kết (quan hệ, token).
const LINKED_CELL_TYPES = ['belongs_to', 'belongs_to_search', 'polymorphic', 'secret_field']

export type ResourceCell = { name: string; type: string; html_class: string; value: unknown }
export type ResourceColumn = { name: string; label: string; html_class: string }
export type ResourceRow = { url: string | null; cells: ResourceCell[] }

export type ResourceRowActionLabels = {
  view: string
  edit: string
  delete: string
  actions: string
  overview: string
}

export type ResourceColumnsOptions = {
  columns: ResourceColumn[]
  columnLabel: (column: ResourceColumn) => string
  canEdit: boolean
  canDestroy: boolean
  withOverview: boolean
  labels: ResourceRowActionLabels
  onDelete: (url: string) => void
  renderCell: (cell: ResourceCell) => ReactNode
}

function ResourceRowActions({
  row,
  canEdit,
  canDestroy,
  withOverview,
  labels,
  onDelete
}: Omit<ResourceColumnsOptions, 'columns' | 'columnLabel' | 'renderCell'> & { row: ResourceRow }) {
  const url = row.url

  if (!url) {
    return null
  }

  return (
    <div className='flex items-center justify-end gap-1'>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant='ghost' size='icon' aria-label={labels.view} render={<Link href={url} />} nativeButton={false} />
          }
        >
          <EyeIcon className='size-4.5' />
        </TooltipTrigger>
        <TooltipContent>
          <p>{labels.view}</p>
        </TooltipContent>
      </Tooltip>

      {canDestroy ? (
        <Tooltip>
          <TooltipTrigger
            render={<Button variant='ghost' size='icon' aria-label={labels.delete} onClick={() => onDelete(url)} />}
          >
            <Trash2Icon className='size-4.5' />
          </TooltipTrigger>
          <TooltipContent>
            <p>{labels.delete}</p>
          </TooltipContent>
        </Tooltip>
      ) : null}

      {canEdit || withOverview ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size='icon' variant='ghost' aria-label={labels.actions} />}>
            <EllipsisVerticalIcon className='size-4.5' aria-hidden='true' />
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuGroup>
              {withOverview ? (
                <DropdownMenuItem onClick={() => router.visit(`${url}/overview`)}>
                  <LayoutDashboardIcon className='size-4' />
                  {labels.overview}
                </DropdownMenuItem>
              ) : null}
              {canEdit ? (
                <DropdownMenuItem onClick={() => router.visit(`${url}/edit`)}>
                  <PencilIcon className='size-4' />
                  {labels.edit}
                </DropdownMenuItem>
              ) : null}
              {canDestroy ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant='destructive' onClick={() => onDelete(url)}>
                    <Trash2Icon className='size-4' />
                    {labels.delete}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}

export function buildResourceColumns(options: ResourceColumnsOptions): ColumnDef<ResourceRow>[] {
  const { columns, columnLabel, canEdit, canDestroy, withOverview, renderCell } = options

  const dataColumns: ColumnDef<ResourceRow>[] = columns.map((column, columnIndex) => ({
    id: column.name,
    header: columnLabel(column),
    accessorFn: row => row.cells.find(cell => cell.name === column.name)?.value,
    cell: ({ row }) => {
      const cell = row.original.cells.find(item => item.name === column.name)

      if (!cell) {
        return null
      }

      const url = row.original.url

      return (
        <div className={cn('max-w-xs', cell.name === 'name' && 'min-w-44', column.html_class === 'number' && 'text-right')}>
          {columnIndex === 0 && url && !LINKED_CELL_TYPES.includes(cell.type) ? (
            <Link href={url} className='font-medium hover:underline'>
              {renderCell(cell)}
            </Link>
          ) : (
            renderCell(cell)
          )}
        </div>
      )
    },
    meta: { numeric: column.html_class === 'number' },
    enableSorting: true
  }))

  if (!canEdit && !canDestroy && !withOverview) {
    return dataColumns
  }

  return [
    ...dataColumns,
    {
      id: 'actions',
      header: () => <span className='sr-only'>{options.labels.actions}</span>,
      cell: ({ row }) => <ResourceRowActions row={row.original} {...options} />,
      enableHiding: false,
      enableSorting: false
    }
  ]
}
