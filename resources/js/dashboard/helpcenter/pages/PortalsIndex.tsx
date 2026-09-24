import { useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';

import Dashboard from '../../Dashboard';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import { fetchPortals, getHelpCenterState } from '../store';
import type { DashboardPageProps } from '../../types';

// Port từ routes/dashboard/helpcenter/pages/PortalsIndexPage.vue — trang trung
// chuyển: nạp danh sách portal rồi nhảy tới portal dùng gần nhất.
const VALID_NAVIGATION_PATHS = [
    'portals_articles_index',
    'portals_categories_index',
    'portals_locales_index',
    'portals_settings_index',
];

// Sidebar của Yona đang trỏ `portals/categories|locales|settings` (khác bản trước
// dùng `portals/portals_categories_index`…) — nhận cả hai dạng để không lệch màn.
const NAVIGATION_ALIASES: Record<string, string> = {
    articles: 'portals_articles_index',
    categories: 'portals_categories_index',
    locales: 'portals_locales_index',
    settings: 'portals_settings_index',
};

const PATH_SUFFIX: Record<string, (locale: string) => string> = {
    portals_articles_index: locale => `/${locale}/articles`,
    portals_categories_index: locale => `/${locale}/categories`,
    portals_locales_index: () => '/locales',
    portals_settings_index: () => '/settings',
};

export default function PortalsIndex({ navigationPath = '' }: { navigationPath?: string }) {
    const { currentAccount, auth } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    useEffect(() => {
        const run = async () => {
            await fetchPortals(accountId);
            const { portals } = getHelpCenterState();
            const uiSettings = (auth.user?.ui_settings ?? {}) as Record<string, string | undefined>;

            const lastActiveSlug = uiSettings.last_active_portal_slug;
            const lastActive = portals.find(portal => portal.slug === lastActiveSlug);
            const target = lastActive
                ? { slug: lastActive.slug, locale: uiSettings.last_active_locale_code ?? lastActive.meta.default_locale }
                : portals.length
                  ? { slug: portals[0].slug, locale: portals[0].meta.default_locale }
                  : null;

            if (!target) {
                router.visit(`/app/accounts/${accountId}/portals/new`, { replace: true });

                return;
            }

            const requestedPath = NAVIGATION_ALIASES[navigationPath] ?? navigationPath;
            const route = VALID_NAVIGATION_PATHS.includes(requestedPath) ? requestedPath : 'portals_articles_index';
            router.visit(`/app/accounts/${accountId}/portals/${target.slug}${PATH_SUFFIX[route](target.locale)}`, {
                replace: true,
            });
        };

        void run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Dashboard>
            <div className="flex items-center justify-center w-full bg-n-surface-1 text-n-slate-11">
                <Spinner />
            </div>
        </Dashboard>
    );
}
