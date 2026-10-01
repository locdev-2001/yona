import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../../i18n';
import ChannelSelector from 'dashboard/components/ChannelSelector';
import SettingsSubPageHeader from '../../SettingsSubPageHeader';
import Button from 'dashboard/components-next/button/Button';
import ChannelFormField from './ChannelFormField';
import { ChannelFormError } from './ConnectGuide';
import { useCreateChannel } from './useCreateChannel';
import type { ChannelFormProps } from '../NewChannel';
import { oauthErrorKey } from '../channelConnection';
import type { ChannelConnection } from '../channelConnection';

// Kênh Email: chọn nhà cung cấp trong các lối backend khai (`connection.options`).
// Lối OAuth chuyển sang nhà cung cấp; lối có `preset` (Gmail, Outlook) chỉ hỏi địa chỉ +
// App Password; "Khác" điền đủ máy chủ. Máy chủ thử đăng nhập IMAP/SMTP khi lưu.
const OPTION_ICONS: Record<string, string> = {
    google: 'i-woot-gmail',
    microsoft: 'i-woot-outlook',
    gmail: 'i-woot-gmail',
    outlook: 'i-woot-outlook',
    other: 'i-woot-mail',
};

const FALLBACK_OPTIONS: ChannelConnection[] = [
    { key: 'other', method: 'form', available: true, preset: null, guide_url: null, start_url: null, options: [] },
];

// email của @vuelidate/validators rút gọn: đủ để chặn lỗi gõ, máy chủ kiểm lại.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const optionText = (key: string, field: 'TITLE' | 'DESCRIPTION') =>
    t(`INBOX_MGMT.CONNECT_GUIDE.EMAIL.${key.toUpperCase()}.${field}`);

interface EmailServerFormProps {
    option: ChannelConnection;
    onBack: () => void;
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
    return (
        <label className="flex items-center gap-2 mb-3">
            <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
            {label}
        </label>
    );
}

export function EmailServerForm({ option, onBack }: EmailServerFormProps) {
    const preset = option.preset;
    const providerName = optionText(option.key, 'TITLE');
    const { isCreating, errorMessage, createChannel } = useCreateChannel(
        t('INBOX_MGMT.ADD.EMAIL_CHANNEL.API.ERROR_MESSAGE'),
    );

    const [touched, setTouched] = useState(false);
    const [channelName, setChannelName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [useMailServer, setUseMailServer] = useState(true);
    const [imapAddress, setImapAddress] = useState('');
    const [imapPort, setImapPort] = useState('993');
    const [imapSsl, setImapSsl] = useState(true);
    const [imapLogin, setImapLogin] = useState('');
    const [smtpAddress, setSmtpAddress] = useState('');
    const [smtpPort, setSmtpPort] = useState('587');
    const [smtpSsl, setSmtpSsl] = useState(false);
    const [smtpLogin, setSmtpLogin] = useState('');
    const [smtpPassword, setSmtpPassword] = useState('');

    const emailInvalid = !EMAIL_PATTERN.test(email.trim());
    const errors: Record<string, boolean> = preset
        ? { email: emailInvalid, password: !password }
        : {
              name: !channelName.trim(),
              email: emailInvalid,
              password: useMailServer && !password,
              imapAddress: useMailServer && !imapAddress.trim(),
              imapPort: useMailServer && !Number(imapPort),
          };
    const isInvalid = Object.values(errors).some(Boolean);
    const showError = (field: string) => touched && Boolean(errors[field]);

    const buildChannel = (): Record<string, unknown> => {
        const address = email.trim();

        if (preset) {
            return {
                type: 'email',
                email: address,
                ...preset,
                imap_enabled: true,
                imap_login: address,
                imap_password: password,
                smtp_enabled: true,
                smtp_login: address,
                smtp_password: password,
            };
        }

        if (!useMailServer) return { type: 'email', email: address };

        const hasSmtp = Boolean(smtpAddress.trim());

        return {
            type: 'email',
            email: address,
            imap_enabled: true,
            imap_address: imapAddress.trim(),
            imap_port: Number(imapPort),
            imap_enable_ssl: imapSsl,
            imap_login: imapLogin.trim() || address,
            imap_password: password,
            ...(hasSmtp
                ? {
                      smtp_enabled: true,
                      smtp_address: smtpAddress.trim(),
                      smtp_port: Number(smtpPort) || 587,
                      smtp_enable_ssl_tls: smtpSsl,
                      smtp_login: smtpLogin.trim() || imapLogin.trim() || address,
                      smtp_password: smtpPassword || password,
                  }
                : {}),
        };
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setTouched(true);
        if (isInvalid) return;

        void createChannel({
            ...(preset ? {} : { name: channelName.trim() }),
            channel: buildChannel(),
        });
    };

    const required = t('INBOX_MGMT.CONNECT_GUIDE.REQUIRED');
    const appPasswordHelp =
        option.key === 'gmail'
            ? t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.APP_PASSWORD_HELP_GMAIL')
            : t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.APP_PASSWORD_HELP_OUTLOOK');

    return (
        <div className="h-full w-full p-6 col-span-6">
            <SettingsSubPageHeader
                headerTitle={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.FORM_TITLE', { provider: providerName })}
                headerContent={
                    preset
                        ? t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.FORM_DESC_PRESET', { provider: providerName })
                        : t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.FORM_DESC_OTHER')
                }
            />
            <form className="flex flex-col mx-0 max-w-2xl" onSubmit={submit}>
                {preset ? null : (
                    <ChannelFormField
                        label={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.CHANNEL_NAME')}
                        placeholder={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.CHANNEL_NAME_PLACEHOLDER')}
                        errorMessage={required}
                        value={channelName}
                        hasError={showError('name')}
                        onChange={setChannelName}
                    />
                )}
                <ChannelFormField
                    label={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.EMAIL')}
                    placeholder={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.EMAIL_PLACEHOLDER')}
                    errorMessage={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.EMAIL_INVALID')}
                    type="email"
                    autoComplete="email"
                    value={email}
                    hasError={showError('email')}
                    onChange={setEmail}
                />

                {preset ? (
                    <>
                        <ChannelFormField
                            label={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.APP_PASSWORD')}
                            errorMessage={required}
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            hasError={showError('password')}
                            onChange={setPassword}
                        />
                        <p className="help-text mb-1">{appPasswordHelp}</p>
                        {option.guide_url ? (
                            <a
                                href={option.guide_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mb-2 w-fit text-body-main font-medium text-n-blue-11 underline underline-offset-2"
                            >
                                {t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.CREATE_APP_PASSWORD')}
                            </a>
                        ) : null}
                    </>
                ) : (
                    <>
                        <CheckboxField
                            label={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.USE_MAIL_SERVER')}
                            checked={useMailServer}
                            onChange={setUseMailServer}
                        />
                        {useMailServer ? (
                            <>
                                <h4 className="mt-2 mb-2 text-body-main font-medium text-n-slate-12">
                                    {t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.IMAP_TITLE')}
                                </h4>
                                <ChannelFormField
                                    label={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.HOST')}
                                    placeholder="imap.example.com"
                                    errorMessage={required}
                                    value={imapAddress}
                                    hasError={showError('imapAddress')}
                                    onChange={setImapAddress}
                                />
                                <ChannelFormField
                                    label={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.PORT')}
                                    type="number"
                                    errorMessage={required}
                                    value={imapPort}
                                    hasError={showError('imapPort')}
                                    onChange={setImapPort}
                                />
                                <CheckboxField
                                    label={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.IMAP_SSL')}
                                    checked={imapSsl}
                                    onChange={setImapSsl}
                                />
                                <ChannelFormField
                                    label={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.LOGIN')}
                                    placeholder={email}
                                    value={imapLogin}
                                    onChange={setImapLogin}
                                />
                                <ChannelFormField
                                    label={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.PASSWORD')}
                                    type="password"
                                    autoComplete="new-password"
                                    errorMessage={required}
                                    value={password}
                                    hasError={showError('password')}
                                    onChange={setPassword}
                                />

                                <h4 className="mt-4 mb-2 text-body-main font-medium text-n-slate-12">
                                    {t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.SMTP_TITLE')}
                                </h4>
                                <ChannelFormField
                                    label={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.HOST')}
                                    placeholder="smtp.example.com"
                                    value={smtpAddress}
                                    onChange={setSmtpAddress}
                                />
                                <ChannelFormField
                                    label={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.PORT')}
                                    type="number"
                                    value={smtpPort}
                                    onChange={setSmtpPort}
                                />
                                <CheckboxField
                                    label={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.SMTP_SSL')}
                                    checked={smtpSsl}
                                    onChange={setSmtpSsl}
                                />
                                <ChannelFormField
                                    label={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.LOGIN')}
                                    placeholder={imapLogin || email}
                                    value={smtpLogin}
                                    onChange={setSmtpLogin}
                                />
                                <ChannelFormField
                                    label={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.PASSWORD')}
                                    type="password"
                                    autoComplete="new-password"
                                    value={smtpPassword}
                                    onChange={setSmtpPassword}
                                />
                            </>
                        ) : (
                            <p className="help-text">{t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.USE_MAIL_SERVER_HELP')}</p>
                        )}
                    </>
                )}

                <ChannelFormError message={errorMessage} />

                <div className="flex flex-wrap items-center gap-3 w-full mt-4">
                    <Button
                        type="submit"
                        isLoading={isCreating}
                        solid
                        blue
                        label={isCreating ? t('INBOX_MGMT.CONNECT_GUIDE.CHECKING') : t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.SUBMIT')}
                    />
                    <Button type="button" ghost slate label={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.BACK')} onClick={onBack} />
                </div>
            </form>
        </div>
    );
}

export default function EmailChannelForm({ connection = null }: ChannelFormProps) {
    const options = connection?.options?.length ? connection.options : FALLBACK_OPTIONS;
    const [selectedKey, setSelectedKey] = useState<string | null>(options.length === 1 ? options[0].key : null);
    const selected = options.find(option => option.key === selectedKey) ?? null;
    const [oauthError] = useState(() => {
        const key = typeof window === 'undefined' ? null : oauthErrorKey(window.location.search ?? '');

        return key ? t(key) : null;
    });

    const choose = (option: ChannelConnection) => {
        if (option.method === 'oauth_redirect' && option.start_url) {
            window.location.href = option.start_url;

            return;
        }
        setSelectedKey(option.key);
    };

    if (selected && selected.method === 'form') {
        return <EmailServerForm option={selected} onBack={() => setSelectedKey(null)} />;
    }

    return (
        <div className="h-full w-full p-6 col-span-6">
            <SettingsSubPageHeader
                className="max-w-4xl"
                headerTitle={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.CHOOSE_TITLE')}
                headerContent={t('INBOX_MGMT.CONNECT_GUIDE.EMAIL.CHOOSE_DESC')}
            />
            <div className="grid max-w-3xl grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-6 mx-0 mt-6">
                {options.map(option => (
                    <ChannelSelector
                        key={option.key}
                        title={optionText(option.key, 'TITLE')}
                        description={optionText(option.key, 'DESCRIPTION')}
                        icon={OPTION_ICONS[option.key] ?? 'i-woot-mail'}
                        onClick={() => choose(option)}
                    />
                ))}
            </div>
            <ChannelFormError message={oauthError} />
        </div>
    );
}
