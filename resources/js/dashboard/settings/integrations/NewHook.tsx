import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { getJson, parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import { fetchIntegrationApps } from 'dashboard/composables/useIntegrationApps';
import { useBranding } from 'shared/composables/useBranding';
import ModalHeader from 'dashboard/components/ModalHeader';
import Button from 'dashboard/components-next/button/Button';
import type { IntegrationApp, IntegrationFormField } from 'dashboard/composables/useIntegrationApps';
import type { DashboardPageProps } from '../../types';

// Port từ dashboard/routes/dashboard/settings/integrations/NewHook.vue.
// Bản gốc dựng form bằng FormKit từ `settings_form_schema`; ở đây render thẳng
// input/textarea/select/checkbox theo cùng schema — cùng nhãn, cùng thứ tự.
interface NewHookProps {
    integration: IntegrationApp;
    onClose: () => void;
}

type FieldValue = string | boolean;

function initialFieldValue(item: IntegrationFormField): FieldValue {
    if (item.type === 'checkbox') return false;
    if (item.type === 'select') return item.options?.[0]?.value ?? '';

    return '';
}

export default function NewHook({ integration, onClose }: NewHookProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const { replaceInstallationName } = useBranding();
    const [inboxes, setInboxes] = useState<{ id: number; name: string }[]>([]);

    useEffect(() => {
        if (integration.hook_type !== 'inbox') return;
        void getJson<{ payload: { id: number; name: string }[] }>(`/api/v1/accounts/${accountId}/inboxes`)
            .then(response => setInboxes(response?.payload ?? []))
            .catch(() => undefined);
    }, [accountId, integration.hook_type]);

    const formItems = useMemo(() => integration.settings_form_schema ?? [], [integration]);
    const isHookTypeInbox = integration.hook_type === 'inbox';
    const connectedInboxIds = useMemo(
        () => (integration.hooks ?? []).map(hook => hook.inbox?.id).filter(Boolean),
        [integration.hooks],
    );

    // FormKit bỏ qua khoá `default` của schema (nó chỉ hiểu `value`), nên ô select
    // của bản gốc luôn mở ở tuỳ chọn ĐẦU TIÊN chứ không phải giá trị `default`.
    const [values, setValues] = useState<Record<string, FieldValue>>(() =>
        Object.fromEntries(formItems.map(item => [item.name, initialFieldValue(item)])),
    );
    const [selectedInboxId, setSelectedInboxId] = useState('');
    const [isSubmitting, setSubmitting] = useState(false);

    const availableInboxes = inboxes.filter(
        inbox => !(integration.id === 'dialogflow' && connectedInboxIds.includes(inbox.id)),
    );

    const setValue = (name: string, value: FieldValue) => setValues(current => ({ ...current, [name]: value }));

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSubmitting(true);

        const settings: Record<string, unknown> = {};
        formItems.forEach(item => {
            const value = values[item.name];
            settings[item.name] = item.validation?.includes('JSON') ? JSON.parse(String(value)) : value;
        });

        try {
            await postJson(`/api/v1/accounts/${accountId}/integrations/hooks`, {
                app_id: integration.id,
                settings,
                ...(isHookTypeInbox && selectedInboxId ? { inbox_id: Number(selectedInboxId) } : {}),
            });
            fetchIntegrationApps(accountId, { force: true });
            useAlert(t('INTEGRATION_APPS.ADD.API.SUCCESS_MESSAGE'));
            onClose();
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('INTEGRATION_APPS.ADD.API.ERROR_MESSAGE'));
        } finally {
            setSubmitting(false);
        }
    };

    const submitLabel =
        integration.id === 'openai' && isSubmitting
            ? t('INTEGRATION_APPS.ADD.FORM.VALIDATING_OPENAI')
            : t('INTEGRATION_APPS.ADD.FORM.SUBMIT');

    return (
        <div className="flex flex-col h-auto overflow-auto integration-hooks">
            <ModalHeader
                headerTitle={integration.name}
                headerContent={replaceInstallationName(integration.short_description ?? '')}
            />
            <form className="w-full grid gap-4 px-8 py-6" onSubmit={submit}>
                {formItems.map(item => (
                    <label key={item.name} className="mt-2">
                        {item.type === 'checkbox' ? (
                            <span className="flex items-center gap-2 px-0.5">
                                <input
                                    type="checkbox"
                                    checked={Boolean(values[item.name])}
                                    onChange={event => setValue(item.name, event.target.checked)}
                                />
                                {item.label}
                            </span>
                        ) : (
                            <>
                                {item.label}
                                {item.type === 'textarea' ? (
                                    <textarea
                                        className="!mb-0"
                                        value={String(values[item.name] ?? '')}
                                        onChange={event => setValue(item.name, event.target.value)}
                                    />
                                ) : item.type === 'select' ? (
                                    <select
                                        className="!mb-0"
                                        value={String(values[item.name] ?? '')}
                                        onChange={event => setValue(item.name, event.target.value)}
                                    >
                                        {(item.options ?? []).map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        className="!mb-0"
                                        type={item.type === 'number' ? 'number' : 'text'}
                                        value={String(values[item.name] ?? '')}
                                        onChange={event => setValue(item.name, event.target.value)}
                                    />
                                )}
                            </>
                        )}
                        {item.help ? (
                            <span className="block text-n-slate-10 text-sm font-normal mt-2 w-full">{item.help}</span>
                        ) : null}
                    </label>
                ))}

                {isHookTypeInbox ? (
                    <label className="mt-2">
                        {t('INTEGRATION_APPS.ADD.FORM.INBOX.PLACEHOLDER')}
                        <select
                            className="!mb-0"
                            value={selectedInboxId}
                            onChange={event => setSelectedInboxId(event.target.value)}
                        >
                            <option value="" disabled>
                                {t('INTEGRATION_APPS.ADD.FORM.INBOX.LABEL')}
                            </option>
                            {availableInboxes.map(inbox => (
                                <option key={inbox.id} value={inbox.id}>
                                    {inbox.name}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : null}

                <div className="flex flex-row justify-end w-full gap-2 px-0 py-2">
                    <Button
                        faded
                        slate
                        type="reset"
                        label={t('INTEGRATION_APPS.ADD.FORM.CANCEL')}
                        onClick={event => {
                            event.preventDefault();
                            onClose();
                        }}
                    />
                    <Button type="submit" label={submitLabel} isLoading={isSubmitting} />
                </div>
            </form>
        </div>
    );
}
