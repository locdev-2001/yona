import { router, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { AVAILABILITY_STATUS_KEYS } from 'dashboard/constants/globals';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Icon from 'dashboard/components-next/icon/Icon';
import SidebarProfileMenuStatus from './SidebarProfileMenuStatus';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { updateColorScheme } from 'dashboard/helper/themeHelper';
import type { ColorScheme } from 'dashboard/helper/themeHelper';
import {
    DropdownBody,
    DropdownContainer,
    DropdownItem,
    DropdownSeparator,
} from 'dashboard/components-next/dropdown-menu/base';
import type { DashboardPageProps } from '../../types';

// Port từ sidebar/SidebarProfileMenu.vue
// Khác gốc: Appearance mở submenu đổi theme trực tiếp (gốc mở ninja-keys — B10);
// Contact support / Docs / Changelog (link chatwoot.com) bỏ theo branding;
// Keyboard shortcuts vào B10.
const APPEARANCE_OPTIONS: { scheme: ColorScheme; labelKey: string; icon: string }[] = [
    { scheme: 'light', labelKey: 'COMBOBOX.LIGHT', icon: 'i-lucide-sun' },
    { scheme: 'dark', labelKey: 'COMBOBOX.DARK', icon: 'i-lucide-moon' },
    { scheme: 'auto', labelKey: 'COMBOBOX.SYSTEM', icon: 'i-lucide-monitor' },
];

const APPEARANCE_LABELS: Record<ColorScheme, string> = {
    light: 'Light',
    dark: 'Dark',
    auto: 'System',
};

export default function SidebarProfileMenu({ isCollapsed = false }: { isCollapsed?: boolean }) {
    const { auth, currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;
    const user = auth.user!;
    const availableName = user.display_name || user.name;

    const logout = () => router.post('/app/logout');

    const menu = (
        <DropdownBody className="bottom-12 z-50 mb-2 w-80 ltr:left-0 rtl:right-0">
            <SidebarProfileMenuStatus />
            <DropdownSeparator />
            <DropdownItem
                label={t('SIDEBAR_ITEMS.PROFILE_SETTINGS')}
                icon="i-lucide-user-pen"
                link={accountScopedUrl(currentAccount.id, 'profile/settings')}
            />
            <DropdownItem preserveOpen className="!p-0">
                <div className="flex items-center gap-3 p-2 w-full">
                    <Icon icon="i-lucide-palette" className="size-4 text-n-slate-11" />
                    <span className="flex-grow text-left rtl:text-right">{t('SIDEBAR_ITEMS.APPEARANCE')}</span>
                    <div className="flex gap-1">
                        {APPEARANCE_OPTIONS.map(option => (
                            <button
                                key={option.scheme}
                                type="button"
                                title={APPEARANCE_LABELS[option.scheme]}
                                className="flex size-7 items-center justify-center rounded-md text-n-slate-11 hover:bg-n-alpha-2"
                                onClick={() => updateColorScheme(option.scheme)}
                            >
                                <Icon icon={option.icon} className="size-4" />
                            </button>
                        ))}
                    </div>
                </div>
            </DropdownItem>
            {user.type === 'SuperAdmin' ? (
                <DropdownItem
                    label={t('SIDEBAR_ITEMS.SUPER_ADMIN_CONSOLE')}
                    icon="i-lucide-castle"
                    link="/super_admin"
                    nativeLink
                    target="_blank"
                />
            ) : null}
            <DropdownItem label={t('SIDEBAR_ITEMS.LOGOUT')} icon="i-lucide-power" onClick={logout} />
        </DropdownBody>
    );

    return (
        <DropdownContainer className={`relative min-w-0 ${isCollapsed ? 'w-auto' : 'w-full'}`} menu={menu}>
            {({ toggle, isOpen }) => (
                <button
                    className={`flex gap-2 items-center p-1 text-left rounded-lg cursor-pointer hover:bg-n-alpha-1 ${
                        isOpen ? 'bg-n-alpha-1' : ''
                    } ${isCollapsed ? 'justify-center' : 'w-full'}`}
                    title={isCollapsed ? availableName : undefined}
                    onClick={toggle}
                >
                    <Avatar
                        size={32}
                        name={availableName}
                        status={AVAILABILITY_STATUS_KEYS[currentAccountUser.availability]}
                    />
                    {!isCollapsed ? (
                        <div className="min-w-0">
                            <div className="text-sm font-medium leading-4 truncate text-n-slate-12">{availableName}</div>
                            <div className="text-xs truncate text-n-slate-11">{user.email}</div>
                        </div>
                    ) : null}
                </button>
            )}
        </DropdownContainer>
    );
}
