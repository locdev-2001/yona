import { useEffect } from 'react';
import { router } from '@inertiajs/react';

/**
 * Còn sửa dở mà rời trang (đóng tab, tải lại, hay bấm sang trang khác trong
 * app) thì hỏi lại trước khi mất bản nháp. `beforeunload` lo trường hợp rời
 * hẳn trình duyệt; `router.on('before', …)` lo điều hướng trong app (Inertia
 * huỷ chuyến đi nếu handler trả về false).
 */
export function useUnsavedChangesGuard(isDirty: boolean, confirmMessage: string): void {
    useEffect(() => {
        if (!isDirty) return undefined;

        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);

        const removeInertiaGuard = router.on('before', () => window.confirm(confirmMessage));

        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
            removeInertiaGuard();
        };
    }, [isDirty, confirmMessage]);
}
