import { useState } from 'react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { createWebhook } from 'dashboard/composables/useWebhooks';
import type { Webhook } from 'dashboard/composables/useWebhooks';
import { useBranding } from 'shared/composables/useBranding';
import ModalHeader from 'dashboard/components/ModalHeader';
import Button from 'dashboard/components-next/button/Button';
import WebhookForm from './WebhookForm';
import type { WebhookFormValues } from './WebhookForm';

// Port từ dashboard/routes/dashboard/settings/integrations/Webhooks/NewWebHook.vue.
interface NewWebHookProps {
    accountId: number;
    onClose: () => void;
    onCreated: () => void;
}

export default function NewWebHook({ accountId, onClose, onCreated }: NewWebHookProps) {
    const { replaceInstallationName } = useBranding();
    const [createdWebhook, setCreatedWebhook] = useState<Webhook | null>(null);
    const [isSubmitting, setSubmitting] = useState(false);

    const submit = async (values: WebhookFormValues) => {
        setSubmitting(true);
        try {
            setCreatedWebhook(await createWebhook(accountId, values));
            onCreated();
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('INTEGRATION_SETTINGS.WEBHOOK.EDIT.API.ERROR_MESSAGE'));
        } finally {
            setSubmitting(false);
        }
    };

    const copySecret = async () => {
        await copyTextToClipboard(createdWebhook?.secret ?? '');
        useAlert(t('INTEGRATION_SETTINGS.WEBHOOK.SECRET.COPY_SUCCESS'));
    };

    return (
        <div className="h-auto overflow-auto flex flex-col">
            {createdWebhook ? (
                <>
                    <ModalHeader headerTitle={t('INTEGRATION_SETTINGS.WEBHOOK.ADD.API.SUCCESS_MESSAGE')} />
                    <div className="px-8 pb-6">
                        <p className="text-sm text-n-slate-11 mb-4">
                            {t('INTEGRATION_SETTINGS.WEBHOOK.SECRET.CREATED_DESC')}
                        </p>
                        <label>
                            {t('INTEGRATION_SETTINGS.WEBHOOK.SECRET.LABEL')}
                            <div className="flex items-center gap-2">
                                <input
                                    value={createdWebhook.secret ?? ''}
                                    type="text"
                                    readOnly
                                    className="!mb-0 font-mono"
                                    onChange={() => undefined}
                                />
                                <Button
                                    title={t('INTEGRATION_SETTINGS.WEBHOOK.SECRET.COPY')}
                                    icon="i-lucide-copy"
                                    slate
                                    faded
                                    onClick={() => void copySecret()}
                                />
                            </div>
                        </label>
                        <div className="flex justify-end mt-4">
                            <Button
                                blue
                                label={t('INTEGRATION_SETTINGS.WEBHOOK.SECRET.DONE')}
                                onClick={onClose}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <ModalHeader
                        headerTitle={t('INTEGRATION_SETTINGS.WEBHOOK.ADD.TITLE')}
                        headerContent={replaceInstallationName(t('INTEGRATION_SETTINGS.WEBHOOK.FORM.DESC'))}
                    />
                    <WebhookForm
                        isSubmitting={isSubmitting}
                        submitLabel={t('INTEGRATION_SETTINGS.WEBHOOK.FORM.ADD_SUBMIT')}
                        onSubmit={values => void submit(values)}
                        onCancel={onClose}
                    />
                </>
            )}
        </div>
    );
}
