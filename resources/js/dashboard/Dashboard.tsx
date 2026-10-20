import { useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import { applyFontSizeToDOM } from 'dashboard/composables/useFontSize';
import { applyColorScheme, useColorScheme } from 'dashboard/composables/useColorScheme';
import Sidebar from 'dashboard/components-next/sidebar/Sidebar';
import MobileTabBar from 'dashboard/components-next/sidebar/MobileTabBar';
import { useViewportWidth } from 'dashboard/composables/useViewportWidth';
import { isThreadOpen, showMobileTabBar } from 'dashboard/conversation/layoutMode';
import SnackbarContainer from 'v3/components/SnackBar/Container';
import RealtimeProvider from 'dashboard/realtime/RealtimeProvider';
import CommandBar from 'dashboard/commands/CommandBar';
import { ProfileOverlay } from 'dashboard/contacts/profile/profileOverlay';
import { YonaRelationshipsSync } from 'dashboard/friends/yonaRelationships';
import { bindUnreadIndicators } from 'dashboard/notifications/unreadIndicators';
import UnreadTitleSync from 'dashboard/notifications/components/UnreadTitleSync';
import PushSubscriptionSync from 'dashboard/notifications/components/PushSubscriptionSync';
import { StickerDisplaySizeProvider } from 'shared/sticker/stickerDisplaySize';
import SettingsShell from 'dashboard/settings/shell/SettingsShell';
import { InsideSettingsOverlay, SettingsOverlay } from 'dashboard/settings/shell/settingsOverlay';
import { isSettingsPath, rememberAppUrl } from 'dashboard/settings/shell/settingsPages';
import type { DashboardPageProps } from './types';
import CallBar from 'dashboard/calls/CallBar';
import CallStage from 'dashboard/calls/CallStage';
import CallMiniPlayer from 'dashboard/calls/CallMiniPlayer';
import { useCallSession } from 'dashboard/calls/callSession';
import { useIsPhoneScreen } from 'dashboard/composables/useViewportWidth';

// Port từ dashboard/routes/dashboard/Dashboard.vue (shell)
// Copilot/UpgradePage/KeyShortcutModal: EE hoặc vào nhóm sau. CommandBar: khung + snooze (B5), phần còn lại B10.
export default function Dashboard({ children }: { children: ReactNode }) {
    // Trang Cài đặt mở trong lớp nổi: khung app là của trang phía sau, ở đây chỉ còn nội dung.
    return useContext(InsideSettingsOverlay) ? <>{children}</> : <DashboardFrame>{children}</DashboardFrame>;
}

function DashboardFrame({ children }: { children: ReactNode }) {
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const page = usePage<DashboardPageProps & { conversationId?: number | null; isComposing?: boolean }>();
    const { auth, currentAccount, stickerDisplaySize, conversationId, isComposing } = page.props;
    const viewportWidth = useViewportWidth();
    const hasMobileTabBar = showMobileTabBar(viewportWidth, isThreadOpen(conversationId, isComposing));
    const fontSize = auth.user?.ui_settings?.font_size as string | undefined;

    const { colorScheme } = useColorScheme();
    const isPhone = useIsPhoneScreen();
    const call = useCallSession();

    useEffect(() => {
        applyFontSizeToDOM(fontSize);
    }, [fontSize]);

    useEffect(() => {
        applyColorScheme(colorScheme);
    }, [colorScheme]);

    const accountId = currentAccount?.id ?? 0;
    const isSettingsScreen = isSettingsPath(accountId, page.url);

    useEffect(() => {
        if (!isSettingsScreen) rememberAppUrl(page.url);
    }, [isSettingsScreen, page.url]);

    useEffect(() => {
        bindUnreadIndicators(accountId);
    }, [accountId]);

    return (
        <StickerDisplaySizeProvider size={stickerDisplaySize}>
            {/* dvh thay vh: trên Safari iPhone 100vh gồm cả vùng thanh công cụ dưới, đáy khung (ô soạn tin) bị che. */}
            <div className="flex flex-col h-screen supports-[height:100dvh]:h-dvh w-full">
                <PushSubscriptionSync />
                <div className="flex flex-grow overflow-hidden text-n-slate-12 min-h-0 w-full">
                    <Sidebar
                        isMobileSidebarOpen={isMobileSidebarOpen}
                        onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
                    />
                    <main className="relative flex flex-1 h-full w-full min-h-0 px-0 overflow-hidden bg-n-surface-canvas">
                        {isSettingsScreen ? <SettingsShell>{children}</SettingsShell> : children}
                        <CommandBar />
                        <ProfileOverlay />
                        <YonaRelationshipsSync />
                        <SettingsOverlay />
                        {call.room && call.stageOpen ? (
                            <CallStage room={call.room} local={call.local} actions={call.actions} renderMedia={call.renderMedia} isPhone={isPhone} />
                        ) : null}
                        {call.room && !call.stageOpen && !isPhone && call.sharer ? (
                            <CallMiniPlayer sharer={call.sharer} renderMedia={call.renderMedia} onExpand={call.actions.expand} />
                        ) : null}
                    </main>
                    <SnackbarContainer />
                    <RealtimeProvider />
                    <UnreadTitleSync />
                </div>
                {call.room && !call.stageOpen && isPhone ? <CallBar room={call.room} local={call.local} actions={call.actions} /> : null}
                {/* Trong luồng, không nổi: cột trên co lại nên thẻ cuối danh sách không bị che. */}
                {hasMobileTabBar && !isSettingsScreen ? (
                    <MobileTabBar
                        isMobileSidebarOpen={isMobileSidebarOpen}
                        onToggleSidebar={() => setMobileSidebarOpen(open => !open)}
                    />
                ) : null}
            </div>
        </StickerDisplaySizeProvider>
    );
}
