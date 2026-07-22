import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { useTranslator } from '@/lib/i18n';
import type { SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import AppLogoIcon from './app-logo-icon';

export function WorkspaceSwitcher() {
    const { isMobile } = useSidebar();
    const t = useTranslator();
    const { auth, activeWorkspace } = usePage<SharedData>().props;

    const workspaces = auth.workspaces ?? [];
    const active = activeWorkspace ?? workspaces[0] ?? null;
    const role = auth.membership?.role;

    const switchTo = (id: string) => {
        if (id !== active?.id) {
            router.post(route('workspaces.switch', id), {}, { preserveScroll: true });
        }
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                <AppLogoIcon className="text-sidebar-primary-foreground size-5 fill-current" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">{active?.name ?? 'Yona'}</span>
                                {role && <span className="text-muted-foreground truncate text-xs">{t(`platform.roles.${role}`)}</span>}
                            </div>
                            <ChevronsUpDown className="ml-auto" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="start"
                        side={isMobile ? 'bottom' : 'right'}
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-muted-foreground text-xs">{t('platform.workspace.list_label')}</DropdownMenuLabel>
                        {workspaces.map((workspace) => (
                            <DropdownMenuItem key={workspace.id} className="gap-2 p-2" onClick={() => switchTo(workspace.id)}>
                                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-6 items-center justify-center rounded-sm">
                                    <AppLogoIcon className="text-sidebar-primary-foreground size-3.5 fill-current" />
                                </div>
                                <span className="flex-1 truncate">{workspace.name}</span>
                                {workspace.id === active?.id && <Check className="size-4" />}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 p-2" disabled>
                            <div className="bg-background flex size-6 items-center justify-center rounded-md border">
                                <Plus className="size-4" />
                            </div>
                            <div className="text-muted-foreground font-medium">{t('platform.workspace.add')}</div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
