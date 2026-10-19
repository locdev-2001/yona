import { createContext, lazy, Suspense, useEffect, useSyncExternalStore } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import { router, usePage } from '@inertiajs/react';

import Loader from 'shared/components/loader/Loader';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import type { DashboardPageProps } from '../../types';
import SettingsShell from './SettingsShell';
import { isSettingsPath } from './settingsPages';

// Trang nằm trong lớp Cài đặt nổi: Dashboard của trang đó chỉ trả về nội dung, khung app
// là của trang đang xem phía sau.
export const InsideSettingsOverlay = createContext(false);

// Trang Cài đặt mở được ngay trên trang đang xem (không chuyển trang): chỉ những trang
// không cần props riêng từ máy chủ. Trang con (sửa một kênh, thêm kênh) vẫn chuyển trang.
const OVERLAY_PAGES: Record<string, LazyExoticComponent<ComponentType>> = {
    'profile/settings': lazy(() => import('dashboard/settings/profile/Index')),
    'settings/inboxes/list': lazy(() => import('dashboard/settings/inboxes/Index')),
    'settings/labels/list': lazy(() => import('dashboard/settings/labels/Index')),
    'settings/payment-accounts': lazy(() => import('dashboard/settings/paymentAccounts/Index')),
    'settings/custom-stickers': lazy(() => import('dashboard/settings/customStickers/Index')),
    'settings/canned-response/list': lazy(() => import('dashboard/settings/canned/Index')),
};

function overlayPageKey(accountId: number, url: string): string | null {
    const prefix = `${accountScopedUrl(accountId, '')}`;
    const path = new URL(url, window.location.origin).pathname;
    if (!path.startsWith(prefix)) return null;
    const key = path.slice(prefix.length).replace(/\/$/, '');
    return key in OVERLAY_PAGES ? key : null;
}

let openUrl: string | null = null;
const listeners = new Set<() => void>();

function setOpenUrl(url: string | null): void {
    openUrl = url;
    listeners.forEach(listener => listener());
}

export const closeSettings = () => setOpenUrl(null);

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// Gắn một lần trong Dashboard. Mọi lối vào Cài đặt (bánh răng, Ctrl+K, danh mục bên trái
// của Cài đặt) đều là một lượt chuyển trang Inertia: chặn lại và mở trong lớp nổi.
export function SettingsOverlay() {
    const page = usePage<DashboardPageProps>();
    const accountId = page.props.currentAccount?.id ?? 0;
    const url = useSyncExternalStore(subscribe, () => openUrl);
    const isOnSettingsPage = isSettingsPath(accountId, page.url);

    useEffect(closeSettings, [page.url]);

    useEffect(() => {
        if (!accountId || isOnSettingsPage) return undefined;
        return router.on('before', event => {
            const { visit } = event.detail;
            if (visit.method !== 'get' || overlayPageKey(accountId, visit.url.href) === null) return;
            event.preventDefault();
            setOpenUrl(visit.url.pathname + visit.url.search);
        });
    }, [accountId, isOnSettingsPage]);

    const pageKey = url === null ? null : overlayPageKey(accountId, url);
    if (url === null || pageKey === null) return null;
    const Page = OVERLAY_PAGES[pageKey];

    return (
        <InsideSettingsOverlay.Provider value>
            <SettingsShell currentUrl={url} onClose={closeSettings}>
                <Suspense
                    fallback={
                        <div className="grid flex-1 place-content-center text-n-slate-11">
                            <Loader />
                        </div>
                    }
                >
                    <Page />
                </Suspense>
            </SettingsShell>
        </InsideSettingsOverlay.Provider>
    );
}
