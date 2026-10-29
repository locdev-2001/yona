import UnsavedChangesActions, { type UnsavedChangesActionsProps } from './UnsavedChangesActions';

/** Thanh lưu dính đáy của một tab cài đặt hộp thư, chỉ hiện khi có thay đổi chưa lưu để không che nội dung. */
export default function SettingsSaveBar(props: UnsavedChangesActionsProps) {
    if (!props.isDirty) return null;

    return (
        <div className="sticky bottom-0 z-10 flex justify-end mt-6 py-3 border-t border-n-weak bg-n-surface-1">
            <UnsavedChangesActions {...props} />
        </div>
    );
}
