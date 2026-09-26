import { useState } from 'react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { updateCannedResponse } from 'dashboard/composables/useCannedResponses';
import type { CannedResponse } from 'dashboard/composables/useCannedResponses';
import CannedForm from './CannedForm';
import type { CannedFormValues } from './CannedForm';
import CardCannedView from './CardCannedView';

// Port từ dashboard/routes/dashboard/settings/canned/EditCanned.vue
interface EditCannedProps {
    accountId: number;
    record: CannedResponse;
    onClose: () => void;
    onUpdated: (record: CannedResponse) => void;
}

export default function EditCanned({ accountId, record, onClose, onUpdated }: EditCannedProps) {
    const [isUpdating, setUpdating] = useState(false);

    const editCannedResponse = async (payload: CannedFormValues | { short_code: string }) => {
        setUpdating(true);
        try {
            const updated = await updateCannedResponse(accountId, record.id, payload);
            onUpdated(updated);
            useAlert(t('CANNED_MGMT.EDIT.API.SUCCESS_MESSAGE'));
            // Gốc chờ 10ms trước khi đóng để alert kịp gắn vào DOM.
            setTimeout(onClose, 10);
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('CANNED_MGMT.EDIT.API.ERROR_MESSAGE'));
        } finally {
            setUpdating(false);
        }
    };

    // Câu trả lời mẫu mang thẻ: không mở form JSON, chỉ đổi mã tắt — gửi mỗi
    // short_code, không đụng đến content/content_type/content_attributes đã lưu.
    if (record.content_type) {
        return (
            <CardCannedView
                accountId={accountId}
                record={record}
                isSubmitting={isUpdating}
                onSubmit={shortCode => void editCannedResponse({ short_code: shortCode })}
                onClose={onClose}
            />
        );
    }

    return (
        <CannedForm
            headerTitle={`${t('CANNED_MGMT.EDIT.TITLE')} - ${record.short_code}`}
            shortCodeLabel={t('CANNED_MGMT.EDIT.FORM.SHORT_CODE.LABEL')}
            shortCodePlaceholder={t('CANNED_MGMT.EDIT.FORM.SHORT_CODE.PLACEHOLDER')}
            contentLabel={t('CANNED_MGMT.EDIT.FORM.CONTENT.LABEL')}
            contentPlaceholder={t('CANNED_MGMT.EDIT.FORM.CONTENT.PLACEHOLDER')}
            cancelLabel={t('CANNED_MGMT.EDIT.CANCEL_BUTTON_TEXT')}
            submitLabel={t('CANNED_MGMT.EDIT.FORM.SUBMIT')}
            touchShortCodeOnInput
            initialValues={{ short_code: record.short_code, content: record.content }}
            isSubmitting={isUpdating}
            onSubmit={values => void editCannedResponse(values)}
            onClose={onClose}
        />
    );
}
