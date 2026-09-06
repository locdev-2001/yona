import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import type { FormEvent, ReactElement } from 'react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../Dashboard';
import SettingsContent from '../SettingsContent';
import SettingsSubPageHeader from '../SettingsSubPageHeader';
import WizardLayout, { INBOX_WIZARD_ROUTES } from './WizardLayout';
import WebsiteChannelForm from './channels/Website';
import EmailChannelForm from './channels/Email';
import Button from 'dashboard/components-next/button/Button';
import type { DashboardPageProps } from '../../types';
import type { Inbox } from './types';

// Port từ settings/inbox/ChannelFactory.vue + channels/Api.vue + channels/Website.vue
// — bước 2. Kênh khác vào map CHANNEL_VIEWS khi port (như ChannelFactory).
interface NewChannelProps {
    channelName: string;
}

function ApiChannelForm() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [channelName, setChannelName] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [nameTouched, setNameTouched] = useState(false);
    const [isCreating, setCreating] = useState(false);

    const nameInvalid = !channelName.trim();
    // shouldBeWebhookUrl của bản gốc: rỗng hợp lệ, có giá trị phải bắt đầu http.
    const webhookUrlInvalid = webhookUrl ? !webhookUrl.startsWith('http') : false;

    const createChannel = async (event: FormEvent) => {
        event.preventDefault();
        setNameTouched(true);
        if (nameInvalid || webhookUrlInvalid) return;

        setCreating(true);
        try {
            const inbox = await postJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes`, {
                name: channelName.trim(),
                channel: { type: 'api', webhook_url: webhookUrl },
            });
            window.location.replace(accountScopedUrl(accountId, `settings/inboxes/new/${inbox.id}/agents`));
        } catch (error) {
            setCreating(false);
            useAlert(parseApiErrorMessage(error) || t('INBOX_MGMT.ADD.API_CHANNEL.API.ERROR_MESSAGE'));
        }
    };

    return (
        <div className="h-full w-full p-6 col-span-6">
            <SettingsSubPageHeader
                headerTitle={t('INBOX_MGMT.ADD.API_CHANNEL.TITLE')}
                headerContent={t('INBOX_MGMT.ADD.API_CHANNEL.DESC')}
            />
            <form className="flex flex-wrap flex-col mx-0" onSubmit={event => void createChannel(event)}>
                <div className="flex-shrink-0 flex-grow-0">
                    <label className={nameTouched && nameInvalid ? 'error' : ''}>
                        {t('INBOX_MGMT.ADD.API_CHANNEL.CHANNEL_NAME.LABEL')}
                        <input
                            type="text"
                            value={channelName}
                            placeholder={t('INBOX_MGMT.ADD.API_CHANNEL.CHANNEL_NAME.PLACEHOLDER')}
                            onChange={event => setChannelName(event.target.value)}
                            onBlur={() => setNameTouched(true)}
                        />
                        {nameTouched && nameInvalid ? (
                            <span className="message">{t('INBOX_MGMT.ADD.API_CHANNEL.CHANNEL_NAME.ERROR')}</span>
                        ) : null}
                    </label>
                </div>

                <div className="flex-shrink-0 flex-grow-0">
                    <label className={webhookUrlInvalid ? 'error' : ''}>
                        {t('INBOX_MGMT.ADD.API_CHANNEL.WEBHOOK_URL.LABEL')}
                        <input
                            type="text"
                            value={webhookUrl}
                            placeholder={t('INBOX_MGMT.ADD.API_CHANNEL.WEBHOOK_URL.PLACEHOLDER')}
                            onChange={event => setWebhookUrl(event.target.value)}
                        />
                    </label>
                    <p className="help-text">{t('INBOX_MGMT.ADD.API_CHANNEL.WEBHOOK_URL.SUBTITLE')}</p>
                </div>

                <div className="w-full mt-4">
                    <Button
                        type="submit"
                        isLoading={isCreating}
                        solid
                        blue
                        label={t('INBOX_MGMT.ADD.API_CHANNEL.SUBMIT_BUTTON')}
                    />
                </div>
            </form>
        </div>
    );
}

const CHANNEL_VIEWS: Record<string, () => ReactElement> = {
    api: ApiChannelForm,
    website: WebsiteChannelForm,
    email: EmailChannelForm,
};

export default function NewChannel({ channelName }: NewChannelProps) {
    const ChannelComponent = CHANNEL_VIEWS[channelName];

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('INBOX_MGMT.HEADER')} showBackButton>
                <WizardLayout activeRoute={INBOX_WIZARD_ROUTES.INBOX}>
                    {ChannelComponent ? <ChannelComponent /> : <div />}
                </WizardLayout>
            </SettingsContent>
        </Dashboard>
    );
}
