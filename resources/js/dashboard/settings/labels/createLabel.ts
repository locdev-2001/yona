import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import { getRandomColor } from 'dashboard/helper/labelColor';
import type { LabelFormValues } from './LabelForm';
import type { Label } from './types';
import { normalizeLabelTitle } from './validations';

// Giá trị mặc định của một nhãn mới — form đầy đủ và tạo nhanh ở khung chọn nhãn dùng chung.
export function newLabelValues(title = ''): LabelFormValues {
    return {
        title: normalizeLabelTitle(title),
        description: '',
        color: getRandomColor(),
        show_on_sidebar: true,
    };
}

// Tạo nhãn và báo kết quả cho người dùng; lỗi thì trả null.
export async function createLabel(accountId: number, values: LabelFormValues): Promise<Label | null> {
    try {
        const label = await postJson<Label>(`/api/v1/accounts/${accountId}/labels`, { ...values });
        useAlert(t('LABEL_MGMT.ADD.API.SUCCESS_MESSAGE'));
        return label;
    } catch (error) {
        useAlert(parseApiErrorMessage(error) || t('LABEL_MGMT.ADD.API.ERROR_MESSAGE'));
        return null;
    }
}
