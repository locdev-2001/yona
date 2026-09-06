import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../../i18n';
import { EXAMPLE_WEBHOOK_URL } from 'dashboard/constants/globals';
import { getI18nKey } from '../../helper/settingsHelper';
import { useAlert } from 'dashboard/composables/useAlert';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import Button from 'dashboard/components-next/button/Button';
import type { Webhook } from 'dashboard/composables/useWebhooks';

// Port từ dashboard/routes/dashboard/settings/integrations/Webhooks/WebhookForm.vue.
// `inbox_updated` chỉ hiện khi cấu hình bật inbox events (useConfig) — Yona chưa
// có cờ đó nên giữ đúng danh sách mặc định của bản gốc.
export const SUPPORTED_WEBHOOK_EVENTS = [
    'conversation_created',
    'conversation_status_changed',
    'conversation_updated',
    'message_created',
    'message_updated',
    'webwidget_triggered',
    'contact_created',
    'contact_updated',
    'conversation_typing_on',
    'conversation_typing_off',
];

export interface WebhookFormValues {
    url: string;
    name: string;
    subscriptions: string[];
}

// vuelidate: url required + minLength(7) + url, subscriptions required.
function isUrlInvalid(url: string): boolean {
    if (url.length < 7) return true;
    try {
        return !['http:', 'https:'].includes(new URL(url).protocol);
    } catch {
        return true;
    }
}

interface WebhookFormProps {
    value?: Partial<Webhook>;
    isSubmitting?: boolean;
    submitLabel: string;
    onSubmit: (values: WebhookFormValues) => void;
    onCancel: () => void;
}

export default function WebhookForm({
    value = {},
    isSubmitting = false,
    submitLabel,
    onSubmit,
    onCancel,
}: WebhookFormProps) {
    const [url, setUrl] = useState(value.url || '');
    const [name, setName] = useState(value.name || '');
    const [subscriptions, setSubscriptions] = useState<string[]>(value.subscriptions || []);
    const [isUrlTouched, setUrlTouched] = useState(false);
    const [isSecretVisible, setSecretVisible] = useState(false);

    const hasSecret = Boolean(value.secret);
    const urlError = isUrlTouched && isUrlInvalid(url);
    const isInvalid = isUrlInvalid(url) || !subscriptions.length;

    const toggleSubscription = (event: string, checked: boolean) =>
        setSubscriptions(current =>
            checked ? [...current, event] : current.filter(subscription => subscription !== event),
        );

    const submit = (formEvent: FormEvent) => {
        formEvent.preventDefault();
        onSubmit({ url, name, subscriptions });
    };

    const copySecret = async () => {
        await copyTextToClipboard(value.secret ?? '');
        useAlert(t('INTEGRATION_SETTINGS.WEBHOOK.SECRET.COPY_SUCCESS'));
    };

    return (
        <form className="flex flex-col w-full" onSubmit={submit}>
            <div className="w-full">
                <label className={urlError ? 'error' : undefined}>
                    {t('INTEGRATION_SETTINGS.WEBHOOK.FORM.END_POINT.LABEL')}
                    <input
                        type="text"
                        name="url"
                        value={url}
                        placeholder={t('INTEGRATION_SETTINGS.WEBHOOK.FORM.END_POINT.PLACEHOLDER', {
                            webhookExampleURL: EXAMPLE_WEBHOOK_URL,
                        })}
                        onChange={event => {
                            setUrl(event.target.value);
                            setUrlTouched(true);
                        }}
                    />
                    {urlError ? (
                        <span className="message">
                            {t('INTEGRATION_SETTINGS.WEBHOOK.FORM.END_POINT.ERROR')}
                        </span>
                    ) : null}
                </label>
                <label>
                    {t('INTEGRATION_SETTINGS.WEBHOOK.FORM.NAME.LABEL')}
                    <input
                        type="text"
                        name="name"
                        value={name}
                        placeholder={t('INTEGRATION_SETTINGS.WEBHOOK.FORM.NAME.PLACEHOLDER')}
                        onChange={event => setName(event.target.value)}
                    />
                </label>
                {hasSecret ? (
                    <label className="mb-4">
                        {t('INTEGRATION_SETTINGS.WEBHOOK.SECRET.LABEL')}
                        <div className="flex items-center gap-2">
                            <input
                                value={isSecretVisible ? value.secret : '••••••••••••••••••••••••••••••••'}
                                type="text"
                                readOnly
                                className="!mb-0 font-mono"
                                onChange={() => undefined}
                            />
                            <Button
                                title={t('INTEGRATION_SETTINGS.WEBHOOK.SECRET.TOGGLE')}
                                type="button"
                                icon={isSecretVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'}
                                slate
                                faded
                                onClick={() => setSecretVisible(visible => !visible)}
                            />
                            <Button
                                title={t('INTEGRATION_SETTINGS.WEBHOOK.SECRET.COPY')}
                                type="button"
                                icon="i-lucide-copy"
                                slate
                                faded
                                onClick={() => void copySecret()}
                            />
                        </div>
                    </label>
                ) : null}
                <label className={`mb-2 ${urlError ? 'error' : ''}`}>
                    {t('INTEGRATION_SETTINGS.WEBHOOK.FORM.SUBSCRIPTIONS.LABEL')}
                </label>
                <div className="flex flex-col gap-2.5 mb-4">
                    {SUPPORTED_WEBHOOK_EVENTS.map(event => (
                        <div key={event} className="flex items-center">
                            <input
                                id={event}
                                type="checkbox"
                                value={event}
                                name="subscriptions"
                                className="mr-2"
                                checked={subscriptions.includes(event)}
                                onChange={changeEvent => toggleSubscription(event, changeEvent.target.checked)}
                            />
                            <label htmlFor={event} className="text-sm">
                                {`${t(
                                    getI18nKey('INTEGRATION_SETTINGS.WEBHOOK.FORM.SUBSCRIPTIONS.EVENTS', event),
                                )} (${event})`}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-row justify-end w-full gap-2 px-0 py-2">
                <Button
                    faded
                    slate
                    type="reset"
                    label={t('INTEGRATION_SETTINGS.WEBHOOK.FORM.CANCEL')}
                    onClick={event => {
                        event.preventDefault();
                        onCancel();
                    }}
                />
                <Button
                    type="submit"
                    disabled={isInvalid || isSubmitting}
                    isLoading={isSubmitting}
                    label={submitLabel}
                />
            </div>
        </form>
    );
}
