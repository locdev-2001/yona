import { AdminNavUser } from '@/components/admin/admin-nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import { useTranslator } from '@/lib/i18n';
import type { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Building2, LayoutGrid, Megaphone, ShieldCheck } from 'lucide-react';

export function AdminSidebar() {
    const t = useTranslator();
    const path = window.location.pathname;
    const { auth } = usePage<SharedData>().props;
    const adminPermissions: string[] = auth.admin?.permissions ?? [];

    const baseItems = [
        { title: t('platform.admin.nav.dashboard'), href: '/admin/dashboard', icon: LayoutGrid, permission: null },
        { title: t('platform.admin.nav.workspaces'), href: '/admin/workspaces', icon: Building2, permission: 'platform.workspaces.view' },
        { title: t('platform.admin.nav.announcements'), href: '/admin/announcements', icon: Megaphone, permission: 'platform.announcements.manage' },
    ];

    const items = baseItems.filter((item) => item.permission === null || adminPermissions.includes(item.permission));

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent active:bg-transparent">
                            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                <ShieldCheck className="size-5" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">{t('platform.admin.title')}</span>
                                <span className="text-muted-foreground truncate text-xs">{t('platform.admin.badge')}</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        {items.map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton asChild isActive={path === item.href || path.startsWith(item.href + '/')} tooltip={item.title}>
                                    <Link href={item.href} prefetch>
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <AdminNavUser />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
