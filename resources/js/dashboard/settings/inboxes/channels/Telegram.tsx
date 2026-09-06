import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import SettingsSubPageHeader from '../../SettingsSubPageHeader';
import ChannelFormField from './ChannelFormField';
import { useCreateChannel } from './useCreateChannel';

// Port từ settings/inbox/channels/Telegram.vue.
export default function TelegramChannelForm() {
    const [botToken, setBotToken] = useState('');
    const [tokenTouched, setTokenTouched] = useState(false);
    const { isCreating, createChannel } = useCreateChannel(
        t('INBOX_MGMT.ADD.TELEGRAM_CHANNEL.API.ERROR_MESSAGE'),
    );

    const tokenInvalid = !botToken;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setTokenTouched(true);
        if (tokenInvalid) return;

        void createChannel({ channel: { type: 'telegram', bot_token: botToken } });
    };

    return (
        <div className="h-full w-full p-6 col-span-6">
            <SettingsSubPageHeader
                headerTitle={t('INBOX_MGMT.ADD.TELEGRAM_CHANNEL.TITLE')}
                headerContent={t('INBOX_MGMT.ADD.TELEGRAM_CHANNEL.DESC')}
            />
            <form className="flex flex-wrap flex-col mx-0" onSubmit={submit}>
                <ChannelFormField
                    label={t('INBOX_MGMT.ADD.TELEGRAM_CHANNEL.BOT_TOKEN.LABEL')}
                    placeholder={t('INBOX_MGMT.ADD.TELEGRAM_CHANNEL.BOT_TOKEN.PLACEHOLDER')}
                    helpText={t('INBOX_MGMT.ADD.TELEGRAM_CHANNEL.BOT_TOKEN.SUBTITLE')}
                    value={botToken}
                    hasError={tokenTouched && tokenInvalid}
                    onChange={setBotToken}
                    onBlur={() => setTokenTouched(true)}
                />

                <div className="w-full mt-4">
                    <Button
                        type="submit"
                        isLoading={isCreating}
                        solid
                        blue
                        label={t('INBOX_MGMT.ADD.TELEGRAM_CHANNEL.SUBMIT_BUTTON')}
                    />
                </div>
            </form>
        </div>
    );
}
