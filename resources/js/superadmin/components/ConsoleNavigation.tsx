import type { SuperAdminPageProps } from '../types';
import { router, usePage } from '@inertiajs/react';
import * as Icons from '@admin/components/icons';
import { House, LogOut, Moon, Sun, Language, type IconComponent } from '@admin/components/icons';
import { useMemo } from 'react';
import { useTheme } from '@admin/components/ThemeProvider';
import { DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@admin/components/ui/dropdown-menu';
import { useSidebar } from '@admin/components/ui/sidebar';
import { navIcon } from '@admin/configs/navConfig';
import useThemeConfig from '@admin/configs/themeConfig';
import { NavigationSidebar, type SidebarGroup } from '../design-preview/navigation-sidebar';
import { useDesignCopy } from '../design-preview/copy';
import { useConsoleLabels } from '../labels';
import { useActiveConsoleNavigation } from './navigation';

export default function ConsoleNavigation() {
    const { groups, activeId } = useActiveConsoleNavigation();
    const { currentUser, templateName } = useThemeConfig();
    const label = useConsoleLabels();
    const { copy: previewCopy } = useDesignCopy();
    const { theme, setTheme } = useTheme();
    const { open, setOpen, openMobile, setOpenMobile } = useSidebar();
    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
    const navigation = useMemo<SidebarGroup[]>(() => groups.map(group => ({
        id: group.key,
        label: group.label,
        items: group.items.map(item => ({
            id: item.key,
            label: item.label,
            href: item.url,
            external: item.external,
            Icon: Icons[navIcon(item.key)] as IconComponent,
            children: item.children?.map(child => ({
                id: `${item.key}:${child.key}`,
                label: child.label,
                href: child.url,
                Icon: Icons[navIcon(item.key)] as IconComponent,
            })),
        })),
    })), [groups]);
    const items = navigation.flatMap(group => group.items.flatMap(item => [item, ...(item.children ?? [])]));
    const name = currentUser?.name ?? templateName;
    const { locale, locales = [] } = usePage<SuperAdminPageProps>().props.superAdmin;
    return (
        <NavigationSidebar
            groups={navigation}
            activeId={activeId}
            homeId="dashboard"
            brandName={templateName}
            collapsed={!open}
            onCollapsedChange={collapsed => setOpen(!collapsed)}
            mobileOpen={openMobile}
            onMobileClose={() => setOpenMobile(false)}
            theme={theme}
            onThemeChange={toggleTheme}
            onNavigate={id => {
                const target = items.find(item => item.id === id);
                if (!target?.href) return;
                setOpenMobile(false);
                router.visit(target.href);
            }}
            account={{
                name,
                subtitle: currentUser?.email ?? label('console_name'),
                initials: name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase(),
                menu: <>
                    <DropdownMenuItem render={<a href="/" />}><House />{label('back_to_app')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={toggleTheme}>
                        {theme === 'dark' ? <Sun /> : <Moon />}
                        {theme === 'dark' ? previewCopy.chuyen_sang_giao_dien_sang : previewCopy.chuyen_sang_giao_dien_toi}
                    </DropdownMenuItem>
                    {locales.length > 1 && <DropdownMenuSub>
                        <DropdownMenuSubTrigger><Language />{label('language')}</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="catalogue-popup sidebar-account-menu" collisionAvoidance={{ side: 'flip', align: 'shift', fallbackAxisSide: 'start' }}>
                            <DropdownMenuRadioGroup aria-label={label('language')} value={locale} onValueChange={selected => {
                                const option = locales.find(option => option.code === selected);
                                if (option) window.location.assign(option.url);
                            }}>
                                {locales.map(option => <DropdownMenuRadioItem key={option.code} value={option.code}><span lang={option.code}>{option.label}</span></DropdownMenuRadioItem>)}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem render={<a href="/admin/logout" />}><LogOut />{label('logout')}</DropdownMenuItem>
                </>,
            }}
        />
    );
}
