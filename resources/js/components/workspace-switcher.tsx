import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { ChevronsUpDown, Plus } from 'lucide-react';
import AppLogoIcon from './app-logo-icon';

// Mock: single workspace for now. Real multi-workspace switching comes later.
const workspaces = [{ name: 'Chó Rách', plan: 'CRM workspace' }];

export function WorkspaceSwitcher() {
    const { isMobile } = useSidebar();
    const active = workspaces[0];

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                <AppLogoIcon className="size-5 fill-current text-white dark:text-black" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">{active.name}</span>
                                <span className="text-muted-foreground truncate text-xs">{active.plan}</span>
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
                        <DropdownMenuLabel className="text-muted-foreground text-xs">Workspaces</DropdownMenuLabel>
                        {workspaces.map((ws, index) => (
                            <DropdownMenuItem key={ws.name} className="gap-2 p-2">
                                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-6 items-center justify-center rounded-sm">
                                    <AppLogoIcon className="size-3.5 fill-current text-white dark:text-black" />
                                </div>
                                {ws.name}
                                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 p-2" disabled>
                            <div className="bg-background flex size-6 items-center justify-center rounded-md border">
                                <Plus className="size-4" />
                            </div>
                            <div className="text-muted-foreground font-medium">Add workspace</div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
