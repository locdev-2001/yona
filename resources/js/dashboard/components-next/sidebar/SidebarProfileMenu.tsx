import { useState } from 'react';
import { createPortal } from 'react-dom';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { logout } from 'dashboard/helper/logout';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import KeyShortcutModal from 'dashboard/commands/KeyShortcutModal';
import SidebarProfileMenuLanguage from './SidebarProfileMenuLanguage';
import SidebarProfileMenuAppearance from './SidebarProfileMenuAppearance';
import { CHAT_PROFILE_PATH } from './menuItems';
import {
    DropdownBody,
    DropdownContainer,
    DropdownItem,
} from 'dashboard/components-next/dropdown-menu/base';
import type { DashboardPageProps } from '../../types';

// Port từ sidebar/SidebarProfileMenu.vue
// Khác gốc: Ngôn ngữ và Giao diện chọn thẳng trong menu (gốc mở ninja-keys);
// Contact support / Docs / Changelog (link ra site ngoài) bỏ theo branding;
// Keyboard shortcuts vào B10.
export default function SidebarProfileMenu({ isCollapsed = false }: { isCollapsed?: boolean }) {
    const { auth } = usePage<DashboardPageProps>().props;
    const user = auth.user!;
    const availableName = user.display_name || user.name;
    const [showShortcutModal, setShowShortcutModal] = useState(false);


    const menu = (
        <DropdownBody className="bottom-12 z-50 mb-2 w-80 ltr:left-0 rtl:right-0">
            <SidebarProfileMenuLanguage />
            <SidebarProfileMenuAppearance />
            <DropdownItem
                label={t('SIDEBAR_ITEMS.KEYBOARD_SHORTCUTS')}
                icon="i-lucide-keyboard"
                onClick={() => setShowShortcutModal(true)}
            />
            <DropdownItem
                label={t('SIDEBAR_ITEMS.PROFILE_SETTINGS')}
                icon="i-lucide-user-pen"
                link={CHAT_PROFILE_PATH}
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
                    className={`flex gap-2 items-center p-1 text-left rounded-lg cursor-pointer hover:bg-n-surface-hover ${
                        isOpen ? 'bg-n-surface-hover' : ''
                    } ${isCollapsed ? 'justify-center' : 'w-full'}`}
                    title={isCollapsed ? availableName : undefined}
                    onClick={toggle}
                >
                    <Avatar
                        seed={avatarSeed('user', user.id)}
                        size={32}
                        src={user.avatar_url}
                        name={availableName}
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
