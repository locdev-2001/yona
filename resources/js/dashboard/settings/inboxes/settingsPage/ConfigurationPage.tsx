import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { patchJson } from 'dashboard/helper/apiClient';
import Code from 'dashboard/components/Code';
import SettingsFieldSection from 'dashboard/components-next/Settings/SettingsFieldSection';
import type { DashboardPageProps } from '../../../types';
import type { Inbox } from '../types';

// Port từ settings/inbox/settingsPage/ConfigurationPage.vue — nhánh isAPIInbox
// (twilio/line/web widget/email/whatsapp vào cùng kênh của chúng).
interface ConfigurationPageProps {
    inbox: Inbox;
    onInboxUpdated: (inbox: Inbox) => void;
}

export default function ConfigurationPage({ inbox, onInboxUpdated }: ConfigurationPageProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [hmacMandatory, setHmacMandatory] = useState(Boolean(inbox.hmac_mandatory));

    useEffect(() => {
        setHmacMandatory(Boolean(inbox.hmac_mandatory));
    }, [inbox.id, inbox.hmac_mandatory]);

    const handleHmacFlag = async (value: boolean) => {
        setHmacMandatory(value);
        try {
            const updated = await patchJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inbox.id}`, {
                channel: { hmac_mandatory: value },
            });
            onInboxUpdated(updated);
            useAlert(t('INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'));
        } catch {
            useAlert(t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
        }
    };

    return (
        <div>
            <SettingsFieldSection
                label={t('INBOX_MGMT.SETTINGS_POPUP.INBOX_IDENTIFIER')}
                helpText={t('INBOX_MGMT.SETTINGS_POPUP.INBOX_IDENTIFIER_SUB_TEXT')}
            >
                <Code script={inbox.inbox_identifier ?? ''} />
            </SettingsFieldSection>

            <SettingsFieldSection
                label={t('INBOX_MGMT.SETTINGS_POPUP.HMAC_VERIFICATION')}
                helpText={t('INBOX_MGMT.SETTINGS_POPUP.HMAC_DESCRIPTION')}
            >
                <Code script={inbox.hmac_token ?? ''} />
            </SettingsFieldSection>

            <SettingsFieldSection
                label={t('INBOX_MGMT.SETTINGS_POPUP.HMAC_MANDATORY_VERIFICATION')}
                helpText={t('INBOX_MGMT.SETTINGS_POPUP.HMAC_MANDATORY_DESCRIPTION')}
            >
                <div className="flex gap-2 items-center">
                    <input
                        id="hmacMandatory"
                        type="checkbox"
                        checked={hmacMandatory}
                        onChange={event => void handleHmacFlag(event.target.checked)}
                    />
                    <label htmlFor="hmacMandatory" className="text-body-main text-n-slate-12">
                        {t('INBOX_MGMT.EDIT.ENABLE_HMAC.LABEL')}
                    </label>
                </div>
            </SettingsFieldSection>
        </div>
    );
}
