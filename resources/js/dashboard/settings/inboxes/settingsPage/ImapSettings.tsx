import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, patchJson } from 'dashboard/helper/apiClient';
import Button from 'dashboard/components-next/button/Button';
import SettingsFieldSection from 'dashboard/components-next/Settings/SettingsFieldSection';
import WootInput from 'dashboard/components/widgets/forms/Input';
import SingleSelectDropdown from './components/SingleSelectDropdown';
import type { DropdownOption } from './components/SingleSelectDropdown';
import type { DashboardPageProps } from '../../../types';
import type { Inbox } from '../types';

// Port từ settings/inbox/ImapSettings.vue.
const AUTH_MECHANISMS: DropdownOption[] = [
    { key: 1, value: 'plain' },
    { key: 2, value: 'login' },
    { key: 3, value: 'cram-md5' },
];

interface ImapSettingsProps {
    inbox: Inbox;
    onInboxUpdated: (inbox: Inbox) => void;
}

export default function ImapSettings({ inbox, onInboxUpdated }: ImapSettingsProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [isImapEnabled, setImapEnabled] = useState(Boolean(inbox.imap_enabled));
    const [address, setAddress] = useState(inbox.imap_address ?? '');
    const [port, setPort] = useState(String(inbox.imap_port ?? ''));
    const [login, setLogin] = useState(inbox.imap_login ?? '');
    const [password, setPassword] = useState(inbox.imap_password ?? '');
    const [isSslEnabled, setSslEnabled] = useState(inbox.imap_enable_ssl ?? true);
    const [authMechanism, setAuthMechanism] = useState(inbox.imap_authentication || 'plain');
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isUpdating, setUpdating] = useState(false);
    // Máy chủ thư từ chối (sai mật khẩu, sai cổng…) thì báo ngay dưới form, không chỉ thoáng qua ở toast.
    const [serverError, setServerError] = useState<string | null>(null);

    // watch(inbox) + mounted() → setDefaults() của bản gốc.
    useEffect(() => {
        setImapEnabled(Boolean(inbox.imap_enabled));
        setAddress(inbox.imap_address ?? '');
        setPort(String(inbox.imap_port ?? ''));
        setLogin(inbox.imap_login ?? '');
        setPassword(inbox.imap_password ?? '');
        setSslEnabled(inbox.imap_enable_ssl ?? true);
        setAuthMechanism(inbox.imap_authentication || 'plain');
    }, [inbox]);

    const errors = {
        address: !address,
        port: !port || String(port).length < 2,
        login: !login,
        password: !password,
    };
    const isInvalid = Object.values(errors).some(Boolean);

    const updateInbox = async () => {
        setUpdating(true);
        setServerError(null);
        const channel: Record<string, unknown> = {
            imap_enabled: isImapEnabled,
            imap_address: address,
            imap_port: port,
            imap_login: login,
            imap_password: password,
            imap_enable_ssl: isSslEnabled,
            imap_authentication: authMechanism,
        };
        if (!isImapEnabled) channel.smtp_enabled = false;

        try {
            const updated = await patchJson<Inbox>(
                `/api/v1/accounts/${accountId}/inboxes/${inbox.id}`,
                { channel },
            );
            onInboxUpdated(updated);
            useAlert(t('INBOX_MGMT.IMAP.EDIT.SUCCESS_MESSAGE'));
        } catch (error) {
            const message = parseApiErrorMessage(error);
            setServerError(message);
            useAlert(message || t('INBOX_MGMT.IMAP.EDIT.ERROR_MESSAGE'));
        } finally {
            setUpdating(false);
        }
    };

    const errorClass = (field: keyof typeof errors) => (touched[field] && errors[field] ? 'error' : '');
    const touch = (field: string) => setTouched(current => ({ ...current, [field]: true }));

    return (
        <SettingsFieldSection
            label={t('INBOX_MGMT.IMAP.TITLE')}
            helpText={t('INBOX_MGMT.IMAP.NOTE_TEXT')}
            className="[&>div]:!items-start [&>div>label]:mt-1 mb-4"
        >
            <form
                onSubmit={event => {
                    event.preventDefault();
                    void updateInbox();
                }}
            >
                <label htmlFor="toggle-imap-enable">
                    <input
                        type="checkbox"
                        className="ltr:mr-1 rtl:ml-1"
                        name="toggle-imap-enable"
                        checked={isImapEnabled}
                        onChange={event => setImapEnabled(event.target.checked)}
                    />{' '}
                    {t('INBOX_MGMT.IMAP.TOGGLE_AVAILABILITY')}
                </label>
                <p>{t('INBOX_MGMT.IMAP.TOGGLE_HELP')}</p>
                {isImapEnabled ? (
                    <div className="mb-6">
                        <WootInput
                            value={address}
                            className={`w-full ${errorClass('address')}`}
                            label={t('INBOX_MGMT.IMAP.ADDRESS.LABEL')}
                            placeholder={t('INBOX_MGMT.IMAP.ADDRESS.PLACE_HOLDER')}
                            onChange={setAddress}
                            onBlur={() => touch('address')}
                        />
                        <WootInput
                            value={port}
                            type="number"
                            className={`w-full ${errorClass('port')}`}
                            label={t('INBOX_MGMT.IMAP.PORT.LABEL')}
                            placeholder={t('INBOX_MGMT.IMAP.PORT.PLACE_HOLDER')}
                            onChange={setPort}
                            onBlur={() => touch('port')}
                        />
                        <WootInput
                            value={login}
                            className={`w-full ${errorClass('login')}`}
                            label={t('INBOX_MGMT.IMAP.LOGIN.LABEL')}
                            placeholder={t('INBOX_MGMT.IMAP.LOGIN.PLACE_HOLDER')}
                            onChange={setLogin}
                            onBlur={() => touch('login')}
                        />
                        <WootInput
                            value={password}
                            type="password"
                            className={`w-full ${errorClass('password')}`}
                            label={t('INBOX_MGMT.IMAP.PASSWORD.LABEL')}
                            placeholder={t('INBOX_MGMT.IMAP.PASSWORD.PLACE_HOLDER')}
                            onChange={setPassword}
                            onBlur={() => touch('password')}
                        />
                        <label htmlFor="toggle-enable-ssl">
                            <input
                                type="checkbox"
                                className="ltr:mr-2 rtl:ml-2"
                                name="toggle-enable-ssl"
                                checked={isSslEnabled}
                                onChange={event => setSslEnabled(event.target.checked)}
                            />{' '}
                            {t('INBOX_MGMT.IMAP.ENABLE_SSL')}
                        </label>
                        <SingleSelectDropdown
                            className="w-full"
                            label={t('INBOX_MGMT.IMAP.AUTH_MECHANISM')}
                            selected={authMechanism}
                            options={AUTH_MECHANISMS}
                            onAction={setAuthMechanism}
                        />
                    </div>
                ) : null}
                {serverError ? (
                    <p role="alert" className="mb-3 text-body-main text-n-ruby-11 break-words">
                        {serverError}
                    </p>
                ) : null}
                <Button
                    type="submit"
                    label={t('INBOX_MGMT.IMAP.UPDATE')}
                    isLoading={isUpdating}
                    disabled={(isInvalid && isImapEnabled) || isUpdating}
                />
            </form>
        </SettingsFieldSection>
    );
}
