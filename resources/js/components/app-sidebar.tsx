import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from '@/components/ui/sidebar';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
import { type NavGroup } from '@/types';
import { Activity, BarChart3, Bell, CalendarDays, History, Inbox, LayoutGrid, ListChecks, Plug } from 'lucide-react';

// Mock CRM navigation (sidebar-07 grouped + collapsible). Wire to real routes later.
const navGroups: NavGroup[] = [
    {
        title: 'Overview',
        items: [
            { title: 'Dashboard', url: '/dashboard', icon: LayoutGrid },
            { title: 'Calendar', url: '/calendar', icon: CalendarDays },
            {
                title: 'Tasks',
                url: '/tasks',
                icon: ListChecks,
                items: [
                    { title: 'Backlog', url: '/tasks/backlog', badge: 24 },
                    { title: 'In progress', url: '/tasks/in-progress', badge: 4 },
                    { title: 'Validation', url: '/tasks/validation', badge: 7 },
                    { title: 'Done', url: '/tasks/done', badge: 13 },
                ],
            },
        ],
    },
    {
        title: 'Tools',
        items: [
            { title: 'Notification', url: '/notifications', icon: Bell, badge: 7 },
            { title: 'Inbox', url: '/inbox', icon: Inbox },
            { title: 'Integration', url: '/integrations', icon: Plug },
            { title: 'Reporting', url: '/reporting', icon: BarChart3 },
        ],
    },
    {
        title: 'Metrics',
        items: [
            { title: 'Active', url: '/metrics/active', icon: Activity },
            { title: 'Past', url: '/metrics/past', icon: History },
        ],
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <WorkspaceSwitcher />
            </SidebarHeader>

            <SidebarContent>
                <NavMain groups={navGroups} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
