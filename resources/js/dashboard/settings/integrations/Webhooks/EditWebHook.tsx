import { useState } from 'react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { updateWebhook } from 'dashboard/composables/useWebhooks';
import type { Webhook } from 'dashboard/composables/useWebhooks';
import ModalHeader from 'dashboard/components/ModalHeader';
import WebhookForm from './WebhookForm';
import type { WebhookFormValues } from './WebhookForm';

// Port từ dashboard/routes/dashboard/settings/integrations/Webhooks/EditWebHook.vue.
interface EditWebHookProps {
    accountId: number;
    webhook: Webhook;
    onClose: () => void;
    onUpdated: () => void;
}

export default function EditWebHook({ accountId, webhook, onClose, onUpdated }: EditWebHookProps) {
    const [isSubmitting, setSubmitting] = useState(false);

    const submit = async (values: WebhookFormValues) => {
        setSubmitting(true);
        try {
            await updateWebhook(accountId, webhook.id, values);
            useAlert(t('INTEGRATION_SETTINGS.WEBHOOK.EDIT.API.SUCCESS_MESSAGE'));
            onUpdated();
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('INTEGRATION_SETTINGS.WEBHOOK.EDIT.API.ERROR_MESSAGE'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-auto overflow-auto">
            <ModalHeader headerTitle={t('INTEGRATION_SETTINGS.WEBHOOK.EDIT.TITLE')} />
            <WebhookForm
                value={webhook}
                isSubmitting={isSubmitting}
                submitLabel={t('INTEGRATION_SETTINGS.WEBHOOK.FORM.EDIT_SUBMIT')}
                onSubmit={values => void submit(values)}
                onCancel={onClose}
            />
        </div>
    );
}
