import { useEffect, useRef } from 'react';

import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    cancelLabel: string;
    confirmLabel: string;
    danger?: boolean;
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

// Hộp xác nhận điều khiển bằng state (Dialog gốc mở qua ref). Esc, bấm nền hay
// nút huỷ đều đi qua onCancel.
export default function ConfirmDialog({
    open,
    title,
    description,
    cancelLabel,
    confirmLabel,
    danger = false,
    isLoading = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const dialogRef = useRef<DialogHandle>(null);
    const isOpenRef = useRef(false);

    useEffect(() => {
        if (open && !isOpenRef.current) {
            isOpenRef.current = true;
            dialogRef.current?.open();
        }
        if (!open && isOpenRef.current) {
            isOpenRef.current = false;
            dialogRef.current?.close();
        }
    }, [open]);

    return (
        <Dialog
            ref={dialogRef}
            type={danger ? 'alert' : 'edit'}
            width="md"
            title={title}
            description={description}
            cancelButtonLabel={cancelLabel}
            confirmButtonLabel={confirmLabel}
            isLoading={isLoading}
            onConfirm={onConfirm}
            onClose={() => {
                if (!isOpenRef.current) return;
                isOpenRef.current = false;
                onCancel();
            }}
        />
    );
}
