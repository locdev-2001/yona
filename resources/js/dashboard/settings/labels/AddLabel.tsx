import { useState } from 'react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import { getRandomColor } from 'dashboard/helper/labelColor';
import { normalizeLabelTitle } from './validations';
import LabelForm from './LabelForm';
import type { LabelFormValues } from './LabelForm';
import type { Label } from './types';

// Port từ dashboard/routes/dashboard/settings/labels/AddLabel.vue
interface AddLabelProps {
    accountId: number;
    prefillTitle?: string;
    onClose: () => void;
    onCreated: (label: Label) => void;
}

export default function AddLabel({ accountId, prefillTitle = '', onClose, onCreated }: AddLabelProps) {
    const [initialValues] = useState<LabelFormValues>(() => ({
        title: normalizeLabelTitle(prefillTitle),
        description: '',
        color: getRandomColor(),
        show_on_sidebar: true,
    }));
    const [isCreating, setCreating] = useState(false);

    const addLabel = async (values: LabelFormValues) => {
        setCreating(true);
        try {
            const label = await postJson<Label>(`/api/v1/accounts/${accountId}/labels`, { ...values });
            onCreated(label);
            useAlert(t('LABEL_MGMT.ADD.API.SUCCESS_MESSAGE'));
            onClose();
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('LABEL_MGMT.ADD.API.ERROR_MESSAGE'));
        } finally {
            setCreating(false);
        }
    };

    return (
        <LabelForm
            headerTitle={t('LABEL_MGMT.ADD.TITLE')}
            headerContent={t('LABEL_MGMT.ADD.DESC')}
            submitLabel={t('LABEL_MGMT.FORM.CREATE')}
            initialValues={initialValues}
            isSubmitting={isCreating}
            onSubmit={values => void addLabel(values)}
            onClose={onClose}
        />
    );
}
