import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { picoSearch } from '@chatwoot/pico-search';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { deleteJson, getJson, parseApiErrorMessage } from 'dashboard/helper/apiClient';
import Dashboard from '../../../Dashboard';
import SettingsWrapper from '../../SettingsWrapper';
import SettingsLayout from '../../SettingsLayout';
import BaseSettingsHeader from '../../BaseSettingsHeader';
import Button from 'dashboard/components-next/button/Button';
import DeleteModal from 'dashboard/components/widgets/modal/DeleteModal';
import BaseTable from 'dashboard/components-next/table/BaseTable';
import DashboardAppsRow from './DashboardAppsRow';
import DashboardAppModal from './DashboardAppModal';
import type { DashboardApp } from './types';
import type { DashboardPageProps } from '../../../types';

// Port từ dashboard/routes/dashboard/settings/integrations/DashboardApps/Index.vue.
// Backend `dashboard_apps` chưa port (nợ nhóm F6) — danh sách sẽ rỗng cho tới lúc đó.
export default function DashboardAppsIndex() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [records, setRecords] = useState<DashboardApp[]>([]);
    const [isFetching, setFetching] = useState(true);
    const [reloadToken, setReloadToken] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [modalMode, setModalMode] = useState<'CREATE' | 'UPDATE'>('CREATE');
    const [editingApp, setEditingApp] = useState<DashboardApp | null>(null);
    const [showAppModal, setShowAppModal] = useState(false);
    const [deletingApp, setDeletingApp] = useState<DashboardApp | null>(null);

    useEffect(() => {
        setFetching(true);
        void getJson<DashboardApp[]>(`/api/v1/accounts/${accountId}/dashboard_apps`)
            .then(response => setRecords(Array.isArray(response) ? response : []))
            .catch(() => undefined)
            .finally(() => setFetching(false));
    }, [accountId, reloadToken]);

    const filteredRecords = useMemo(() => {
        const query = searchQuery.trim();
        if (!query) return records;
        return picoSearch(records, query, ['title']);
    }, [records, searchQuery]);

    const confirmDeletion = async () => {
        const app = deletingApp;
        setDeletingApp(null);
        if (!app) return;

        try {
            await deleteJson(`/api/v1/accounts/${accountId}/dashboard_apps/${app.id}`);
            setReloadToken(token => token + 1);
            useAlert(t('INTEGRATION_SETTINGS.DASHBOARD_APPS.DELETE.API_SUCCESS'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('INTEGRATION_SETTINGS.DASHBOARD_APPS.DELETE.API_ERROR'));
        }
    };

    const tableHeaders = [
        t('INTEGRATION_SETTINGS.DASHBOARD_APPS.LIST.TABLE_HEADER.NAME'),
        t('INTEGRATION_SETTINGS.DASHBOARD_APPS.LIST.TABLE_HEADER.ENDPOINT'),
        t('INTEGRATION_SETTINGS.DASHBOARD_APPS.LIST.TABLE_HEADER.ACTIONS'),
    ];

    return (
        <Dashboard>
            <SettingsWrapper>
                <SettingsLayout
                    isLoading={isFetching}
                    loadingMessage={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.LIST.LOADING')}
                    noRecordsFound={!records.length}
                    noRecordsMessage={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.LIST.404')}
                    header={
                        <BaseSettingsHeader
                            title={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.TITLE')}
                            description={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.DESCRIPTION')}
                            linkText={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.LEARN_MORE')}
                            searchPlaceholder={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.SEARCH_PLACEHOLDER')}
                            searchQuery={searchQuery}
                            onSearchQueryChange={setSearchQuery}
                            featureName="dashboard_apps"
                            backButtonLabel={t('INTEGRATION_SETTINGS.HEADER')}
                            count={
                                records.length ? (
                                    <span className="text-body-main text-n-slate-11">
                                        {t('INTEGRATION_SETTINGS.DASHBOARD_APPS.COUNT', { n: records.length })}
                                    </span>
                                ) : null
                            }
                            actions={
                                <Button
                                    label={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.HEADER_BTN_TXT')}
                                    size="sm"
                                    onClick={() => {
                                        setModalMode('CREATE');
                                        setEditingApp(null);
                                        setShowAppModal(true);
                                    }}
                                />
                            }
                        />
                    }
                    body={
                        !filteredRecords.length && searchQuery ? (
                            <span className="flex-1 flex items-center justify-center py-20 text-center text-body-main !text-base text-n-slate-11">
                                {t('INTEGRATION_SETTINGS.DASHBOARD_APPS.NO_RESULTS')}
                            </span>
                        ) : (
                            <BaseTable headers={tableHeaders} hasItems={filteredRecords.length > 0}>
                                {filteredRecords.map(app => (
                                    <DashboardAppsRow
                                        key={app.id}
                                        app={app}
                                        onEdit={selected => {
                                            setModalMode('UPDATE');
                                            setEditingApp(selected);
                                            setShowAppModal(true);
                                        }}
                                        onDelete={setDeletingApp}
                                    />
                                ))}
                            </BaseTable>
                        )
                    }
                >
                    {showAppModal ? (
                        <DashboardAppModal
                            accountId={accountId}
                            show={showAppModal}
                            mode={modalMode}
                            selectedApp={editingApp}
                            onClose={() => setShowAppModal(false)}
                            onSaved={() => setReloadToken(token => token + 1)}
                        />
                    ) : null}

                    <DeleteModal
                        show={deletingApp !== null}
                        onClose={() => setDeletingApp(null)}
                        onConfirm={() => void confirmDeletion()}
                        title={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.DELETE.TITLE')}
                        message={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.DELETE.MESSAGE', {
                            appName: deletingApp?.title ?? '',
                        })}
                        confirmText={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.DELETE.CONFIRM_YES')}
                        rejectText={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.DELETE.CONFIRM_NO')}
                    />
                </SettingsLayout>
            </SettingsWrapper>
        </Dashboard>
    );
}
