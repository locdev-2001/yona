import { t } from '../../../../i18n';
import Button from 'dashboard/components-next/button/Button';

export interface UnsavedChangesActionsProps {
    isDirty: boolean;
    isSaving: boolean;
    /** Chặn lưu dù có thay đổi (vd ô đang nhập sai). */
    isSaveBlocked?: boolean;
    onCancel: () => void;
    onSave: () => void;
}

/** "Có thay đổi chưa lưu" + Huỷ + Lưu thay đổi — cùng một bộ cho màn Widget chat và mọi tab cài đặt hộp thư. */
export default function UnsavedChangesActions({
    isDirty,
    isSaving,
    isSaveBlocked = false,
    onCancel,
    onSave,
}: UnsavedChangesActionsProps) {
    return (
        <div className="flex items-center gap-3">
            {isDirty ? <span className="text-label-small text-n-amber-11">{t('SETTINGS_DRAFT.UNSAVED')}</span> : null}
            <Button
                variant="ghost"
                color="slate"
                label={t('SETTINGS_DRAFT.CANCEL')}
                disabled={!isDirty || isSaving}
                onClick={onCancel}
            />
            <Button
                label={t('SETTINGS_DRAFT.SAVE')}
                isLoading={isSaving}
                disabled={!isDirty || isSaveBlocked}
                onClick={onSave}
            />
        </div>
    );
}
