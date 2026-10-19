import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import KeyShortcutModal from 'dashboard/commands/KeyShortcutModal';
import { useSidebarKeyboardShortcuts } from 'dashboard/composables/useSidebarKeyboardShortcuts';
import { useCurrentUserAvailability } from 'dashboard/realtime/hooks';
import { settingsHomeUrl } from 'dashboard/settings/shell/settingsPages';
import type { DashboardPageProps } from '../../types';

// Chân sidebar: hồ sơ và bánh răng là một nút, mở màn Cài đặt (nơi gộp trạng thái,
// ngôn ngữ, giao diện, phím tắt, đăng xuất và các trang cài đặt).
export default function SidebarProfileMenu({ isCollapsed = false }: { isCollapsed?: boolean }) {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const user = auth.user!;
    const availability = useCurrentUserAvailability();
    const availableName = user.display_name || user.name;
    const [showShortcutModal, setShowShortcutModal] = useState(false);
    const settingsLabel = t('SIDEBAR_ITEMS.SETTINGS_SCREEN.TITLE');

    useSidebarKeyboardShortcuts(currentAccount.id, setShowShortcutModal);

    return (
        <>
            <Link
                href={settingsHomeUrl(currentAccount.id)}
                title={settingsLabel}
                aria-label={`${availableName} · ${settingsLabel}`}
                className={`group flex gap-2 items-center p-1 rounded-lg hover:bg-n-surface-hover ${
                    isCollapsed ? 'justify-center' : 'w-full min-w-0'
                }`}
            >
                <Avatar
                    seed={avatarSeed('user', user.id)}
                    size={32}
                    src={user.avatar_url}
                    name={availableName}
                    status={availability}
                />
                {!isCollapsed ? (
                    <>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium leading-4 truncate text-n-slate-12">{availableName}</div>
                            <div className="text-xs truncate text-n-slate-11">{user.email}</div>
                        </div>
                        <span className="grid place-content-center size-8 shrink-0 rounded-lg text-n-slate-11 group-hover:text-n-slate-12">
                            <span className="i-lucide-settings size-[18px]" aria-hidden="true" />
                        </span>
                    </>
                ) : null}
            </Link>
            {/* Sidebar có transform nên `position: fixed` bị neo vào sidebar → đưa modal ra body. */}
            {createPortal(
                <KeyShortcutModal show={showShortcutModal} onClose={() => setShowShortcutModal(false)} />,
                document.body,
            )}
        </>
    );
}
