import { useEffect, useRef } from 'react';

import { t } from '../../../i18n';

export interface ConfirmActionRequest {
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
}

// Hộp xác nhận của màn kho sticker. Tự vẽ bằng màu tĩnh của theme vì màn này còn
// chạy trong console Super Admin, nơi không nạp biến màu mà Dialog của dashboard cần.
export default function ConfirmActionDialog({
    request,
    onClose,
}: {
    request: ConfirmActionRequest | null;
    onClose: () => void;
}) {
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!request) return;
        cancelButtonRef.current?.focus();
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', closeOnEscape);

        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [request, onClose]);

    if (!request) return null;

    const confirm = () => {
        onClose();
        request.onConfirm();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-action-title"
                aria-describedby="confirm-action-message"
                className="flex w-full max-w-md flex-col gap-4 rounded-xl bg-white p-6 shadow-xl"
                onClick={event => event.stopPropagation()}
            >
                <div className="flex flex-col gap-2">
                    <h3 id="confirm-action-title" className="m-0 text-base font-semibold text-slate-900">
                        {request.title}
                    </h3>
                    <p id="confirm-action-message" className="m-0 text-sm text-slate-600">
                        {request.message}
                    </p>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        className="reset-base inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                        onClick={onClose}
                    >
                        {t('STICKER_LIBRARY.CANCEL')}
                    </button>
                    <button
                        type="button"
                        className="reset-base inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                        onClick={confirm}
                    >
                        {request.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
