import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail, SidebarSeparator } from '@/components/ui/sidebar';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
import { useTranslator } from '@/lib/i18n';
import { type NavGroup, type NavItem, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Building2, FolderKanban, LayoutGrid, ListChecks, Sparkles, Target } from 'lucide-react';

export function AppSidebar() {
    const t = useTranslator();
    const { auth, unreadAnnouncementCount } = usePage<SharedData>().props;

    const permissions = auth.membership?.permissions ?? [];
    const can = (permission: string) => permissions.includes(permission);
    const unreadBadge = unreadAnnouncementCount ? unreadAnnouncementCount : undefined;

    // CRM navigation gated by tenant permissions (membership.permissions).
    const crmCandidates: Array<NavItem | false> = [
        can('tenant.client.view') && { title: 'Khách hàng', url: '/clients', icon: Building2 },
        can('tenant.lead.view') && { title: 'Leads', url: '/leads', icon: Target },
        can('tenant.project.view') && { title: 'Dự án', url: '/projects', icon: FolderKanban },
        can('tenant.task.view') && { title: 'Công việc', url: '/tasks', icon: ListChecks },
    ];
    const crmItems: NavItem[] = crmCandidates.filter((item): item is NavItem => item !== false);

    const navGroups: NavGroup[] = [
        {
            title: 'Tổng quan',
            items: [{ title: 'Dashboard', url: '/dashboard', icon: LayoutGrid }],
        },
        ...(crmItems.length > 0 ? [{ title: 'CRM', items: crmItems }] : []),
        {
            title: t('platform.announcements.nav_label'),
            items: [
                {
                    title: t('platform.announcements.nav_label'),
                    url: '/whats-new',
                    icon: Sparkles,
                    badge: unreadBadge,
                },
            ],
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <WorkspaceSwitcher />
            </SidebarHeader>

            <SidebarContent>
                <NavMain groups={navGroups} />
            </SidebarContent>

            <SidebarSeparator />

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
