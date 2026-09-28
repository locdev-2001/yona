import { useId, useRef } from 'react';
import type { ReactNode } from 'react';

import { t } from '../../../i18n';
import { Modal, StickerButton } from './stickerLibraryUi';

export interface ConfirmActionRequest {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    tone?: 'danger' | 'primary';
    preview?: ReactNode;
    onConfirm: () => void;
    onCancel?: () => void;
}

// Hộp xác nhận: giữa màn trên desktop, bottom sheet trên điện thoại (nút xác nhận ở trên).
export default function ConfirmActionDialog({ request, onClose }: { request: ConfirmActionRequest | null; onClose: () => void }) {
    const cancelRef = useRef<HTMLButtonElement>(null);
    const messageId = useId();

    const cancel = () => {
        onClose();
        request?.onCancel?.();
    };

    const confirm = () => {
        onClose();
        request?.onConfirm();
    };

    return (
        <Modal
            open={request !== null}
            title={request?.title ?? ''}
            role="alertdialog"
            describedBy={messageId}
            initialFocusRef={cancelRef}
            onRequestClose={cancel}
        >
            {request ? (
                <div className="flex flex-col gap-5 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-1 md:pb-5">
                    <div className="flex items-center gap-3">
                        {request.preview}
                        <p id={messageId} className="m-0 text-sm text-n-slate-11">
                            {request.message}
                        </p>
                    </div>
                    <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
                        <StickerButton ref={cancelRef} tone="secondary" size="sheet" onClick={cancel}>
                            {request.cancelLabel ?? t('STICKER_LIBRARY.CANCEL')}
                        </StickerButton>
                        <StickerButton tone={request.tone ?? 'danger'} size="sheet" onClick={confirm}>
                            {request.confirmLabel}
                        </StickerButton>
                    </div>
                </div>
            ) : null}
        </Modal>
    );
}
