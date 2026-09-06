import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../../i18n';
import { isPhoneE164OrEmpty } from 'shared/helpers/Validators';
import Button from 'dashboard/components-next/button/Button';
import ChannelFormField from './ChannelFormField';
import { useCreateChannel } from './useCreateChannel';

// Port từ settings/inbox/channels/360DialogWhatsapp.vue.
export default function ThreeSixtyDialogWhatsappChannelForm() {
    const [inboxName, setInboxName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [touched, setTouched] = useState(false);
    const { isCreating, createChannel } = useCreateChannel(t('INBOX_MGMT.ADD.WHATSAPP.API.ERROR_MESSAGE'));

    const phoneNumberInvalid = !phoneNumber || !isPhoneE164OrEmpty(phoneNumber);
    const isInvalid = !inboxName || phoneNumberInvalid || !apiKey;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setTouched(true);
        if (isInvalid) return;

        void createChannel({
            name: inboxName.trim(),
            channel: {
                type: 'whatsapp',
                phone_number: phoneNumber,
                provider_config: { api_key: apiKey },
            },
        });
    };

    return (
        <form className="flex flex-wrap flex-col mx-0" onSubmit={submit}>
            <ChannelFormField
                label={t('INBOX_MGMT.ADD.WHATSAPP.INBOX_NAME.LABEL')}
                placeholder={t('INBOX_MGMT.ADD.WHATSAPP.INBOX_NAME.PLACEHOLDER')}
                errorMessage={t('INBOX_MGMT.ADD.WHATSAPP.INBOX_NAME.ERROR')}
                value={inboxName}
                hasError={touched && !inboxName}
                onChange={setInboxName}
                onBlur={() => setTouched(true)}
            />
            <ChannelFormField
                label={t('INBOX_MGMT.ADD.WHATSAPP.PHONE_NUMBER.LABEL')}
                placeholder={t('INBOX_MGMT.ADD.WHATSAPP.PHONE_NUMBER.PLACEHOLDER')}
                errorMessage={t('INBOX_MGMT.ADD.WHATSAPP.PHONE_NUMBER.ERROR')}
                value={phoneNumber}
                hasError={touched && phoneNumberInvalid}
                onChange={setPhoneNumber}
                onBlur={() => setTouched(true)}
            />
            <ChannelFormField
                label={t('INBOX_MGMT.ADD.WHATSAPP.API_KEY.LABEL')}
                placeholder={t('INBOX_MGMT.ADD.WHATSAPP.API_KEY.PLACEHOLDER')}
                errorMessage={t('INBOX_MGMT.ADD.WHATSAPP.API_KEY.ERROR')}
                value={apiKey}
                hasError={touched && !apiKey}
                onChange={setApiKey}
                onBlur={() => setTouched(true)}
            />

            <div className="w-full">
                <Button type="submit" isLoading={isCreating} label={t('INBOX_MGMT.ADD.WHATSAPP.SUBMIT_BUTTON')} />
            </div>
        </form>
    );
}
