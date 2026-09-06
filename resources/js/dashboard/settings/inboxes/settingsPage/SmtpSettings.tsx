import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, patchJson } from 'dashboard/helper/apiClient';
import Button from 'dashboard/components-next/button/Button';
import SettingsFieldSection from 'dashboard/components-next/Settings/SettingsFieldSection';
import WootInput from 'dashboard/components/widgets/forms/Input';
import InputRadioGroup from './components/InputRadioGroup';
import SingleSelectDropdown from './components/SingleSelectDropdown';
import type { DropdownOption } from './components/SingleSelectDropdown';
import type { DashboardPageProps } from '../../../types';
import type { Inbox } from '../types';

// Port từ settings/inbox/SmtpSettings.vue.
const OPEN_SSL_VERIFY_MODES: DropdownOption[] = [
    { key: 1, value: 'none' },
    { key: 2, value: 'peer' },
    { key: 3, value: 'client_once' },
    { key: 4, value: 'fail_if_no_peer_cert' },
];

const AUTH_MECHANISMS: DropdownOption[] = [
    { key: 1, value: 'plain' },
    { key: 2, value: 'login' },
    { key: 3, value: 'cram-md5' },
    { key: 4, value: 'xoauth' },
    { key: 5, value: 'xoauth2' },
    { key: 6, value: 'ntlm' },
    { key: 7, value: 'gssapi' },
];

interface SmtpSettingsProps {
    inbox: Inbox;
    onInboxUpdated: (inbox: Inbox) => void;
}

export default function SmtpSettings({ inbox, onInboxUpdated }: SmtpSettingsProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [isSmtpEnabled, setSmtpEnabled] = useState(Boolean(inbox.smtp_enabled));
    const [address, setAddress] = useState(inbox.smtp_address ?? '');
    const [port, setPort] = useState(String(inbox.smtp_port ?? ''));
    const [login, setLogin] = useState(inbox.smtp_login ?? '');
    const [password, setPassword] = useState(inbox.smtp_password ?? '');
    const [domain, setDomain] = useState(inbox.smtp_domain ?? '');
    const [ssl, setSsl] = useState(Boolean(inbox.smtp_enable_ssl_tls));
    const [starttls, setStarttls] = useState(inbox.smtp_enable_starttls_auto ?? true);
    const [openSslVerifyMode, setOpenSslVerifyMode] = useState(inbox.smtp_openssl_verify_mode ?? 'none');
    const [authMechanism, setAuthMechanism] = useState(inbox.smtp_authentication ?? 'login');
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isUpdating, setUpdating] = useState(false);

    useEffect(() => {
        setSmtpEnabled(Boolean(inbox.smtp_enabled));
        setAddress(inbox.smtp_address ?? '');
        setPort(String(inbox.smtp_port ?? ''));
        setLogin(inbox.smtp_login ?? '');
        setPassword(inbox.smtp_password ?? '');
        setDomain(inbox.smtp_domain ?? '');
        setSsl(Boolean(inbox.smtp_enable_ssl_tls));
        setStarttls(inbox.smtp_enable_starttls_auto ?? true);
        setOpenSslVerifyMode(inbox.smtp_openssl_verify_mode ?? 'none');
        setAuthMechanism(inbox.smtp_authentication ?? 'login');
    }, [inbox]);

    const errors = {
        address: !address,
        port: !port || String(port).length < 2,
        login: !login,
        password: !password,
        domain: !domain,
    };
    const isInvalid = Object.values(errors).some(Boolean);

    const updateInbox = async () => {
        setUpdating(true);
        try {
            const updated = await patchJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inbox.id}`, {
                channel: {
                    smtp_enabled: isSmtpEnabled,
                    smtp_address: address,
                    smtp_port: port,
                    smtp_login: login,
                    smtp_password: password,
                    smtp_domain: domain,
                    smtp_enable_ssl_tls: ssl,
                    smtp_enable_starttls_auto: starttls,
                    smtp_openssl_verify_mode: openSslVerifyMode,
                    smtp_authentication: authMechanism,
                },
            });
            onInboxUpdated(updated);
            useAlert(t('INBOX_MGMT.SMTP.EDIT.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('INBOX_MGMT.SMTP.EDIT.ERROR_MESSAGE'));
        } finally {
            setUpdating(false);
        }
    };

    const errorClass = (field: keyof typeof errors) => (touched[field] && errors[field] ? 'error' : '');
    const touch = (field: string) => setTouched(current => ({ ...current, [field]: true }));

    return (
        <SettingsFieldSection
            label={t('INBOX_MGMT.SMTP.TITLE')}
            helpText={t('INBOX_MGMT.SMTP.SUBTITLE')}
            className="[&>div]:!items-start [&>div>label]:mt-1 mb-4"
        >
            <form
                onSubmit={event => {
                    event.preventDefault();
                    void updateInbox();
                }}
            >
                <label htmlFor="toggle-enable-smtp">
                    <input
                        type="checkbox"
                        name="toggle-enable-smtp"
                        className="ltr:mr-1 rtl:ml-1"
                        checked={isSmtpEnabled}
                        onChange={event => setSmtpEnabled(event.target.checked)}
                    />
                    {t('INBOX_MGMT.SMTP.TOGGLE_AVAILABILITY')}
                </label>
                <p>{t('INBOX_MGMT.SMTP.TOGGLE_HELP')}</p>
                {isSmtpEnabled ? (
                    <div className="mb-6">
                        <WootInput
                            value={address}
                            className={`w-full ${errorClass('address')}`}
                            label={t('INBOX_MGMT.SMTP.ADDRESS.LABEL')}
                            placeholder={t('INBOX_MGMT.SMTP.ADDRESS.PLACE_HOLDER')}
                            onChange={setAddress}
                            onBlur={() => touch('address')}
                        />
                        <WootInput
                            value={port}
                            type="number"
                            className={`w-full ${errorClass('port')}`}
                            label={t('INBOX_MGMT.SMTP.PORT.LABEL')}
                            placeholder={t('INBOX_MGMT.SMTP.PORT.PLACE_HOLDER')}
                            onChange={setPort}
                            onBlur={() => touch('port')}
                        />
                        <WootInput
                            value={login}
                            className={`w-full ${errorClass('login')}`}
                            label={t('INBOX_MGMT.SMTP.LOGIN.LABEL')}
                            placeholder={t('INBOX_MGMT.SMTP.LOGIN.PLACE_HOLDER')}
                            onChange={setLogin}
                            onBlur={() => touch('login')}
                        />
                        <WootInput
                            value={password}
                            type="password"
                            className={`w-full ${errorClass('password')}`}
                            label={t('INBOX_MGMT.SMTP.PASSWORD.LABEL')}
                            placeholder={t('INBOX_MGMT.SMTP.PASSWORD.PLACE_HOLDER')}
                            onChange={setPassword}
                            onBlur={() => touch('password')}
                        />
                        <WootInput
                            value={domain}
                            className={`w-full ${errorClass('domain')}`}
                            label={t('INBOX_MGMT.SMTP.DOMAIN.LABEL')}
                            placeholder={t('INBOX_MGMT.SMTP.DOMAIN.PLACE_HOLDER')}
                            onChange={setDomain}
                            onBlur={() => touch('domain')}
                        />
                        <InputRadioGroup
                            label={t('INBOX_MGMT.SMTP.ENCRYPTION')}
                            items={[
                                { id: 'ssl', title: 'SSL/TLS', checked: ssl },
                                { id: 'starttls', title: 'STARTTLS', checked: starttls },
                            ]}
                            onAction={item => {
                                const useSsl = item.id === 'ssl';
                                setSsl(useSsl);
                                setStarttls(!useSsl);
                            }}
                        />
                        <SingleSelectDropdown
                            className="w-full"
                            label={t('INBOX_MGMT.SMTP.OPEN_SSL_VERIFY_MODE')}
                            selected={openSslVerifyMode}
                            options={OPEN_SSL_VERIFY_MODES}
                            onAction={setOpenSslVerifyMode}
                        />
                        <SingleSelectDropdown
                            className="w-full"
                            label={t('INBOX_MGMT.SMTP.AUTH_MECHANISM')}
                            selected={authMechanism}
                            options={AUTH_MECHANISMS}
                            onAction={setAuthMechanism}
                        />
                    </div>
                ) : null}
                <Button
                    type="submit"
                    label={t('INBOX_MGMT.SMTP.UPDATE')}
                    isLoading={isUpdating}
                    disabled={(isInvalid && isSmtpEnabled) || isUpdating}
                />
            </form>
        </SettingsFieldSection>
    );
}
