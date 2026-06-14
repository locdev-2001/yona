import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { useInitials } from '@/hooks/use-initials';
import { useTranslator } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Check, ChevronsUpDown, Languages, LogOut } from 'lucide-react';

const LOCALES = ['vi', 'en'] as const;

export function AdminNavUser() {
    const { state, isMobile } = useSidebar();
    const getInitials = useInitials();
    const t = useTranslator();
    const { auth, locale } = usePage<SharedData>().props;
    const admin = auth.admin;

    if (!admin) {
        return null;
    }

    const setLocale = (next: string) => {
        if (next !== locale) {
            router.put(route('locale'), { locale: next }, { preserveScroll: true });
        }
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                            <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                                <AvatarFallback className="bg-secondary text-foreground rounded-lg">{getInitials(admin.name)}</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{admin.name}</span>
                                <span className="text-muted-foreground truncate text-xs">{admin.email}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="end"
                        side={isMobile ? 'bottom' : state === 'collapsed' ? 'left' : 'bottom'}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                                    <AvatarFallback className="bg-secondary text-foreground rounded-lg">{getInitials(admin.name)}</AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{admin.name}</span>
                                    <span className="text-muted-foreground truncate text-xs">{admin.email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Languages className="mr-2" />
                                    {t('platform.locale.label')}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    {LOCALES.map((code) => (
                                        <DropdownMenuItem key={code} onClick={() => setLocale(code)}>
                                            {t(`platform.locale.${code}`)}
                                            {locale === code && <Check className="ml-auto size-4" />}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link className="block w-full" method="post" href={route('admin.logout')} as="button">
                                <LogOut className="mr-2" />
                                {t('platform.nav.logout')}
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
