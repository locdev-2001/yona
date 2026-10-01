import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import SettingsSubPageHeader from '../../SettingsSubPageHeader';
import ChannelFormField from './ChannelFormField';
import { ChannelFormError, GuideLinkButton, GuideStep, GuideSteps } from './ConnectGuide';
import { useCreateChannel } from './useCreateChannel';
import type { ChannelFormProps } from '../NewChannel';

const BOTFATHER_URL = 'https://t.me/BotFather';

// Hai bước: tạo bot ở BotFather, dán token. Máy chủ gọi getMe khi lưu — token sai
// thì báo ngay dưới form, hộp thư mang tên bot.
export default function TelegramChannelForm({ connection = null }: ChannelFormProps) {
    const [botToken, setBotToken] = useState('');
    const [tokenTouched, setTokenTouched] = useState(false);
    const { isCreating, errorMessage, createChannel } = useCreateChannel(
        t('INBOX_MGMT.ADD.TELEGRAM_CHANNEL.API.ERROR_MESSAGE'),
    );

    const tokenInvalid = !botToken.trim();

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setTokenTouched(true);
        if (tokenInvalid) return;

        void createChannel({ channel: { type: 'telegram', bot_token: botToken.trim() } });
    };

    return (
        <div className="h-full w-full p-6 col-span-6">
            <SettingsSubPageHeader
                headerTitle={t('INBOX_MGMT.CONNECT_GUIDE.TELEGRAM.TITLE')}
                headerContent={t('INBOX_MGMT.CONNECT_GUIDE.TELEGRAM.DESC')}
            />
            <GuideSteps>
                <GuideStep
                    index={1}
                    title={t('INBOX_MGMT.CONNECT_GUIDE.TELEGRAM.STEP_1_TITLE')}
                    description={t('INBOX_MGMT.CONNECT_GUIDE.TELEGRAM.STEP_1_DESC')}
                >
                    <GuideLinkButton
                        href={connection?.guide_url ?? BOTFATHER_URL}
                        label={t('INBOX_MGMT.CONNECT_GUIDE.TELEGRAM.OPEN_BOTFATHER')}
                    />
                </GuideStep>
                <GuideStep
                    index={2}
                    title={t('INBOX_MGMT.CONNECT_GUIDE.TELEGRAM.STEP_2_TITLE')}
                    description={t('INBOX_MGMT.CONNECT_GUIDE.TELEGRAM.STEP_2_DESC')}
                />
            </GuideSteps>
            <form className="flex flex-wrap flex-col mx-0 max-w-2xl" onSubmit={submit}>
                <ChannelFormField
                    label={t('INBOX_MGMT.CONNECT_GUIDE.TELEGRAM.TOKEN_LABEL')}
                    placeholder={t('INBOX_MGMT.CONNECT_GUIDE.TELEGRAM.TOKEN_PLACEHOLDER')}
                    errorMessage={t('INBOX_MGMT.CONNECT_GUIDE.REQUIRED')}
                    autoComplete="off"
                    value={botToken}
                    hasError={tokenTouched && tokenInvalid}
                    onChange={setBotToken}
                    onBlur={() => setTokenTouched(true)}
                />
                <ChannelFormError message={errorMessage} />

                <div className="w-full mt-4">
                    <Button
                        type="submit"
                        isLoading={isCreating}
                        solid
                        blue
                        label={isCreating ? t('INBOX_MGMT.CONNECT_GUIDE.CHECKING') : t('INBOX_MGMT.CONNECT_GUIDE.TELEGRAM.SUBMIT')}
                    />
                </div>
            </form>
        </div>
    );
}
