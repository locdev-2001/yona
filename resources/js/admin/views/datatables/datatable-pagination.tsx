// React Imports
import type { ReactNode } from 'react'

// Third-party Imports
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

// Component Imports
import { Link } from '@inertiajs/react'
import { Button } from '@admin/components/ui/button'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from '@admin/components/ui/pagination'

// Hook Imports
import { usePagination } from '@admin/hooks/use-pagination'

type DataTablePaginationProps = {
  summary: ReactNode
  current: number
  // Biết tổng số trang thì hiện dãy số trang; không biết thì chỉ trang trước/sau theo `hasMore`.
  last?: number
  hasMore?: boolean
  hrefFor: (page: number) => string
  labels: { previous: string; next: string; navigation: string }
}

// Chân bảng phân trang phía máy chủ: mỗi nút là một link Inertia giữ nguyên bộ lọc.
const DataTablePagination = ({ summary, current, last, hasMore, hrefFor, labels }: DataTablePaginationProps) => {
  const totalPages = last ?? current + (hasMore ? 1 : 0)
  const canPrevious = current > 1
  const canNext = last === undefined ? Boolean(hasMore) : current < last

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: current,
    totalPages,
    paginationItemsToDisplay: 2
  })

  return (
    <div className='flex items-center justify-between gap-3 px-6 py-4 max-sm:flex-col md:max-lg:flex-col'>
      <p className='text-muted-foreground text-sm whitespace-nowrap' aria-live='polite'>
        {summary}
      </p>

      <div>
        <Pagination aria-label={labels.navigation}>
          <PaginationContent>
            <PaginationItem>
              {canPrevious ? (
                <Button
                  variant='ghost'
                  nativeButton={false}
                  render={<Link href={hrefFor(current - 1)} preserveScroll />}
                  aria-label={labels.previous}
                >
                  <ChevronLeftIcon aria-hidden='true' />
                  {labels.previous}
                </Button>
              ) : (
                <Button
                  className='disabled:pointer-events-none disabled:opacity-50'
                  variant='ghost'
                  disabled
                  aria-label={labels.previous}
                >
                  <ChevronLeftIcon aria-hidden='true' />
                  {labels.previous}
                </Button>
              )}
            </PaginationItem>

            {last !== undefined && showLeftEllipsis && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {last !== undefined &&
              pages.map(page => {
                const isActive = page === current

                return (
                  <PaginationItem key={page}>
                    <Button
                      size='icon'
                      className={`${!isActive && 'bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40'}`}
                      nativeButton={false}
                      render={<Link href={hrefFor(page)} preserveScroll />}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {page}
                    </Button>
                  </PaginationItem>
                )
              })}

            {last !== undefined && showRightEllipsis && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            <PaginationItem>
              {canNext ? (
                <Button
                  variant='ghost'
                  nativeButton={false}
                  render={<Link href={hrefFor(current + 1)} preserveScroll />}
                  aria-label={labels.next}
                >
                  {labels.next}
                  <ChevronRightIcon aria-hidden='true' />
                </Button>
              ) : (
                <Button
                  className='disabled:pointer-events-none disabled:opacity-50'
                  variant='ghost'
                  disabled
                  aria-label={labels.next}
                >
                  {labels.next}
                  <ChevronRightIcon aria-hidden='true' />
                </Button>
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

export default DataTablePagination
