import { useState } from 'react';

import { t } from '../../../../i18n';
import SettingsSubPageHeader from '../../SettingsSubPageHeader';
import BandwidthSmsChannelForm from './BandwidthSms';
import TwilioChannelForm from './Twilio';

// Port từ settings/inbox/channels/Sms.vue — chọn nhà cung cấp rồi hiện form của
// nhà cung cấp đó (giá trị option '360dialog' là của bản gốc, nhãn là Bandwidth).
export default function SmsChannelForm() {
    const [provider, setProvider] = useState('twilio');

    return (
        <div className="h-full w-full p-6 col-span-6">
            <SettingsSubPageHeader
                headerTitle={t('INBOX_MGMT.ADD.SMS.TITLE')}
                headerContent={t('INBOX_MGMT.ADD.SMS.DESC')}
            />
            <div className="flex-shrink-0 flex-grow-0">
                <label>
                    {t('INBOX_MGMT.ADD.SMS.PROVIDERS.LABEL')}
                    <select value={provider} onChange={event => setProvider(event.target.value)}>
                        <option value="twilio">{t('INBOX_MGMT.ADD.SMS.PROVIDERS.TWILIO')}</option>
                        <option value="360dialog">{t('INBOX_MGMT.ADD.SMS.PROVIDERS.BANDWIDTH')}</option>
                    </select>
                </label>
            </div>
            {provider === 'twilio' ? <TwilioChannelForm type="sms" /> : <BandwidthSmsChannelForm />}
        </div>
    );
}
