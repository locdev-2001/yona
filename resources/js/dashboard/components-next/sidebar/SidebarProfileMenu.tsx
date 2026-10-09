import { useState } from 'react';
import { createPortal } from 'react-dom';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { logout } from 'dashboard/helper/logout';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import KeyShortcutModal from 'dashboard/commands/KeyShortcutModal';
import SidebarProfileMenuStatus from './SidebarProfileMenuStatus';
import SidebarProfileMenuLanguage from './SidebarProfileMenuLanguage';
import { useSidebarKeyboardShortcuts } from 'dashboard/composables/useSidebarKeyboardShortcuts';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { useCurrentUserAvailability } from 'dashboard/realtime/hooks';
import {
    DropdownBody,
    DropdownContainer,
    DropdownItem,
    DropdownSeparator,
} from 'dashboard/components-next/dropdown-menu/base';
import type { DashboardPageProps } from '../../types';

// Port từ sidebar/SidebarProfileMenu.vue
// Khác gốc: Appearance mở submenu đổi theme trực tiếp (gốc mở ninja-keys — B10);
// Contact support / Docs / Changelog (link ra site ngoài) bỏ theo branding;
// Keyboard shortcuts vào B10.
export default function SidebarProfileMenu({ isCollapsed = false }: { isCollapsed?: boolean }) {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const user = auth.user!;
    const availability = useCurrentUserAvailability();
    const availableName = user.display_name || user.name;
    const [showShortcutModal, setShowShortcutModal] = useState(false);

    // Sidebar.vue gốc gắn phím tắt $mod+Slash / Alt+C,V,R,S; ở đây gắn cùng chỗ
    // với mục menu mở modal để không đụng Sidebar.tsx của tính năng khác.
    useSidebarKeyboardShortcuts(currentAccount.id, setShowShortcutModal);


    const menu = (
        <DropdownBody className="bottom-12 z-50 mb-2 w-80 ltr:left-0 rtl:right-0">
            <SidebarProfileMenuStatus />
            <DropdownSeparator />
            <SidebarProfileMenuLanguage />
            <DropdownItem
                label={t('SIDEBAR_ITEMS.KEYBOARD_SHORTCUTS')}
                icon="i-lucide-keyboard"
                onClick={() => setShowShortcutModal(true)}
            />
            <DropdownItem
                label={t('SIDEBAR_ITEMS.PROFILE_SETTINGS')}
                icon="i-lucide-user-pen"
                link={accountScopedUrl(currentAccount.id, 'profile/settings')}
            />
            {user.type === 'SuperAdmin' ? (
                <DropdownItem
                    label={t('SIDEBAR_ITEMS.SUPER_ADMIN_CONSOLE')}
                    icon="i-lucide-castle"
                    link="/admin"
                    nativeLink
                    target="_blank"
                />
            ) : null}
            <DropdownItem label={t('SIDEBAR_ITEMS.LOGOUT')} icon="i-lucide-power" onClick={logout} />
        </DropdownBody>
    );

    return (
        <>
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
                        seed={avatarSeed('user', user.id)}
                        size={32}
                        src={user.avatar_url}
                        name={availableName}
                        status={availability}
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
        {/* Gốc mount modal ở Dashboard.vue; sidebar của bản port có transform nên
            `position: fixed` bị neo vào sidebar → đưa ra body để rộng đúng viewport. */}
        {createPortal(
            <KeyShortcutModal show={showShortcutModal} onClose={() => setShowShortcutModal(false)} />,
            document.body,
        )}
        </>
    );
}
