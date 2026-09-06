import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { fetchInboxAgentBot, setInboxAgentBot, useAgentBots } from 'dashboard/composables/useAgentBots';
import LoadingState from 'dashboard/components/widgets/LoadingState';
import SettingsFieldSection from 'dashboard/components-next/Settings/SettingsFieldSection';
import Button from 'dashboard/components-next/button/Button';
import SelectInput from 'dashboard/components-next/select/Select';
import type { Inbox } from '../types';
import type { DashboardPageProps } from '../../../types';

// Port từ dashboard/routes/dashboard/settings/inbox/components/BotConfiguration.vue.
interface BotConfigurationPageProps {
    inbox: Inbox;
}

export default function BotConfigurationPage({ inbox }: BotConfigurationPageProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const { bots, isFetching } = useAgentBots(accountId);
    const [selectedAgentBotId, setSelectedAgentBotId] = useState('');
    const [isFetchingAgentBot, setFetchingAgentBot] = useState(true);
    const [isSettingAgentBot, setSettingAgentBot] = useState(false);
    const [isDisconnecting, setDisconnecting] = useState(false);

    useEffect(() => {
        setFetchingAgentBot(true);
        void fetchInboxAgentBot(accountId, inbox.id)
            .then(bot => setSelectedAgentBotId(bot ? String(bot.id) : ''))
            .catch(() => undefined)
            .finally(() => setFetchingAgentBot(false));
    }, [accountId, inbox.id]);

    const updateActiveAgentBot = async (event: FormEvent) => {
        event.preventDefault();
        setSettingAgentBot(true);
        try {
            await setInboxAgentBot(accountId, inbox.id, selectedAgentBotId ? Number(selectedAgentBotId) : null);
            useAlert(t('AGENT_BOTS.BOT_CONFIGURATION.SUCCESS_MESSAGE'));
        } catch {
            useAlert(t('AGENT_BOTS.BOT_CONFIGURATION.ERROR_MESSAGE'));
        } finally {
            setSettingAgentBot(false);
        }
    };

    const disconnectBot = async () => {
        setDisconnecting(true);
        try {
            await setInboxAgentBot(accountId, inbox.id, null);
            setSelectedAgentBotId('');
            useAlert(t('AGENT_BOTS.BOT_CONFIGURATION.DISCONNECTED_SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(
                parseApiErrorMessage(error) || t('AGENT_BOTS.BOT_CONFIGURATION.DISCONNECTED_ERROR_MESSAGE'),
            );
        } finally {
            setDisconnecting(false);
        }
    };

    if (isFetching || isFetchingAgentBot) {
        return (
            <div className="mx-6 max-w-4xl">
                <LoadingState />
            </div>
        );
    }

    return (
        <div className="mx-6 max-w-4xl">
            <form onSubmit={event => void updateActiveAgentBot(event)}>
                <SettingsFieldSection
                    label={t('AGENT_BOTS.BOT_CONFIGURATION.TITLE')}
                    helpText={t('AGENT_BOTS.BOT_CONFIGURATION.DESC')}
                    className="[&>div]:!items-start"
                    extra={
                        <div className="grid grid-cols-1 lg:grid-cols-8 mt-3">
                            <div className="col-span-1 lg:col-span-2 invisible" />
                            <div className="col-span-1 lg:col-span-6 flex gap-2 mx-1">
                                <Button
                                    type="submit"
                                    label={t('AGENT_BOTS.BOT_CONFIGURATION.SUBMIT')}
                                    isLoading={isSettingAgentBot}
                                />
                                <Button
                                    type="button"
                                    disabled={!selectedAgentBotId}
                                    isLoading={isDisconnecting}
                                    faded
                                    ruby
                                    label={t('AGENT_BOTS.BOT_CONFIGURATION.DISCONNECT')}
                                    onClick={() => void disconnectBot()}
                                />
                            </div>
                        </div>
                    }
                >
                    <SelectInput
                        value={selectedAgentBotId}
                        placeholder={t('AGENT_BOTS.BOT_CONFIGURATION.SELECT_PLACEHOLDER')}
                        options={bots.map(bot => ({ value: String(bot.id), label: bot.name }))}
                        onChange={setSelectedAgentBotId}
                    />
                </SettingsFieldSection>
            </form>
        </div>
    );
}
