import { useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { picoSearch } from '@chatwoot/pico-search';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { deleteWebhook, useWebhooks } from 'dashboard/composables/useWebhooks';
import type { Webhook } from 'dashboard/composables/useWebhooks';
import { findIntegrationApp, useIntegrationApps } from 'dashboard/composables/useIntegrationApps';
import { useBranding } from 'shared/composables/useBranding';
import Dashboard from '../../../Dashboard';
import SettingsWrapper from '../../SettingsWrapper';
import SettingsLayout from '../../SettingsLayout';
import BaseSettingsHeader from '../../BaseSettingsHeader';
import Button from 'dashboard/components-next/button/Button';
import Modal from 'dashboard/components/Modal';
import DeleteModal from 'dashboard/components/widgets/modal/DeleteModal';
import BaseTable from 'dashboard/components-next/table/BaseTable';
import WebhookRow from './WebhookRow';
import NewWebHook from './NewWebHook';
import EditWebHook from './EditWebHook';
import type { DashboardPageProps } from '../../../types';

// Port từ dashboard/routes/dashboard/settings/integrations/Webhooks/Index.vue.
// Nhánh paywall (WebhookPaywall.vue) chỉ chạy trên bản cloud — bản tự host
// luôn bật webhook nên không port.
export default function WebhooksIndex() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const { replaceInstallationName } = useBranding();

    const { webhooks, isFetching, reload } = useWebhooks(accountId);
    const { apps } = useIntegrationApps(accountId);
    const integration = findIntegrationApp(apps, 'webhook');

    const [searchQuery, setSearchQuery] = useState('');
    const [showAddPopup, setShowAddPopup] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
    const [deletingWebhook, setDeletingWebhook] = useState<Webhook | null>(null);

    const filteredWebhooks = useMemo(() => {
        const query = searchQuery.trim();
        if (!query) return webhooks;
        return picoSearch(webhooks, query, ['name', 'url']);
    }, [webhooks, searchQuery]);

    const confirmDeletion = async () => {
        const webhook = deletingWebhook;
        setDeletingWebhook(null);
        if (!webhook) return;

        try {
            await deleteWebhook(accountId, webhook.id);
            reload();
            useAlert(t('INTEGRATION_SETTINGS.WEBHOOK.DELETE.API.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('INTEGRATION_SETTINGS.WEBHOOK.DELETE.API.ERROR_MESSAGE'));
        }
    };

    const tableHeaders = [
        t('INTEGRATION_SETTINGS.WEBHOOK.LIST.TABLE_HEADER.WEBHOOK_ENDPOINT'),
        t('INTEGRATION_SETTINGS.WEBHOOK.LIST.TABLE_HEADER.ACTIONS'),
    ];

    return (
        <Dashboard>
            <SettingsWrapper>
                <SettingsLayout
                    isLoading={isFetching}
                    loadingMessage={t('INTEGRATION_SETTINGS.WEBHOOK.LOADING')}
                    noRecordsFound={!webhooks.length}
                    noRecordsMessage={t('INTEGRATION_SETTINGS.WEBHOOK.LIST.404')}
                    header={
                        integration?.name ? (
                            <BaseSettingsHeader
                                title={integration.name}
                                description={replaceInstallationName(integration.description)}
                                linkText={t('INTEGRATION_SETTINGS.WEBHOOK.LEARN_MORE')}
                                searchPlaceholder={t('INTEGRATION_SETTINGS.WEBHOOK.SEARCH_PLACEHOLDER')}
                                searchQuery={searchQuery}
                                onSearchQueryChange={setSearchQuery}
                                featureName="webhook"
                                backButtonLabel={t('INTEGRATION_SETTINGS.HEADER')}
                                count={
                                    webhooks.length ? (
                                        <span className="text-body-main text-n-slate-11">
                                            {t('INTEGRATION_SETTINGS.WEBHOOK.COUNT', { n: webhooks.length })}
                                        </span>
                                    ) : null
                                }
                                actions={
                                    <Button
                                        blue
                                        label={t('INTEGRATION_SETTINGS.WEBHOOK.HEADER_BTN_TXT')}
                                        size="sm"
                                        onClick={() => setShowAddPopup(true)}
                                    />
                                }
                            />
                        ) : null
                    }
                    body={
                        <BaseTable
                            headers={tableHeaders}
                            hasItems={filteredWebhooks.length > 0}
                            noDataMessage={searchQuery ? t('INTEGRATION_SETTINGS.WEBHOOK.NO_RESULTS') : ''}
                        >
                            {filteredWebhooks.map(webhook => (
                                <WebhookRow
                                    key={webhook.id}
                                    webhook={webhook}
                                    onEdit={setEditingWebhook}
                                    onDelete={setDeletingWebhook}
                                />
                            ))}
                        </BaseTable>
                    }
                >
                    <Modal show={showAddPopup} onClose={() => setShowAddPopup(false)}>
                        {showAddPopup ? (
                            <NewWebHook
                                accountId={accountId}
                                onClose={() => setShowAddPopup(false)}
                                onCreated={reload}
                            />
                        ) : null}
                    </Modal>

                    <Modal show={editingWebhook !== null} onClose={() => setEditingWebhook(null)}>
                        {editingWebhook ? (
                            <EditWebHook
                                accountId={accountId}
                                webhook={editingWebhook}
                                onClose={() => setEditingWebhook(null)}
                                onUpdated={() => {
                                    setEditingWebhook(null);
                                    reload();
                                }}
                            />
                        ) : null}
                    </Modal>

                    <DeleteModal
                        show={deletingWebhook !== null}
                        onClose={() => setDeletingWebhook(null)}
                        onConfirm={() => void confirmDeletion()}
                        title={t('INTEGRATION_SETTINGS.WEBHOOK.DELETE.CONFIRM.TITLE')}
                        message={t('INTEGRATION_SETTINGS.WEBHOOK.DELETE.CONFIRM.MESSAGE', {
                            webhookURL: deletingWebhook?.url ?? '',
                        })}
                        confirmText={t('INTEGRATION_SETTINGS.WEBHOOK.DELETE.CONFIRM.YES')}
                        rejectText={t('INTEGRATION_SETTINGS.WEBHOOK.DELETE.CONFIRM.NO')}
                    />
                </SettingsLayout>
            </SettingsWrapper>
        </Dashboard>
    );
}
