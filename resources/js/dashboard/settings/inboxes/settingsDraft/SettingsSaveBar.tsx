import UnsavedChangesActions, { type UnsavedChangesActionsProps } from './UnsavedChangesActions';

/** Thanh lưu dính đáy của một tab cài đặt hộp thư — luôn nằm cùng chỗ, dù tab dài hay ngắn. */
export default function SettingsSaveBar(props: UnsavedChangesActionsProps) {
    return (
        <div className="sticky bottom-0 z-10 flex justify-end mt-6 py-3 border-t border-n-weak bg-n-background">
            <UnsavedChangesActions {...props} />
        </div>
    );
}
