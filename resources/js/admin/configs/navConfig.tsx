// Third-party Imports
import { usePage } from '@inertiajs/react'
import type * as Icon from 'lucide-react'

type IconName = keyof typeof Icon

export type MenuLeafSubItem = {
  label: string
  href: string
  activePath?: string
  badge?: string
  badgeClassName?: string
  target?: '_blank' | '_self' | '_parent' | '_top'
}

export type MenuGroupSubItem = {
  label: string
  childItems: MenuLeafSubItem[]
}

export type MenuSubItem = MenuLeafSubItem | MenuGroupSubItem

export type MenuItem = {
  icon: IconName
  label: string
} & (
  | {
      href: string
      activePath?: string
      badge?: string
      badgeClassName?: string
      childItems?: never
      target?: '_blank' | '_self' | '_parent' | '_top'
    }
  | {
      href?: never
      badge?: string
      badgeClassName?: string
      childItems: MenuSubItem[]
    }
)

export type NavItem = {
  groupLabel?: string
  items: MenuItem[]
}

// Điều hướng của console do máy chủ dựng (App\Support\SuperAdmin\ConsoleNavigation,
// chia sẻ qua SuperAdminInertia); ở đây chỉ đổi sang dạng menu của thanh bên.
type ConsoleNavChild = { key: string; label: string; url: string }

type ConsoleNavItem = {
  key: string
  label: string
  url: string
  exact?: boolean
  external?: boolean
  children?: ConsoleNavChild[]
}

export type ConsoleNavGroup = { key: string; label: string; items: ConsoleNavItem[] }

// Icon theo `key` mục điều hướng.
export const NAV_ICONS: Record<string, IconName> = {
  dashboard: 'LayoutDashboardIcon',
  accounts: 'Building2Icon',
  users: 'UsersIcon',
  channel_health: 'ActivityIcon',
  instance_status: 'ServerIcon',
  data: 'DatabaseIcon',
  sticker_packs: 'SmileIcon',
  agent_bots: 'BotIcon',
  platform_apps: 'BlocksIcon',
  access_tokens: 'KeyRoundIcon',
  app_config: 'SlidersHorizontalIcon',
  installation_configs: 'FileCogIcon',
  settings: 'SettingsIcon',
  audit_logs: 'ScrollTextIcon',
  impersonations: 'VenetianMaskIcon',
  horizon: 'LayersIcon',
  pulse: 'GaugeIcon',
  logs: 'FileTextIcon',
  dash: 'KanbanIcon'
}

export const navIcon = (key: string): IconName => NAV_ICONS[key] ?? 'CircleIcon'

export const toNavItems = (groups: ConsoleNavGroup[]): NavItem[] =>
  groups.map(group => ({
    groupLabel: group.label,
    items: group.items.map((item): MenuItem => {
      if (item.children?.length) {
        return {
          icon: navIcon(item.key),
          label: item.label,
          childItems: item.children.map(child => ({ label: child.label, href: child.url }))
        }
      }

      return {
        icon: navIcon(item.key),
        label: item.label,
        href: item.url,
        ...(item.external ? { target: '_blank' as const } : {}),
        ...(item.exact || item.external ? {} : { activePath: item.url })
      }
    })
  }))

export const useConsoleNavGroups = (): ConsoleNavGroup[] =>
  (usePage().props as { superAdmin?: { navGroups?: ConsoleNavGroup[] } }).superAdmin?.navGroups ?? []
