import { useEffect, useId } from 'react';
import { router } from '@inertiajs/react';

// Các form đang có bản nháp chưa lưu trên trang: để chỗ đổi tab (không phải điều
// hướng trình duyệt hay Inertia) cũng hỏi lại được qua confirmDiscardUnsavedChanges.
const dirtyForms = new Set<string>();

/**
 * Còn sửa dở mà rời trang (đóng tab, tải lại, hay bấm sang trang khác trong
 * app) thì hỏi lại trước khi mất bản nháp. `beforeunload` lo trường hợp rời
 * hẳn trình duyệt; `router.on('before', …)` lo điều hướng trong app (Inertia
 * huỷ chuyến đi nếu handler trả về false).
 */
export function useUnsavedChangesGuard(isDirty: boolean, confirmMessage: string): void {
    const formId = useId();

    useEffect(() => {
        if (!isDirty) return undefined;

        dirtyForms.add(formId);
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);

        const removeInertiaGuard = router.on('before', () => window.confirm(confirmMessage));

        return () => {
            dirtyForms.delete(formId);
            window.removeEventListener('beforeunload', onBeforeUnload);
            removeInertiaGuard();
        };
    }, [formId, isDirty, confirmMessage]);
}

/** true nếu không có gì sửa dở, hoặc người dùng đồng ý bỏ bản nháp. */
export function confirmDiscardUnsavedChanges(confirmMessage: string): boolean {
    return dirtyForms.size === 0 || window.confirm(confirmMessage);
}
