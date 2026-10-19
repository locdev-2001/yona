import { useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { deleteJson, parseApiErrorMessage } from 'dashboard/helper/apiClient';
import {
    fetchIntegrationApps,
    findIntegrationApp,
    useIntegrationApps,
} from 'dashboard/composables/useIntegrationApps';
import type { IntegrationHook } from 'dashboard/composables/useIntegrationApps';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import SettingsLayout from '../SettingsLayout';
import BaseSettingsHeader from '../BaseSettingsHeader';
import Modal from 'dashboard/components/Modal';
import DeleteModal from 'dashboard/components/widgets/modal/DeleteModal';
import SingleIntegrationHooks from './SingleIntegrationHooks';
import MultipleIntegrationHooks from './MultipleIntegrationHooks';
import NewHook from './NewHook';
import type { DashboardPageProps } from '../../types';

// Port từ dashboard/routes/dashboard/settings/integrations/IntegrationHooks.vue
// (màn của route `settings/integrations/:integration_id`). ShowIntegration.vue
// cùng thư mục không nằm trên route nào nên không làm.
interface ShowIntegrationProps {
    integrationId: string;
}

export default function ShowIntegration({ integrationId }: ShowIntegrationProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const { apps, isFetching } = useIntegrationApps(accountId);
    const integration = findIntegrationApp(apps, integrationId);

    const [showAddHookModal, setShowAddHookModal] = useState(false);
    const [deletingHook, setDeletingHook] = useState<IntegrationHook | null>(null);

    const isHookTypeInbox = integration?.hook_type === 'inbox';
    const isIntegrationMultiple = Boolean(integration?.allow_multiple_hooks);

    const confirmDeletion = async () => {
        const hook = deletingHook;
        setDeletingHook(null);
        if (!hook) return;

        try {
            await deleteJson(`/api/v1/accounts/${accountId}/integrations/hooks/${hook.id}`);
            fetchIntegrationApps(accountId, { force: true });
            useAlert(t('INTEGRATION_APPS.DELETE.API.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('INTEGRATION_APPS.DELETE.API.ERROR_MESSAGE'));
        }
    };

    const deleteScope = isHookTypeInbox ? 'INBOX' : 'ACCOUNT';

    return (
        <Dashboard>
            <SettingsWrapper>
                <SettingsLayout
                    isLoading={isFetching}
                    header={
                        integration && !isIntegrationMultiple ? (
                            <BaseSettingsHeader
                                title={integration.name || ''}
                                featureName={integrationId}
                                backButtonLabel={t('INTEGRATION_SETTINGS.HEADER')}
                            />
                        ) : null
                    }
                    body={
                        integration ? (
                            <div className="w-full">
                                {isIntegrationMultiple ? (
                                    <MultipleIntegrationHooks
                                        integration={integration}
                                        showAddButton
                                        onAdd={() => setShowAddHookModal(true)}
                                        onDelete={setDeletingHook}
                                    />
                                ) : (
                                    <SingleIntegrationHooks
                                        integration={integration}
                                        onAdd={() => setShowAddHookModal(true)}
                                        onDelete={setDeletingHook}
                                    />
                                )}
                            </div>
                        ) : null
                    }
                >
                    <Modal show={showAddHookModal} onClose={() => setShowAddHookModal(false)}>
                        {integration ? (
                            <NewHook integration={integration} onClose={() => setShowAddHookModal(false)} />
                        ) : null}
                    </Modal>

                    <DeleteModal
                        show={deletingHook !== null}
                        onClose={() => setDeletingHook(null)}
                        onConfirm={() => void confirmDeletion()}
                        title={t(`INTEGRATION_APPS.DELETE.TITLE.${deleteScope}`)}
                        message={t(`INTEGRATION_APPS.DELETE.MESSAGE.${deleteScope}`)}
                        confirmText={t(`INTEGRATION_APPS.DELETE.CONFIRM_BUTTON_TEXT.${deleteScope}`)}
                        rejectText={t('INTEGRATION_APPS.DELETE.CANCEL_BUTTON_TEXT')}
                    />
                </SettingsLayout>
            </SettingsWrapper>
        </Dashboard>
    );
}
