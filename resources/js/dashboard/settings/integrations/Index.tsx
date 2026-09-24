import { useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { picoSearch } from '@ext/pico-search';

import { t } from '../../../i18n';
import { useBranding } from 'shared/composables/useBranding';
import { useIntegrationApps } from 'dashboard/composables/useIntegrationApps';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import SettingsLayout from '../SettingsLayout';
import BaseSettingsHeader from '../BaseSettingsHeader';
import IntegrationItem from './IntegrationItem';
import type { DashboardPageProps } from '../../types';

// Port từ dashboard/routes/dashboard/settings/integrations/Index.vue.
export default function IntegrationsIndex() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const { replaceInstallationName } = useBranding();

    const { apps, isFetching } = useIntegrationApps(accountId);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredApps = useMemo(() => {
        const query = searchQuery.trim();
        if (!query) return apps;
        return picoSearch(apps, query, ['name', 'description']);
    }, [apps, searchQuery]);

    return (
        <Dashboard>
            <SettingsWrapper>
                <SettingsLayout
                    isLoading={isFetching}
                    loadingMessage={t('INTEGRATION_SETTINGS.LOADING')}
                    header={
                        <BaseSettingsHeader
                            title={t('INTEGRATION_SETTINGS.HEADER')}
                            description={replaceInstallationName(t('INTEGRATION_SETTINGS.DESCRIPTION'))}
                            linkText={t('INTEGRATION_SETTINGS.LEARN_MORE')}
                            searchPlaceholder={t('INTEGRATION_SETTINGS.SEARCH_PLACEHOLDER')}
                            searchQuery={searchQuery}
                            onSearchQueryChange={setSearchQuery}
                            featureName="integrations"
                        />
                    }
                    body={
                        <div className="flex-grow flex-shrink overflow-auto">
                            {!filteredApps.length && searchQuery ? (
                                <span className="flex-1 flex items-center justify-center py-20 text-center text-body-main !text-base text-n-slate-11">
                                    {t('INTEGRATION_SETTINGS.NO_RESULTS')}
                                </span>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredApps.map(app => (
                                        <IntegrationItem
                                            key={app.id}
                                            accountId={accountId}
                                            id={app.id}
                                            name={app.name}
                                            description={app.description}
                                            enabled={app.enabled}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    }
                />
            </SettingsWrapper>
        </Dashboard>
    );
}
