import { useState } from 'react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { createCannedResponse } from 'dashboard/composables/useCannedResponses';
import type { CannedResponse } from 'dashboard/composables/useCannedResponses';
import CannedForm from './CannedForm';
import type { CannedFormValues } from './CannedForm';

// Port từ dashboard/routes/dashboard/settings/canned/AddCanned.vue
interface AddCannedProps {
    accountId: number;
    onClose: () => void;
    onCreated: (record: CannedResponse) => void;
    // Tạo từ một tin nhắn trong hộp thư: nội dung điền sẵn bằng tin đó.
    initialContent?: string;
}

export default function AddCanned({ accountId, onClose, onCreated, initialContent = '' }: AddCannedProps) {
    const [isCreating, setCreating] = useState(false);

    const addCannedResponse = async (values: CannedFormValues) => {
        setCreating(true);
        try {
            const record = await createCannedResponse(accountId, values);
            onCreated(record);
            useAlert(t('CANNED_MGMT.ADD.API.SUCCESS_MESSAGE'));
            onClose();
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('CANNED_MGMT.ADD.API.ERROR_MESSAGE'));
        } finally {
            setCreating(false);
        }
    };

    return (
        <CannedForm
            headerTitle={t('CANNED_MGMT.ADD.TITLE')}
            headerContent={t('CANNED_MGMT.ADD.DESC')}
            shortCodeLabel={t('CANNED_MGMT.ADD.FORM.SHORT_CODE.LABEL')}
            shortCodePlaceholder={t('CANNED_MGMT.ADD.FORM.SHORT_CODE.PLACEHOLDER')}
            contentLabel={t('CANNED_MGMT.ADD.FORM.CONTENT.LABEL')}
            contentPlaceholder={t('CANNED_MGMT.ADD.FORM.CONTENT.PLACEHOLDER')}
            cancelLabel={t('CANNED_MGMT.ADD.CANCEL_BUTTON_TEXT')}
            submitLabel={t('CANNED_MGMT.ADD.FORM.SUBMIT')}
            initialValues={{ short_code: '', content: initialContent }}
            isSubmitting={isCreating}
            onSubmit={values => void addCannedResponse(values)}
            onClose={onClose}
        />
    );
}
