import { useState } from 'react';
import type { FormEvent } from 'react';
import { usePage } from '@inertiajs/react';
import { ICONS } from 'dashboard/icons';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import ChannelSelector from 'dashboard/components/ChannelSelector';
import SettingsSubPageHeader from '../../SettingsSubPageHeader';
import Button from 'dashboard/components-next/button/Button';
import type { DashboardPageProps } from '../../../types';
import type { Inbox } from '../types';

// Port từ settings/inbox/channels/Email.vue + emailChannels/ForwardToOption.vue.
// Nhánh Microsoft/Google là OAuth (chưa làm): thẻ chỉ hiện khi nhà cung cấp đã bật.
const EMAIL_PROVIDERS = {
    MICROSOFT: 'microsoft',
    GOOGLE: 'google',
    OTHER: 'other_provider',
} as const;

type EmailProvider = (typeof EMAIL_PROVIDERS)[keyof typeof EMAIL_PROVIDERS];

interface ProviderCard {
    key: EmailProvider;
    title: string;
    description: string;
    icon: string;
    isEnabled: boolean;
}

// email của @vuelidate/validators — cùng biểu thức, dùng lại cho ô địa chỉ.
const EMAIL_PATTERN =
    /^(?:[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[A-Za-z0-9-]*[A-Za-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;

function ForwardToOption() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [channelName, setChannelName] = useState('');
    const [email, setEmail] = useState('');
    const [nameTouched, setNameTouched] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);
    const [isCreating, setCreating] = useState(false);

    const nameInvalid = !channelName.trim();
    const emailInvalid = !email || !EMAIL_PATTERN.test(email);

    const createChannel = async (event: FormEvent) => {
        event.preventDefault();
        setNameTouched(true);
        setEmailTouched(true);
        if (nameInvalid || emailInvalid) return;

        setCreating(true);
        try {
            const inbox = await postJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes`, {
                name: channelName.trim(),
                channel: { type: 'email', email },
            });
            window.location.replace(accountScopedUrl(accountId, `settings/inboxes/new/${inbox.id}/agents`));
        } catch (error) {
            setCreating(false);
            useAlert(parseApiErrorMessage(error) || t('INBOX_MGMT.ADD.EMAIL_CHANNEL.API.ERROR_MESSAGE'));
        }
    };

    return (
        <div className="h-full w-full p-6 col-span-6">
            <SettingsSubPageHeader
                headerTitle={t('INBOX_MGMT.ADD.EMAIL_CHANNEL.TITLE')}
                headerContent={t('INBOX_MGMT.ADD.EMAIL_CHANNEL.DESC')}
            />
            <form className="flex flex-wrap flex-col mx-0" onSubmit={event => void createChannel(event)}>
                <div className="flex-shrink-0 flex-grow-0">
                    <label className={nameTouched && nameInvalid ? 'error' : ''}>
                        {t('INBOX_MGMT.ADD.EMAIL_CHANNEL.CHANNEL_NAME.LABEL')}
                        <input
                            type="text"
                            value={channelName}
                            placeholder={t('INBOX_MGMT.ADD.EMAIL_CHANNEL.CHANNEL_NAME.PLACEHOLDER')}
                            onChange={event => setChannelName(event.target.value)}
                            onBlur={() => setNameTouched(true)}
                        />
                        {nameTouched && nameInvalid ? (
                            <span className="message">{t('INBOX_MGMT.ADD.EMAIL_CHANNEL.CHANNEL_NAME.ERROR')}</span>
                        ) : null}
                    </label>
                </div>

                <div className="flex-shrink-0 flex-grow-0 mb-4">
                    <label className={emailTouched && emailInvalid ? 'error' : ''}>
                        {t('INBOX_MGMT.ADD.EMAIL_CHANNEL.EMAIL.LABEL')}
                        <input
                            type="text"
                            value={email}
                            placeholder={t('INBOX_MGMT.ADD.EMAIL_CHANNEL.EMAIL.PLACEHOLDER')}
                            onChange={event => setEmail(event.target.value)}
                            onBlur={() => setEmailTouched(true)}
                        />
                        <p className="help-text">{t('INBOX_MGMT.ADD.EMAIL_CHANNEL.EMAIL.SUBTITLE')}</p>
                    </label>
                </div>

                <div className="w-full mt-4">
                    <Button
                        type="submit"
                        isLoading={isCreating}
                        solid
                        blue
                        label={t('INBOX_MGMT.ADD.EMAIL_CHANNEL.SUBMIT_BUTTON')}
                    />
                </div>
            </form>
        </div>
    );
}

export default function EmailChannelForm() {
    const { globalConfig } = usePage<DashboardPageProps>().props;
    const [provider, setProvider] = useState<EmailProvider | ''>('');

    // Chỉ hiện nhà cung cấp đang bật (chưa có OAuth nên chỉ còn "Other providers").
    const providerList: ProviderCard[] = (
        [
            {
                key: EMAIL_PROVIDERS.MICROSOFT,
                title: t('INBOX_MGMT.EMAIL_PROVIDERS.MICROSOFT.TITLE'),
                description: t('INBOX_MGMT.EMAIL_PROVIDERS.MICROSOFT.DESCRIPTION'),
                icon: 'i-yona-outlook',
                isEnabled: false,
            },
            {
                key: EMAIL_PROVIDERS.GOOGLE,
                title: t('INBOX_MGMT.EMAIL_PROVIDERS.GOOGLE.TITLE'),
                description: t('INBOX_MGMT.EMAIL_PROVIDERS.GOOGLE.DESCRIPTION'),
                icon: 'i-yona-gmail',
                isEnabled: false,
            },
            {
                key: EMAIL_PROVIDERS.OTHER,
                title: t('INBOX_MGMT.EMAIL_PROVIDERS.OTHER_PROVIDERS.TITLE'),
                description: t('INBOX_MGMT.EMAIL_PROVIDERS.OTHER_PROVIDERS.DESCRIPTION'),
                icon: ICONS.channelEmail,
                isEnabled: true,
            },
        ] as ProviderCard[]
    ).filter(candidate => candidate.isEnabled);

    if (provider === EMAIL_PROVIDERS.OTHER) return <ForwardToOption />;
    if (provider) return <div />;

    return (
        <div className="h-full w-full p-6 col-span-6">
            <SettingsSubPageHeader
                className="max-w-4xl"
                headerTitle={t('INBOX_MGMT.ADD.EMAIL_PROVIDER.TITLE')}
                headerContent={t('INBOX_MGMT.ADD.EMAIL_PROVIDER.DESCRIPTION')}
            />
            <div className="grid max-w-3xl grid-cols-4 gap-6 mx-0 mt-6">
                {providerList.map(candidate => (
                    <ChannelSelector
                        key={candidate.key}
                        title={candidate.title}
                        description={candidate.description}
                        icon={candidate.icon}
                        disabled={!candidate.isEnabled}
                        onClick={() => {
                            if (candidate.isEnabled) setProvider(candidate.key);
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
