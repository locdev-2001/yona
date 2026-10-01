// React Imports
import type { ReactNode } from 'react'

// Third-party Imports
import type { ColumnDef } from '@tanstack/react-table'
import { EllipsisVerticalIcon, EyeIcon, LayoutDashboardIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { router } from '@inertiajs/react'

// Component Imports
import Link from '@admin/components/Link'
import { Avatar, AvatarFallback, AvatarImage } from '@admin/components/ui/avatar'
import { Button, buttonVariants } from '@admin/components/ui/button'
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
          render={<Link href={url} aria-label={labels.view} className={buttonVariants({ variant: 'ghost', size: 'icon' })} />}
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

// Chữ cái đầu cho avatar dự phòng.
export function initialsFromName(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase() || '#'
  )
}

const cellOf = (row: ResourceRow, name: string) => row.cells.find(cell => cell.name === name)

// Cột danh tính gộp avatar + tên + dòng phụ (email, hoặc mã bản ghi) thành một ô.
const IDENTITY_MERGED = ['avatar_url', 'email', 'id']

function IdentityCell({ row, renderCell }: { row: ResourceRow; renderCell: ResourceColumnsOptions['renderCell'] }) {
  const name = String(cellOf(row, 'name')?.value ?? '')
  const avatar = cellOf(row, 'avatar_url')?.value
  const email = cellOf(row, 'email')
  const id = cellOf(row, 'id')?.value
  const subtitle = email ? renderCell(email) : id !== undefined && id !== null ? `#${String(id)}` : null
  const title = <span className='font-medium'>{name}</span>

  return (
    <div className='flex min-w-44 items-center gap-2'>
      <Avatar className='size-9'>
        {avatar ? <AvatarImage src={String(avatar)} alt={name} /> : null}
        <AvatarFallback className='text-xs'>{initialsFromName(name)}</AvatarFallback>
      </Avatar>
      <div className='flex min-w-0 flex-col'>
        {row.url ? (
          <Link href={row.url} className='hover:underline'>
            {title}
          </Link>
        ) : (
          title
        )}
        {subtitle ? <span className='text-muted-foreground truncate'>{subtitle}</span> : null}
      </div>
    </div>
  )
}

export function buildResourceColumns(options: ResourceColumnsOptions): ColumnDef<ResourceRow>[] {
  const { columns, columnLabel, canEdit, canDestroy, withOverview, renderCell } = options
  const hasIdentity = columns.some(column => column.name === 'name')
  const visibleColumns = hasIdentity ? columns.filter(column => !IDENTITY_MERGED.includes(column.name)) : columns

  const dataColumns = visibleColumns.map((column, columnIndex) => ({
    id: column.name,
    header: columnLabel(column),
    accessorFn: (row: ResourceRow) => cellOf(row, column.name)?.value,
    cell: ({ row }: { row: { original: ResourceRow } }) => {
      if (hasIdentity && column.name === 'name') {
        return <IdentityCell row={row.original} renderCell={renderCell} />
      }

      const cell = cellOf(row.original, column.name)

      if (!cell) {
        return null
      }

      const url = row.original.url

      return (
        <div className={cn('max-w-xs', column.html_class === 'number' && 'text-right')}>
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
  })) as ColumnDef<ResourceRow>[]

  if (!canEdit && !canDestroy && !withOverview) {
    return dataColumns
  }

  return [
    ...dataColumns,
    {
      id: 'actions',
      header: options.labels.actions,
      cell: ({ row }) => <ResourceRowActions row={row.original} {...options} />,
      enableHiding: false,
      enableSorting: false
    }
  ]
}
