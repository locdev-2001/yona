import { useEffect } from 'react';

import Dashboard from '../../Dashboard';
import CategoriesPage from '../components/CategoriesPage';
import { fetchCategories, fetchPortalMeta, useHelpCenterState } from '../store';
import { useHelpCenterPage } from './usePortalPage';

// Port từ routes/dashboard/helpcenter/pages/PortalsCategoriesIndexPage.vue.
export default function PortalsCategoriesIndex({ portalSlug, locale }: { portalSlug: string; locale: string }) {
    const { accountId, allowedLocales } = useHelpCenterPage(portalSlug, locale);
    const { categories, isFetchingCategories } = useHelpCenterState();

    useEffect(() => {
        void fetchCategories(accountId, portalSlug, locale);
    }, [accountId, portalSlug, locale]);

    const sortedCategories = [...categories].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    return (
        <Dashboard>
            <CategoriesPage
                categories={sortedCategories}
                isFetching={isFetchingCategories}
                allowedLocales={allowedLocales}
                portalSlug={portalSlug}
                locale={locale}
                onFetchCategories={async nextLocale => {
                    await fetchCategories(accountId, portalSlug, nextLocale);
                    await fetchPortalMeta(accountId, portalSlug, nextLocale);
                }}
            />
        </Dashboard>
    );
}
