import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import { applyFontSizeToDOM } from 'dashboard/composables/useFontSize';
import Sidebar from 'dashboard/components-next/sidebar/Sidebar';
import MobileSidebarLauncher from 'dashboard/components-next/sidebar/MobileSidebarLauncher';
import SnackbarContainer from 'v3/components/SnackBar/Container';
import RealtimeProvider from 'dashboard/realtime/RealtimeProvider';
import CommandBar from 'dashboard/commands/CommandBar';
import { refreshPushSubscription, vapidPublicKeyOf } from 'dashboard/helper/pushHelper';
import { bindUnreadIndicators } from 'dashboard/notifications/unreadIndicators';
import UnreadTitleSync from 'dashboard/notifications/components/UnreadTitleSync';
import { StickerDisplaySizeProvider } from 'shared/sticker/stickerDisplaySize';
import type { DashboardPageProps } from './types';

// Port từ dashboard/routes/dashboard/Dashboard.vue (shell)
// Copilot/UpgradePage/KeyShortcutModal: EE hoặc vào nhóm sau. CommandBar: khung + snooze (B5), phần còn lại B10.
export default function Dashboard({ children }: { children: ReactNode }) {
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const { auth, globalConfig, currentAccount, stickerDisplaySize } = usePage<DashboardPageProps>().props;
    const fontSize = auth.user?.ui_settings?.font_size as string | undefined;
    const vapidPublicKey = vapidPublicKeyOf(globalConfig);

    useEffect(() => {
        applyFontSizeToDOM(fontSize);
    }, [fontSize]);

    const userId = auth.user?.id;

    useEffect(() => {
        refreshPushSubscription(userId, vapidPublicKey).catch(() => undefined);
    }, [userId, vapidPublicKey]);

    const accountId = currentAccount?.id ?? 0;

    useEffect(() => {
        bindUnreadIndicators(accountId);
    }, [accountId]);

    return (
        <StickerDisplaySizeProvider size={stickerDisplaySize}>
            <div className="flex flex-grow overflow-hidden text-n-slate-12 h-screen w-full">
                <Sidebar
                    isMobileSidebarOpen={isMobileSidebarOpen}
                    onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
                />
                <main className="flex flex-1 h-full w-full min-h-0 px-0 overflow-hidden bg-n-surface-1">
                    {children}
                    <MobileSidebarLauncher
                        isMobileSidebarOpen={isMobileSidebarOpen}
                        onToggle={() => setMobileSidebarOpen(open => !open)}
                    />
                    <CommandBar />
                </main>
                <SnackbarContainer />
                <RealtimeProvider />
                <UnreadTitleSync />
            </div>
        </StickerDisplaySizeProvider>
    );
}
