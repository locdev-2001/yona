import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';

import locales from 'shared/constants/locales';
import { fetchCategories, fetchPortalMeta, fetchPortals, portalBySlug, useHelpCenterState } from '../store';
import type { AllowedLocaleOption, Portal } from '../types';
import type { DashboardPageProps } from '../../types';

// Gom phần dùng chung của HelpCenterPageRouteView.vue + các *Page.vue:
// nạp portal + danh mục cho portal/locale đang xem và quy `allowed_locales`
// thành danh sách hiển thị.
export function toAllowedLocales(portal?: Portal | null): AllowedLocaleOption[] {
    if (!portal) return [];

    return (portal.config?.allowed_locales ?? []).map(locale => ({
        id: locale.code,
        name: locales[locale.code] ?? locale.code,
        code: locale.code,
        isDraft: locale.draft || false,
        articlesCount: locale.articles_count || 0,
        categoriesCount: locale.categories_count || 0,
    }));
}

export function useHelpCenterPage(portalSlug: string, locale?: string) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const state = useHelpCenterState();
    const portal = portalBySlug(portalSlug);

    useEffect(() => {
        const load = async () => {
            await fetchPortals(accountId);
            const activeLocale = locale || portalBySlug(portalSlug)?.meta?.default_locale || '';
            await fetchPortalMeta(accountId, portalSlug, activeLocale);
            await fetchCategories(accountId, portalSlug, activeLocale);
        };

        void load();
    }, [accountId, portalSlug, locale]);

    return { accountId, portal, allowedLocales: toAllowedLocales(portal), state };
}
