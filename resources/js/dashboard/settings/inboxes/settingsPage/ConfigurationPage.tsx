import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { patchJson } from 'dashboard/helper/apiClient';
import { INBOX_TYPES } from 'dashboard/helper/inbox';
import { sanitizeAllowedDomains } from 'dashboard/helper/URLHelper';
import Code from 'dashboard/components/Code';
import Button from 'dashboard/components-next/button/Button';
import TextArea from 'dashboard/components-next/textarea/TextArea';
import SettingsAccordion from 'dashboard/components-next/Settings/SettingsAccordion';
import SettingsFieldSection from 'dashboard/components-next/Settings/SettingsFieldSection';
import SettingsToggleSection from 'dashboard/components-next/Settings/SettingsToggleSection';
import ImapSettings from './ImapSettings';
import SmtpSettings from './SmtpSettings';
import { ALLOW_MOBILE_WEBVIEW_FLAG } from '../webWidgetHelpers';
import type { DashboardPageProps } from '../../../types';
import type { Inbox } from '../types';

// Port từ settings/inbox/settingsPage/ConfigurationPage.vue — nhánh isAWebWidgetInbox
// và isAPIInbox (twilio/line/email/whatsapp vào cùng kênh của chúng).
const IDENTITY_VALIDATION_DOCS_URL =
    'https://www.chatwoot.com/docs/product/channels/live-chat/sdk/identity-validation/';

interface ConfigurationPageProps {
    inbox: Inbox;
    onInboxUpdated: (inbox: Inbox) => void;
}

export default function ConfigurationPage({ inbox, onInboxUpdated }: ConfigurationPageProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const isWebWidget = inbox.channel_type === INBOX_TYPES.WEB;
    const isEmailChannel = inbox.channel_type === INBOX_TYPES.EMAIL;
    const isForwardingEnabled = Boolean(inbox.forwarding_enabled);

    const [hmacMandatory, setHmacMandatory] = useState(Boolean(inbox.hmac_mandatory));
    const [allowedDomains, setAllowedDomains] = useState(inbox.allowed_domains ?? '');
    const [isUpdatingAllowedDomains, setUpdatingAllowedDomains] = useState(false);

    useEffect(() => {
        setHmacMandatory(Boolean(inbox.hmac_mandatory));
        setAllowedDomains(inbox.allowed_domains ?? '');
    }, [inbox.id, inbox.hmac_mandatory, inbox.allowed_domains]);

    const allowMobileWebview = (inbox.selected_feature_flags ?? []).includes(ALLOW_MOBILE_WEBVIEW_FLAG);

    const updateChannel = async (channel: Record<string, unknown>) => {
        try {
            const updated = await patchJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inbox.id}`, {
                channel,
            });
            onInboxUpdated(updated);
            useAlert(t('INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'));

            return updated;
        } catch {
            useAlert(t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));

            return null;
        }
    };

    const handleHmacFlag = async (value: boolean) => {
        setHmacMandatory(value);
        await updateChannel({ hmac_mandatory: value });
    };

    const handleMobileWebviewFlag = async (value: boolean) => {
        const currentFlags = inbox.selected_feature_flags ?? [];
        const selectedFlags = value
            ? [...currentFlags, ALLOW_MOBILE_WEBVIEW_FLAG]
            : currentFlags.filter(flag => flag !== ALLOW_MOBILE_WEBVIEW_FLAG);

        await updateChannel({ selected_feature_flags: selectedFlags });
    };

    const updateAllowedDomains = async () => {
        setUpdatingAllowedDomains(true);
        const sanitized = sanitizeAllowedDomains(allowedDomains);
        const updated = await updateChannel({ allowed_domains: sanitized });
        if (updated) setAllowedDomains(sanitized);
        setUpdatingAllowedDomains(false);
    };

    if (isEmailChannel) {
        return (
            <div>
                <div>
                    <SettingsFieldSection
                        label={t('INBOX_MGMT.SETTINGS_POPUP.FORWARD_EMAIL_TITLE')}
                        helpText={isForwardingEnabled ? t('INBOX_MGMT.SETTINGS_POPUP.FORWARD_EMAIL_SUB_TEXT') : ''}
                    >
                        {isForwardingEnabled ? (
                            <Code script={inbox.forward_to_email ?? ''} />
                        ) : (
                            <div className="py-2 px-3 bg-n-amber-3 outline-n-amber-4 text-n-amber-11 outline outline-1 -outline-offset-1 rounded-xl">
                                <p className="text-body-para mb-0">
                                    {t('INBOX_MGMT.SETTINGS_POPUP.FORWARD_EMAIL_NOT_CONFIGURED')}
                                </p>
                            </div>
                        )}
                    </SettingsFieldSection>
                </div>
                <ImapSettings inbox={inbox} onInboxUpdated={onInboxUpdated} />
                {inbox.imap_enabled ? <SmtpSettings inbox={inbox} onInboxUpdated={onInboxUpdated} /> : null}
            </div>
        );
    }

    if (isWebWidget) {
        return (
            <div>
                <div className="space-y-4">
                    <SettingsToggleSection
                        header={t('INBOX_MGMT.SETTINGS_POPUP.ALLOWED_DOMAINS.TITLE')}
                        description={t('INBOX_MGMT.SETTINGS_POPUP.ALLOWED_DOMAINS.DESCRIPTION')}
                        hideToggle
                        editor={
                            <>
                                <TextArea
                                    value={allowedDomains}
                                    onChange={setAllowedDomains}
                                    placeholder={t('INBOX_MGMT.SETTINGS_POPUP.ALLOWED_DOMAINS.PLACEHOLDER')}
                                    autoHeight
                                    resize
                                    className="w-full [&>div]:!bg-transparent [&>div]:!border-none [&>div]:!border-0 [&>div]:px-0 [&>div]:pb-0 [&>div]:pt-0"
                                />
                                <div className="mt-3 flex justify-end">
                                    <Button
                                        label={t('INBOX_MGMT.SETTINGS_POPUP.UPDATE')}
                                        isLoading={isUpdatingAllowedDomains}
                                        onClick={() => void updateAllowedDomains()}
                                    />
                                </div>
                            </>
                        }
                    />
                    <SettingsToggleSection
                        value={allowMobileWebview}
                        onChange={value => void handleMobileWebviewFlag(value)}
                        header={t('INBOX_MGMT.SETTINGS_POPUP.ALLOW_MOBILE_WEBVIEW.LABEL')}
                        description={t('INBOX_MGMT.SETTINGS_POPUP.ALLOW_MOBILE_WEBVIEW.SUBTITLE')}
                    />
                </div>

                <SettingsAccordion
                    title={t('INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.TITLE')}
                    className="mt-6"
                >
                    <SettingsToggleSection
                        header={t('INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.TITLE')}
                        description={t('INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.DESCRIPTION')}
                        hideToggle
                        editor={
                            <>
                                <p className="mb-1 text-sm font-medium text-n-slate-12">
                                    {t('INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.SECRET_KEY')}
                                </p>
                                <Code script={inbox.hmac_token ?? ''} />
                                <p className="mt-1.5 text-label-small text-n-slate-11">
                                    {t('INBOX_MGMT.SETTINGS_POPUP.HMAC_DESCRIPTION')}{' '}
                                    <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        href={IDENTITY_VALIDATION_DOCS_URL}
                                        className="text-n-blue-11 hover:underline text-label-small"
                                    >
                                        {t('INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.VIEW_DOCS')}
                                    </a>
                                </p>
                            </>
                        }
                    />

                    <SettingsToggleSection
                        value={hmacMandatory}
                        onChange={value => void handleHmacFlag(value)}
                        header={t('INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.REQUIRE_LABEL')}
                        description={t('INBOX_MGMT.SETTINGS_POPUP.IDENTITY_VALIDATION.REQUIRE_DESCRIPTION')}
                    />
                </SettingsAccordion>
            </div>
        );
    }

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
