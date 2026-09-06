import { useState } from 'react';
import DOMPurify from 'dompurify';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { useBranding } from 'shared/composables/useBranding';
import MessageFormatter from 'shared/helpers/MessageFormatter';
import { getJson, putJson, parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { fetchIntegrationApps } from 'dashboard/composables/useIntegrationApps';
import Button from 'dashboard/components-next/button/Button';

// Port từ dashboard/routes/dashboard/settings/integrations/Slack/SelectChannelWarning.vue
interface SlackChannel {
    id: string;
    name: string;
}

interface SelectChannelWarningProps {
    accountId: number;
    hasConnectedAChannel?: boolean;
}

export default function SelectChannelWarning({ accountId, hasConnectedAChannel = true }: SelectChannelWarningProps) {
    const { replaceInstallationName } = useBranding();

    const [availableChannels, setAvailableChannels] = useState<SlackChannel[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState('');
    const [isFetchingChannels, setIsFetchingChannels] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const errorDescription = !hasConnectedAChannel
        ? t('INTEGRATION_SETTINGS.SLACK.SELECT_CHANNEL.DESCRIPTION')
        : t('INTEGRATION_SETTINGS.SLACK.SELECT_CHANNEL.EXPIRED');
    const formattedErrorMessage = new MessageFormatter(replaceInstallationName(errorDescription), false).formattedMessage;

    const fetchChannels = async () => {
        setIsFetchingChannels(true);
        try {
            const response = await getJson<{ channels: SlackChannel[] }>(
                `/api/v1/accounts/${accountId}/integrations/slack/list_all_channels`,
            );
            const channels = [...(response?.channels ?? [])].sort((c1, c2) => c1.name.localeCompare(c2.name));
            setAvailableChannels(channels);
        } catch {
            useAlert(t('INTEGRATION_SETTINGS.SLACK.FAILED_TO_FETCH_CHANNELS'));
            setAvailableChannels([]);
        } finally {
            setIsFetchingChannels(false);
        }
    };

    const updateIntegration = async () => {
        setIsUpdating(true);
        try {
            await putJson(`/api/v1/accounts/${accountId}/integrations/slack`, { reference_id: selectedChannelId });
            fetchIntegrationApps(accountId, { force: true });
            useAlert(t('INTEGRATION_SETTINGS.SLACK.UPDATE_SUCCESS'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('INTEGRATION_SETTINGS.SLACK.UPDATE_ERROR'));
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="px-6 py-4 mb-4 outline outline-n-container outline-1 bg-n-card rounded-xl">
            <div className="flex">
                <div className="flex-shrink-0">
                    <div className="i-lucide-bell text-xl text-n-amber-11 mt-1" />
                </div>
                <div className="ml-3">
                    <p className="mb-1 text-heading-2 text-n-slate-12">
                        {t('INTEGRATION_SETTINGS.SLACK.SELECT_CHANNEL.ATTENTION_REQUIRED')}
                    </p>
                    <div className="mt-2 text-body-main text-n-slate-11 mb-3">
                        <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formattedErrorMessage) }} />
                    </div>
                </div>
            </div>
            {!hasConnectedAChannel ? (
                <div className="mb-2 mt-1 ml-8">
                    {!availableChannels.length ? (
                        <Button
                            amber
                            sm
                            isLoading={isFetchingChannels}
                            label={t('INTEGRATION_SETTINGS.SLACK.SELECT_CHANNEL.BUTTON_TEXT')}
                            onClick={() => void fetchChannels()}
                        />
                    ) : (
                        <div className="inline-flex">
                            <select
                                value={selectedChannelId}
                                onChange={event => setSelectedChannelId(event.target.value)}
                                className="h-8 py-1 mr-4 text-xs leading-4 border border-n-amber-10"
                            >
                                <option value="">{t('INTEGRATION_SETTINGS.SLACK.SELECT_CHANNEL.OPTION_LABEL')}</option>
                                {availableChannels.map(channel => (
                                    <option key={channel.id} value={channel.id}>
                                        #{channel.name}
                                    </option>
                                ))}
                            </select>
                            <Button
                                teal
                                sm
                                isLoading={isUpdating}
                                label={t('INTEGRATION_SETTINGS.SLACK.SELECT_CHANNEL.UPDATE')}
                                onClick={() => void updateIntegration()}
                            />
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
