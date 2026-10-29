import { router } from '@inertiajs/react'
import { useState } from 'react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@admin/components/ui/table'
import { ResourcePagination } from '@admin/views/apps/resources/list/resource-pagination'
import { ResourceTableToolbar } from '@admin/views/apps/resources/list/resource-table-toolbar'
import { useConsoleLabels } from '../../../superadmin/labels'

import { accountStickersUrl } from './AccountStickerLibrary'

export type AccountLibrary = {
  id: number
  name: string
  packCount: number
  stickerCount: number
  lastAddedAt: string | null
}

export type AccountLibraryPage = {
  data: AccountLibrary[]
  current_page: number
  last_page: number
  total: number
  from: number | null
  to: number | null
}

type AccountLibraryListProps = {
  libraries: AccountLibraryPage
  search: string
  listUrl: (params: { search?: string; page?: number }) => string
  label: (key: string, params?: Record<string, string | number>) => string
}

const formatAddedAt = (value: string | null) =>
  value ? new Date(value.replace(' ', 'T')).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'

// Tài khoản đang có kho sticker riêng, mới thêm gần nhất lên đầu; bấm một dòng để mở kho đó.
const AccountLibraryList = ({ libraries, search, listUrl, label }: AccountLibraryListProps) => {
  const consoleLabel = useConsoleLabels()
  const [query, setQuery] = useState(search)
  const visitSearch = (nextSearch: string) => router.visit(listUrl({ search: nextSearch }), { preserveState: true })

  return (
    <div className='flex flex-col gap-3'>
      <div className='sm:w-80'>
        <ResourceTableToolbar
          search={query}
          searchLabel={label('FILTER_ACCOUNTS')}
          clearLabel={consoleLabel('clear_search')}
          canClear={search !== ''}
          onSearchChange={setQuery}
          onSubmit={() => visitSearch(query.trim())}
          onClear={() => {
            setQuery('')
            visitSearch('')
          }}
        />
      </div>

      {libraries.data.length === 0 ? (
        <p className='text-muted-foreground border px-4 py-12 text-center text-sm'>
          {search ? label('NO_ACCOUNTS') : label('NO_ACCOUNT_LIBRARIES')}
        </p>
      ) : (
        <div className='border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{label('COLUMN_ACCOUNT')}</TableHead>
                <TableHead className='text-right'>{label('COLUMN_PACKS')}</TableHead>
                <TableHead className='text-right'>{label('COLUMN_STICKERS')}</TableHead>
                <TableHead className='max-sm:hidden'>{label('COLUMN_LAST_ADDED')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {libraries.data.map(library => (
                <TableRow
                  key={library.id}
                  tabIndex={0}
                  className='cursor-pointer'
                  onClick={() => router.visit(accountStickersUrl(library.id))}
                  onKeyDown={event => {
                    if (event.key === 'Enter') router.visit(accountStickersUrl(library.id))
                  }}
                >
                  <TableCell className='max-w-0 w-full'>
                    <span className='block truncate font-medium'>{library.name}</span>
                    <span className='text-muted-foreground block text-xs sm:hidden'>{formatAddedAt(library.lastAddedAt)}</span>
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>{library.packCount}</TableCell>
                  <TableCell className='text-right tabular-nums'>{library.stickerCount}</TableCell>
                  <TableCell className='text-muted-foreground whitespace-nowrap max-sm:hidden'>
                    {formatAddedAt(library.lastAddedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {libraries.data.length > 0 ? (
        <ResourcePagination
          summary={`${libraries.from}-${libraries.to} / ${consoleLabel('records_total', { total: libraries.total })}`}
          currentPage={libraries.current_page}
          totalPages={libraries.last_page}
          hrefFor={page => listUrl({ search, page })}
          previousLabel={consoleLabel('previous_page')}
          nextLabel={consoleLabel('next_page')}
        />
      ) : null}
    </div>
  )
}

export default AccountLibraryList
