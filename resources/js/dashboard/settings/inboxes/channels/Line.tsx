import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import SettingsSubPageHeader from '../../SettingsSubPageHeader';
import ChannelFormField from './ChannelFormField';
import { useCreateChannel } from './useCreateChannel';

// Port từ settings/inbox/channels/Line.vue.
export default function LineChannelForm() {
    const [channelName, setChannelName] = useState('');
    const [lineChannelId, setLineChannelId] = useState('');
    const [lineChannelSecret, setLineChannelSecret] = useState('');
    const [lineChannelToken, setLineChannelToken] = useState('');
    const [touched, setTouched] = useState(false);
    const { isCreating, createChannel } = useCreateChannel(t('INBOX_MGMT.ADD.LINE_CHANNEL.API.ERROR_MESSAGE'));

    const isInvalid = !channelName || !lineChannelId || !lineChannelSecret || !lineChannelToken;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setTouched(true);
        if (isInvalid) return;

        void createChannel({
            name: channelName.trim(),
            channel: {
                type: 'line',
                line_channel_id: lineChannelId,
                line_channel_secret: lineChannelSecret,
                line_channel_token: lineChannelToken,
            },
        });
    };

    return (
        <div className="h-full w-full p-6 col-span-6">
            <SettingsSubPageHeader
                headerTitle={t('INBOX_MGMT.ADD.LINE_CHANNEL.TITLE')}
                headerContent={t('INBOX_MGMT.ADD.LINE_CHANNEL.DESC')}
            />
            <form className="flex flex-wrap flex-col mx-0" onSubmit={submit}>
                <ChannelFormField
                    label={t('INBOX_MGMT.ADD.LINE_CHANNEL.CHANNEL_NAME.LABEL')}
                    placeholder={t('INBOX_MGMT.ADD.LINE_CHANNEL.CHANNEL_NAME.PLACEHOLDER')}
                    errorMessage={t('INBOX_MGMT.ADD.LINE_CHANNEL.CHANNEL_NAME.ERROR')}
                    value={channelName}
                    hasError={touched && !channelName}
                    onChange={setChannelName}
                    onBlur={() => setTouched(true)}
                />
                <ChannelFormField
                    label={t('INBOX_MGMT.ADD.LINE_CHANNEL.LINE_CHANNEL_ID.LABEL')}
                    placeholder={t('INBOX_MGMT.ADD.LINE_CHANNEL.LINE_CHANNEL_ID.PLACEHOLDER')}
                    value={lineChannelId}
                    hasError={touched && !lineChannelId}
                    onChange={setLineChannelId}
                    onBlur={() => setTouched(true)}
                />
                <ChannelFormField
                    label={t('INBOX_MGMT.ADD.LINE_CHANNEL.LINE_CHANNEL_SECRET.LABEL')}
                    placeholder={t('INBOX_MGMT.ADD.LINE_CHANNEL.LINE_CHANNEL_SECRET.PLACEHOLDER')}
                    value={lineChannelSecret}
                    hasError={touched && !lineChannelSecret}
                    onChange={setLineChannelSecret}
                    onBlur={() => setTouched(true)}
                />
                <ChannelFormField
                    label={t('INBOX_MGMT.ADD.LINE_CHANNEL.LINE_CHANNEL_TOKEN.LABEL')}
                    placeholder={t('INBOX_MGMT.ADD.LINE_CHANNEL.LINE_CHANNEL_TOKEN.PLACEHOLDER')}
                    value={lineChannelToken}
                    hasError={touched && !lineChannelToken}
                    onChange={setLineChannelToken}
                    onBlur={() => setTouched(true)}
                />

                <div className="w-full mt-4">
                    <Button
                        type="submit"
                        isLoading={isCreating}
                        solid
                        blue
                        label={t('INBOX_MGMT.ADD.LINE_CHANNEL.SUBMIT_BUTTON')}
                    />
                </div>
            </form>
        </div>
    );
}
