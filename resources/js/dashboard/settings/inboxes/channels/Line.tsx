import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import SettingsSubPageHeader from '../../SettingsSubPageHeader';
import ChannelFormField from './ChannelFormField';
import { ChannelFormError, GuideLinkButton, GuideStep, GuideSteps } from './ConnectGuide';
import { useCreateChannel } from './useCreateChannel';
import type { ChannelFormProps } from '../NewChannel';

const LINE_CONSOLE_URL = 'https://developers.line.biz/console/';

// Hướng dẫn từng bước bằng chữ, chỉ hai ô: ID kênh máy chủ lấy từ token khi kiểm,
// tên hộp thư lấy từ tên bot.
export default function LineChannelForm({ connection = null }: ChannelFormProps) {
    const [lineChannelSecret, setLineChannelSecret] = useState('');
    const [lineChannelToken, setLineChannelToken] = useState('');
    const [touched, setTouched] = useState(false);
    const { isCreating, errorMessage, createChannel } = useCreateChannel(
        t('INBOX_MGMT.ADD.LINE_CHANNEL.API.ERROR_MESSAGE'),
    );

    const isInvalid = !lineChannelSecret.trim() || !lineChannelToken.trim();

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setTouched(true);
        if (isInvalid) return;

        void createChannel({
            channel: {
                type: 'line',
                line_channel_secret: lineChannelSecret.trim(),
                line_channel_token: lineChannelToken.trim(),
            },
        });
    };

    return (
        <div className="h-full w-full p-6 col-span-6">
            <SettingsSubPageHeader
                headerTitle={t('INBOX_MGMT.CONNECT_GUIDE.LINE.TITLE')}
                headerContent={t('INBOX_MGMT.CONNECT_GUIDE.LINE.DESC')}
            />
            <GuideSteps>
                <GuideStep
                    index={1}
                    title={t('INBOX_MGMT.CONNECT_GUIDE.LINE.STEP_1_TITLE')}
                    description={t('INBOX_MGMT.CONNECT_GUIDE.LINE.STEP_1_DESC')}
                >
                    <GuideLinkButton
                        href={connection?.guide_url ?? LINE_CONSOLE_URL}
                        label={t('INBOX_MGMT.CONNECT_GUIDE.LINE.OPEN_CONSOLE')}
                    />
                </GuideStep>
                <GuideStep
                    index={2}
                    title={t('INBOX_MGMT.CONNECT_GUIDE.LINE.STEP_2_TITLE')}
                    description={t('INBOX_MGMT.CONNECT_GUIDE.LINE.STEP_2_DESC')}
                />
                <GuideStep
                    index={3}
                    title={t('INBOX_MGMT.CONNECT_GUIDE.LINE.STEP_3_TITLE')}
                    description={t('INBOX_MGMT.CONNECT_GUIDE.LINE.STEP_3_DESC')}
                />
                <GuideStep
                    index={4}
                    title={t('INBOX_MGMT.CONNECT_GUIDE.LINE.STEP_4_TITLE')}
                    description={t('INBOX_MGMT.CONNECT_GUIDE.LINE.STEP_4_DESC')}
                />
            </GuideSteps>
            <form className="flex flex-wrap flex-col mx-0 max-w-2xl" onSubmit={submit}>
                <ChannelFormField
                    label={t('INBOX_MGMT.CONNECT_GUIDE.LINE.SECRET_LABEL')}
                    errorMessage={t('INBOX_MGMT.CONNECT_GUIDE.REQUIRED')}
                    autoComplete="off"
                    value={lineChannelSecret}
                    hasError={touched && !lineChannelSecret.trim()}
                    onChange={setLineChannelSecret}
                    onBlur={() => setTouched(true)}
                />
                <ChannelFormField
                    label={t('INBOX_MGMT.CONNECT_GUIDE.LINE.TOKEN_LABEL')}
                    errorMessage={t('INBOX_MGMT.CONNECT_GUIDE.REQUIRED')}
                    autoComplete="off"
                    value={lineChannelToken}
                    hasError={touched && !lineChannelToken.trim()}
                    onChange={setLineChannelToken}
                    onBlur={() => setTouched(true)}
                />
                <ChannelFormError message={errorMessage} />

                <div className="w-full mt-4">
                    <Button
                        type="submit"
                        isLoading={isCreating}
                        solid
                        blue
                        label={isCreating ? t('INBOX_MGMT.CONNECT_GUIDE.CHECKING') : t('INBOX_MGMT.CONNECT_GUIDE.LINE.SUBMIT')}
                    />
                </div>
            </form>
        </div>
    );
}
