import { router, usePage } from '@inertiajs/react';

import Dashboard from '../../Dashboard';
import PortalEmptyState from '../components/PortalEmptyState';
import type { DashboardPageProps } from '../../types';

// Port từ routes/dashboard/helpcenter/pages/PortalsNewPage.vue.
export default function PortalsNew() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    return (
        <Dashboard>
            <div className="w-full h-full bg-n-background">
                <PortalEmptyState
                    onPortalCreate={({ slug, locale }) =>
                        router.visit(`/app/accounts/${accountId}/portals/${slug}/${locale}/articles`)
                    }
                />
            </div>
        </Dashboard>
    );
}
