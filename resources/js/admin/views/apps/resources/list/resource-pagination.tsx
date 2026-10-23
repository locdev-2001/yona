// Third-party Imports
import { ChevronLeftIcon, ChevronRightIcon } from '@admin/components/icons'

// Component Imports
import Link from '@admin/components/Link'
import { Button, buttonVariants } from '@admin/components/ui/button'
import { cn } from '@admin/lib/utils'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from '@admin/components/ui/pagination'

// Hook Imports
import { usePagination } from '@admin/hooks/use-pagination'

export interface ResourcePaginationProps {
  summary: string
  currentPage: number
  totalPages: number
  hrefFor: (page: number) => string
  previousLabel: string
  nextLabel: string
}

// Mỗi trang là một liên kết thật (mở tab mới được), giữ từ khoá và sắp xếp.
export function ResourcePagination({
  summary,
  currentPage,
  totalPages,
  hrefFor,
  previousLabel,
  nextLabel
}: ResourcePaginationProps) {
  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage,
    totalPages,
    paginationItemsToDisplay: 5
  })

  return (
    <div className='flex items-center justify-between gap-3 px-6 py-4 max-sm:flex-col md:max-lg:flex-col'>
      <p className='text-muted-foreground text-sm whitespace-nowrap' aria-live='polite'>
        {summary}
      </p>

      <div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              {currentPage <= 1 ? (
                <Button variant='ghost' disabled aria-label={previousLabel} className='disabled:pointer-events-none disabled:opacity-50'>
                  <ChevronLeftIcon aria-hidden='true' />
                  <span className='max-sm:hidden'>{previousLabel}</span>
                </Button>
              ) : (
                <Link href={hrefFor(currentPage - 1)} aria-label={previousLabel} className={buttonVariants({ variant: 'ghost' })}>
                  <ChevronLeftIcon aria-hidden='true' />
                  <span className='max-sm:hidden'>{previousLabel}</span>
                </Link>
              )}
            </PaginationItem>

            {showLeftEllipsis && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {pages.map(page => {
              const isActive = page === currentPage

              return (
                <PaginationItem key={page}>
                  <Link
                    href={hrefFor(page)}
                    className={cn(
                      buttonVariants({ size: 'icon' }),
                      !isActive &&
                        'bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {page}
                  </Link>
                </PaginationItem>
              )
            })}

            {showRightEllipsis && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            <PaginationItem>
              {currentPage >= totalPages ? (
                <Button variant='ghost' disabled aria-label={nextLabel} className='disabled:pointer-events-none disabled:opacity-50'>
                  <span className='max-sm:hidden'>{nextLabel}</span>
                  <ChevronRightIcon aria-hidden='true' />
                </Button>
              ) : (
                <Link href={hrefFor(currentPage + 1)} aria-label={nextLabel} className={buttonVariants({ variant: 'ghost' })}>
                  <span className='max-sm:hidden'>{nextLabel}</span>
                  <ChevronRightIcon aria-hidden='true' />
                </Link>
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
