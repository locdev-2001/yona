import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { postJson, parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { fetchIntegrationApps, findIntegrationApp, useIntegrationApps } from 'dashboard/composables/useIntegrationApps';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import SettingsLayout from '../SettingsLayout';
import BaseSettingsHeader from '../BaseSettingsHeader';
import Integration from './Integration';
import SelectChannelWarning from './Slack/SelectChannelWarning';
import SlackIntegrationHelpText from './Slack/SlackIntegrationHelpText';
import type { DashboardPageProps } from '../../types';

// Port từ dashboard/routes/dashboard/settings/integrations/Slack.vue.
// `code` = query `?code=` mà Slack OAuth redirect về (routes/web.php truyền vào).
interface SlackPageProps {
    code?: string | null;
}

export default function SlackPage({ code }: SlackPageProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const { apps, isFetching } = useIntegrationApps(accountId);
    const integration = findIntegrationApp(apps, 'slack');

    const [isConnectingSlack, setIsConnectingSlack] = useState(false);
    const codeHandledRef = useRef(false);

    // Tương đương intializeSlackIntegration của bản gốc: đổi mã OAuth `code` lấy
    // hook Slack rồi xoá query khỏi URL để lần tải lại sau không gửi lại mã cũ.
    useEffect(() => {
        if (!code || codeHandledRef.current) return;
        codeHandledRef.current = true;

        setIsConnectingSlack(true);
        postJson(`/api/v1/accounts/${accountId}/integrations/slack`, { code })
            .then(() => fetchIntegrationApps(accountId, { force: true }))
            .catch(error => useAlert(parseApiErrorMessage(error) || t('INTEGRATION_SETTINGS.SLACK.UPDATE_ERROR')))
            .finally(() => {
                setIsConnectingSlack(false);
                window.history.replaceState(window.history.state, '', window.location.pathname);
            });
    }, [accountId, code]);

    const hooks = integration?.hooks ?? [];
    const areHooksAvailable = hooks.length > 0;
    const hook = hooks[0];
    const isIntegrationHookEnabled = hook?.status ?? false;
    const hasConnectedAChannel = Boolean(hook?.reference_id);

    const selectedChannelName = isIntegrationHookEnabled
        ? String(hook?.settings?.channel_name || 'customer-conversations')
        : t('INTEGRATION_SETTINGS.SLACK.HELP_TEXT.SELECTED');

    const integrationAction = integration?.enabled ? 'disconnect' : (integration?.action ?? undefined);

    return (
        <Dashboard>
            <SettingsWrapper>
                <SettingsLayout
                    isLoading={isFetching || isConnectingSlack}
                    header={
                        <BaseSettingsHeader
                            title={t('INTEGRATION_SETTINGS.SLACK.HEADER')}
                            featureName="slack_integration"
                            backButtonLabel={t('INTEGRATION_SETTINGS.HEADER')}
                        />
                    }
                    body={
                        <div className="space-y-5">
                            <Integration
                                accountId={accountId}
                                integrationId={integration?.id ?? 'slack'}
                                integrationName={integration?.name ?? ''}
                                integrationDescription={integration?.description ?? ''}
                                integrationEnabled={integration?.enabled ?? false}
                                integrationAction={integrationAction}
                                actionButtonText={t('INTEGRATION_SETTINGS.SLACK.DELETE')}
                                deleteConfirmationText={{
                                    title: t('INTEGRATION_SETTINGS.SLACK.DELETE_CONFIRMATION.TITLE'),
                                    message: t('INTEGRATION_SETTINGS.SLACK.DELETE_CONFIRMATION.MESSAGE'),
                                }}
                            />
                            {areHooksAvailable ? (
                                <div className="flex-1">
                                    {!isIntegrationHookEnabled ? (
                                        <SelectChannelWarning accountId={accountId} hasConnectedAChannel={hasConnectedAChannel} />
                                    ) : null}
                                    <SlackIntegrationHelpText selectedChannelName={selectedChannelName} />
                                </div>
                            ) : null}
                        </div>
                    }
                />
            </SettingsWrapper>
        </Dashboard>
    );
}
