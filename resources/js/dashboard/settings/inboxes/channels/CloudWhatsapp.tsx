import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../../i18n';
import { isNumber, isPhoneE164OrEmpty } from 'shared/helpers/Validators';
import Button from 'dashboard/components-next/button/Button';
import ChannelFormField from './ChannelFormField';
import { useCreateChannel } from './useCreateChannel';

// Port từ settings/inbox/channels/CloudWhatsapp.vue (WhatsApp Cloud khai tay).
export default function CloudWhatsappChannelForm() {
    const [inboxName, setInboxName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneNumberId, setPhoneNumberId] = useState('');
    const [businessAccountId, setBusinessAccountId] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [touched, setTouched] = useState(false);
    const { isCreating, createChannel } = useCreateChannel(t('INBOX_MGMT.ADD.WHATSAPP.API.ERROR_MESSAGE'));

    const phoneNumberInvalid = !phoneNumber || !isPhoneE164OrEmpty(phoneNumber);
    const phoneNumberIdInvalid = !phoneNumberId || !isNumber(phoneNumberId);
    const businessAccountIdInvalid = !businessAccountId || !isNumber(businessAccountId);
    const isInvalid =
        !inboxName || phoneNumberInvalid || !apiKey || phoneNumberIdInvalid || businessAccountIdInvalid;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setTouched(true);
        if (isInvalid) return;

        void createChannel({
            name: inboxName.trim(),
            channel: {
                type: 'whatsapp',
                phone_number: phoneNumber,
                provider: 'whatsapp_cloud',
                provider_config: {
                    api_key: apiKey,
                    phone_number_id: phoneNumberId,
                    business_account_id: businessAccountId,
                },
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
                label={t('INBOX_MGMT.ADD.WHATSAPP.PHONE_NUMBER_ID.LABEL')}
                placeholder={t('INBOX_MGMT.ADD.WHATSAPP.PHONE_NUMBER_ID.PLACEHOLDER')}
                errorMessage={t('INBOX_MGMT.ADD.WHATSAPP.PHONE_NUMBER_ID.ERROR')}
                value={phoneNumberId}
                hasError={touched && phoneNumberIdInvalid}
                onChange={setPhoneNumberId}
                onBlur={() => setTouched(true)}
            />
            <ChannelFormField
                label={t('INBOX_MGMT.ADD.WHATSAPP.BUSINESS_ACCOUNT_ID.LABEL')}
                placeholder={t('INBOX_MGMT.ADD.WHATSAPP.BUSINESS_ACCOUNT_ID.PLACEHOLDER')}
                errorMessage={t('INBOX_MGMT.ADD.WHATSAPP.BUSINESS_ACCOUNT_ID.ERROR')}
                value={businessAccountId}
                hasError={touched && businessAccountIdInvalid}
                onChange={setBusinessAccountId}
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

            <div className="w-full mt-4">
                <Button
                    type="submit"
                    disabled={isCreating}
                    isLoading={isCreating}
                    solid
                    blue
                    label={t('INBOX_MGMT.ADD.WHATSAPP.SUBMIT_BUTTON')}
                />
            </div>
        </form>
    );
}
