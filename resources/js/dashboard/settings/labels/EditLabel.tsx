import { useState } from 'react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { patchJson } from 'dashboard/helper/apiClient';
import LabelForm from './LabelForm';
import type { LabelFormValues } from './LabelForm';
import type { Label } from './types';

// Port từ dashboard/routes/dashboard/settings/labels/EditLabel.vue
interface EditLabelProps {
    accountId: number;
    label: Label;
    onClose: () => void;
    onUpdated: (label: Label) => void;
}

export default function EditLabel({ accountId, label, onClose, onUpdated }: EditLabelProps) {
    const [isUpdating, setUpdating] = useState(false);

    const editLabel = async (values: LabelFormValues) => {
        setUpdating(true);
        try {
            const updated = await patchJson<Label>(`/api/v1/accounts/${accountId}/labels/${label.id}`, {
                ...values,
            });
            onUpdated(updated);
            useAlert(t('LABEL_MGMT.EDIT.API.SUCCESS_MESSAGE'));
            onClose();
        } catch {
            useAlert(t('LABEL_MGMT.EDIT.API.ERROR_MESSAGE'));
        } finally {
            setUpdating(false);
        }
    };

    return (
        <LabelForm
            headerTitle={`${t('LABEL_MGMT.EDIT.TITLE')} - ${label.title}`}
            submitLabel={t('LABEL_MGMT.FORM.EDIT')}
            initialValues={{
                title: label.title,
                description: label.description ?? '',
                color: label.color,
                show_on_sidebar: label.show_on_sidebar,
            }}
            isSubmitting={isUpdating}
            onSubmit={values => void editLabel(values)}
            onClose={onClose}
        />
    );
}
