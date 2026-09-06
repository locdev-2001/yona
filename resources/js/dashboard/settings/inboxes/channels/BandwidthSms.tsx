import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../../i18n';
import { startsWithPlus } from 'shared/helpers/Validators';
import Button from 'dashboard/components-next/button/Button';
import ChannelFormField from './ChannelFormField';
import { useCreateChannel } from './useCreateChannel';

// Port từ settings/inbox/channels/BandwidthSms.vue.
export default function BandwidthSmsChannelForm() {
    const [inboxName, setInboxName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [accountId, setAccountId] = useState('');
    const [applicationId, setApplicationId] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [touched, setTouched] = useState(false);
    const { isCreating, createChannel } = useCreateChannel(t('INBOX_MGMT.ADD.SMS.API.ERROR_MESSAGE'));

    const phoneNumberInvalid = !phoneNumber || !startsWithPlus(phoneNumber);
    const isInvalid =
        !inboxName || phoneNumberInvalid || !apiKey || !apiSecret || !applicationId || !accountId;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setTouched(true);
        if (isInvalid) return;

        void createChannel({
            name: inboxName.trim(),
            channel: {
                type: 'sms',
                phone_number: phoneNumber,
                provider_config: {
                    api_key: apiKey,
                    api_secret: apiSecret,
                    application_id: applicationId,
                    account_id: accountId,
                },
            },
        });
    };

    return (
        <form className="flex flex-wrap flex-col mx-0" onSubmit={submit}>
            <ChannelFormField
                label={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.INBOX_NAME.LABEL')}
                placeholder={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.INBOX_NAME.PLACEHOLDER')}
                errorMessage={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.INBOX_NAME.ERROR')}
                value={inboxName}
                hasError={touched && !inboxName}
                onChange={setInboxName}
                onBlur={() => setTouched(true)}
            />
            <ChannelFormField
                label={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.PHONE_NUMBER.LABEL')}
                placeholder={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.PHONE_NUMBER.PLACEHOLDER')}
                errorMessage={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.PHONE_NUMBER.ERROR')}
                value={phoneNumber}
                hasError={touched && phoneNumberInvalid}
                onChange={setPhoneNumber}
                onBlur={() => setTouched(true)}
            />
            <ChannelFormField
                label={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.ACCOUNT_ID.LABEL')}
                placeholder={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.ACCOUNT_ID.PLACEHOLDER')}
                errorMessage={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.ACCOUNT_ID.ERROR')}
                value={accountId}
                hasError={touched && !accountId}
                onChange={setAccountId}
                onBlur={() => setTouched(true)}
            />
            <ChannelFormField
                label={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.APPLICATION_ID.LABEL')}
                placeholder={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.APPLICATION_ID.PLACEHOLDER')}
                errorMessage={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.APPLICATION_ID.ERROR')}
                value={applicationId}
                hasError={touched && !applicationId}
                onChange={setApplicationId}
                onBlur={() => setTouched(true)}
            />
            <ChannelFormField
                label={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.API_KEY.LABEL')}
                placeholder={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.API_KEY.PLACEHOLDER')}
                errorMessage={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.API_KEY.ERROR')}
                value={apiKey}
                hasError={touched && !apiKey}
                onChange={setApiKey}
                onBlur={() => setTouched(true)}
            />
            <ChannelFormField
                label={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.API_SECRET.LABEL')}
                placeholder={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.API_SECRET.PLACEHOLDER')}
                errorMessage={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.API_SECRET.ERROR')}
                value={apiSecret}
                hasError={touched && !apiSecret}
                onChange={setApiSecret}
                onBlur={() => setTouched(true)}
            />

            <div className="w-full mt-4">
                <Button
                    type="submit"
                    isLoading={isCreating}
                    solid
                    blue
                    label={t('INBOX_MGMT.ADD.SMS.BANDWIDTH.SUBMIT_BUTTON')}
                />
            </div>
        </form>
    );
}
