// React Imports
import { Fragment, useMemo } from 'react'

// Third-party Imports
import { SearchIcon } from 'lucide-react'

// Component Imports
import ProfileDropdown from '@admin/components/shared/ProfileDropdown'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@admin/components/ui/breadcrumb'
import { Button } from '@admin/components/ui/button'
import { CommandShortcut } from '@admin/components/ui/command'
import { Separator } from '@admin/components/ui/separator'
import { SidebarTrigger } from '@admin/components/ui/sidebar'

// Config Imports
import { useConsoleNavGroups } from '@admin/configs/navConfig'
import useThemeConfig from '@admin/configs/themeConfig'

// Hook Imports
import { usePathname } from '@admin/hooks/use-navigation'

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

// Vụn bánh mì theo mục điều hướng đang mở: nhóm chức năng › trang.
const useBreadcrumbSegments = (pathname: string) => {
  const groups = useConsoleNavGroups()

  return useMemo(() => {
    for (const group of groups) {
      const item = group.items.find(candidate =>
        candidate.external
          ? false
          : candidate.exact
            ? pathname === candidate.url
            : pathname === candidate.url || pathname.startsWith(`${candidate.url}/`)
      )

      if (item) return [group.label, item.label]
    }

    return []
  }, [groups, pathname])
}

const Header = ({ onOpenSearch }: { onOpenSearch?: () => void }) => {
  const pathname = usePathname()
  const { labels } = useThemeConfig()

  const segments = useBreadcrumbSegments(pathname)

  return (
    <header className='bg-card sticky top-0 z-50 border-b'>
      <div className='mx-auto flex max-w-360 items-center justify-between gap-6 px-4 py-2 sm:px-6'>
        <div className='flex min-w-0 items-center gap-4'>
          <SidebarTrigger className='[&_svg]:size-5!' aria-label={labels.open_menu ?? 'open_menu'} />
          <Separator orientation='vertical' className='hidden h-4! data-vertical:self-center sm:block' />
          <Breadcrumb className='hidden sm:block'>
            <BreadcrumbList>
              {segments.map((label, index) => {
                const isLast = index === segments.length - 1

                return (
                  <Fragment key={label}>
                    <BreadcrumbItem>
                      {isLast ? <BreadcrumbPage>{label}</BreadcrumbPage> : <BreadcrumbLink>{label}</BreadcrumbLink>}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator />}
                  </Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className='flex items-center gap-1.5'>
          <Button
            variant='outline'
            className='text-muted-foreground w-9 justify-start px-0 font-normal max-sm:justify-center sm:w-64 sm:px-3'
            onClick={onOpenSearch}
            aria-label={labels.search ?? 'search'}
            aria-keyshortcuts='Control+K Meta+K'
          >
            <SearchIcon />
            <span className='hidden flex-1 truncate text-left sm:inline'>{labels.search_shortcut_hint}</span>
            <CommandShortcut className='hidden sm:inline'>{isMac() ? '⌘K' : 'Ctrl K'}</CommandShortcut>
          </Button>
          <ProfileDropdown />
        </div>
      </div>
    </header>
  )
}

export default Header
