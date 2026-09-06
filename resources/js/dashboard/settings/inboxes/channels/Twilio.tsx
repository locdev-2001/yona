import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../../i18n';
import { isPhoneE164OrEmpty } from 'shared/helpers/Validators';
import Button from 'dashboard/components-next/button/Button';
import ChannelFormField from './ChannelFormField';
import { useCreateChannel } from './useCreateChannel';
import './twilio.scss';

// Port từ settings/inbox/channels/Twilio.vue — dùng chung cho SMS và WhatsApp
// (prop `type` = medium).
interface TwilioChannelFormProps {
    type: 'sms' | 'whatsapp';
}

export default function TwilioChannelForm({ type }: TwilioChannelFormProps) {
    const [channelName, setChannelName] = useState('');
    const [accountSID, setAccountSID] = useState('');
    const [apiKeySID, setApiKeySID] = useState('');
    const [authToken, setAuthToken] = useState('');
    const [messagingServiceSID, setMessagingServiceSID] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [useMessagingService, setUseMessagingService] = useState(false);
    const [useAPIKey, setUseAPIKey] = useState(false);
    const [touched, setTouched] = useState(false);
    const { isCreating, createChannel } = useCreateChannel(t('INBOX_MGMT.ADD.TWILIO.API.ERROR_MESSAGE'));

    // validations() của bản gốc: có số điện thoại thì số phải đúng E.164,
    // không có thì bắt buộc messaging service.
    const phoneNumberInvalid = phoneNumber ? !isPhoneE164OrEmpty(phoneNumber) : false;
    const messagingServiceInvalid = phoneNumber ? false : !messagingServiceSID;
    const isInvalid =
        !channelName ||
        !authToken ||
        !accountSID ||
        phoneNumberInvalid ||
        messagingServiceInvalid ||
        (useAPIKey && !apiKeySID);

    const authTokenKey = useAPIKey ? 'API_KEY_SECRET' : 'AUTH_TOKEN';

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setTouched(true);
        if (isInvalid) return;

        void createChannel({
            name: channelName.trim(),
            channel: {
                type: 'twilio',
                medium: type,
                account_sid: accountSID,
                api_key_sid: apiKeySID,
                auth_token: authToken,
                messaging_service_sid: messagingServiceSID,
                phone_number: messagingServiceSID ? null : `+${phoneNumber.replace(/\D/g, '')}`,
            },
        });
    };

    return (
        <form className="flex flex-wrap flex-col mx-0" onSubmit={submit}>
            <ChannelFormField
                label={t('INBOX_MGMT.ADD.TWILIO.CHANNEL_NAME.LABEL')}
                placeholder={t('INBOX_MGMT.ADD.TWILIO.CHANNEL_NAME.PLACEHOLDER')}
                errorMessage={t('INBOX_MGMT.ADD.TWILIO.CHANNEL_NAME.ERROR')}
                value={channelName}
                hasError={touched && !channelName}
                onChange={setChannelName}
                onBlur={() => setTouched(true)}
            />

            <div className="flex-shrink-0 flex-grow-0">
                {useMessagingService ? (
                    <label className={touched && messagingServiceInvalid ? 'error' : ''}>
                        {t('INBOX_MGMT.ADD.TWILIO.MESSAGING_SERVICE_SID.LABEL')}
                        <input
                            type="text"
                            value={messagingServiceSID}
                            placeholder={t('INBOX_MGMT.ADD.TWILIO.MESSAGING_SERVICE_SID.PLACEHOLDER')}
                            onChange={event => setMessagingServiceSID(event.target.value)}
                            onBlur={() => setTouched(true)}
                        />
                        {touched && messagingServiceInvalid ? (
                            <span className="message">
                                {t('INBOX_MGMT.ADD.TWILIO.MESSAGING_SERVICE_SID.ERROR')}
                            </span>
                        ) : null}
                    </label>
                ) : null}
            </div>

            {!useMessagingService ? (
                <ChannelFormField
                    label={t('INBOX_MGMT.ADD.TWILIO.PHONE_NUMBER.LABEL')}
                    placeholder={t('INBOX_MGMT.ADD.TWILIO.PHONE_NUMBER.PLACEHOLDER')}
                    errorMessage={t('INBOX_MGMT.ADD.TWILIO.PHONE_NUMBER.ERROR')}
                    value={phoneNumber}
                    hasError={touched && (phoneNumberInvalid || messagingServiceInvalid)}
                    onChange={setPhoneNumber}
                    onBlur={() => setTouched(true)}
                />
            ) : null}

            <div className="max-w-[65%] w-full messagingServiceHelptext">
                <label htmlFor="useMessagingService">
                    <input
                        id="useMessagingService"
                        type="checkbox"
                        className="checkbox"
                        checked={useMessagingService}
                        onChange={event => setUseMessagingService(event.target.checked)}
                    />{' '}
                    {t('INBOX_MGMT.ADD.TWILIO.MESSAGING_SERVICE_SID.USE_MESSAGING_SERVICE')}
                </label>
            </div>

            <ChannelFormField
                label={t('INBOX_MGMT.ADD.TWILIO.ACCOUNT_SID.LABEL')}
                placeholder={t('INBOX_MGMT.ADD.TWILIO.ACCOUNT_SID.PLACEHOLDER')}
                errorMessage={t('INBOX_MGMT.ADD.TWILIO.ACCOUNT_SID.ERROR')}
                value={accountSID}
                hasError={touched && !accountSID}
                onChange={setAccountSID}
                onBlur={() => setTouched(true)}
            />

            <div className="max-w-[65%] w-full messagingServiceHelptext">
                <label htmlFor="useAPIKey">
                    <input
                        id="useAPIKey"
                        type="checkbox"
                        className="checkbox"
                        checked={useAPIKey}
                        onChange={event => setUseAPIKey(event.target.checked)}
                    />{' '}
                    {t('INBOX_MGMT.ADD.TWILIO.API_KEY.USE_API_KEY')}
                </label>
            </div>

            {useAPIKey ? (
                <ChannelFormField
                    label={t('INBOX_MGMT.ADD.TWILIO.API_KEY.LABEL')}
                    placeholder={t('INBOX_MGMT.ADD.TWILIO.API_KEY.PLACEHOLDER')}
                    errorMessage={t('INBOX_MGMT.ADD.TWILIO.API_KEY.ERROR')}
                    value={apiKeySID}
                    hasError={touched && !apiKeySID}
                    onChange={setApiKeySID}
                    onBlur={() => setTouched(true)}
                />
            ) : null}

            <ChannelFormField
                label={t(`INBOX_MGMT.ADD.TWILIO.${authTokenKey}.LABEL`)}
                placeholder={t(`INBOX_MGMT.ADD.TWILIO.${authTokenKey}.PLACEHOLDER`)}
                errorMessage={t(`INBOX_MGMT.ADD.TWILIO.${authTokenKey}.ERROR`)}
                value={authToken}
                hasError={touched && !authToken}
                onChange={setAuthToken}
                onBlur={() => setTouched(true)}
            />

            <div className="w-full mt-4">
                <Button
                    type="submit"
                    isLoading={isCreating}
                    solid
                    blue
                    label={t('INBOX_MGMT.ADD.TWILIO.SUBMIT_BUTTON')}
                />
            </div>
        </form>
    );
}
