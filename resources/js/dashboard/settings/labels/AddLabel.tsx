import { useState } from 'react';

import { t } from '../../../i18n';
import { createLabel, newLabelValues } from './createLabel';
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
    const [initialValues] = useState<LabelFormValues>(() => newLabelValues(prefillTitle));
    const [isCreating, setCreating] = useState(false);

    const addLabel = async (values: LabelFormValues) => {
        setCreating(true);
        const label = await createLabel(accountId, values);
        setCreating(false);
        if (!label) return;
        onCreated(label);
        onClose();
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
