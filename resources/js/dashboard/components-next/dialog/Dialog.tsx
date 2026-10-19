import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';

// Port từ dashboard/components-next/dialog/Dialog.vue — <dialog> native,
// mở/đóng qua ref (tương đương defineExpose({open, close}) của bản gốc).
//
// Dialog là chủ sở hữu <form> DUY NHẤT của nội dung modal: nút `type="submit"`
// bên trong children sẽ chạy qua `onSubmit` của form này rồi gọi `onConfirm`.
// Children TUYỆT ĐỐI không được render <form> riêng — React không gọi `onSubmit`
// của form lồng nhau, submit sẽ rơi về hành vi mặc định (điều hướng GET).
export interface DialogHandle {
    open: () => void;
    close: () => void;
}

type DialogWidth = '3xl' | '2xl' | 'xl' | 'lg' | 'md' | 'sm';

interface DialogProps {
    type?: 'alert' | 'edit';
    title?: string;
    description?: string;
    // Slot #description của bản gốc (mô tả có liên kết/markup).
    descriptionSlot?: ReactNode;
    cancelButtonLabel?: string;
    confirmButtonLabel?: string;
    disableConfirmButton?: boolean;
    isLoading?: boolean;
    showCancelButton?: boolean;
    showConfirmButton?: boolean;
    overflowYAuto?: boolean;
    width?: DialogWidth;
    position?: 'center' | 'top';
    // Bấm nền mờ có đóng không; hộp chỉ đóng bằng Esc/nút thì tắt đi.
    closeOnBackdrop?: boolean;
    children?: ReactNode;
    footer?: ReactNode;
    onConfirm?: () => void;
    onClose?: () => void;
    // Sự kiện cancel gốc (Esc); gọi preventDefault để giữ hộp mở.
    onCancel?: (event: React.SyntheticEvent<HTMLDialogElement>) => void;
}

const MAX_WIDTH_CLASSES: Record<DialogWidth, string> = {
    '3xl': 'max-w-3xl',
    '2xl': 'max-w-2xl',
    xl: 'max-w-xl',
    lg: 'max-w-lg',
    md: 'max-w-md',
    sm: 'max-w-sm',
};

const Dialog = forwardRef<DialogHandle, DialogProps>(function Dialog(
    {
        type = 'edit',
        title = '',
        description = '',
        descriptionSlot,
        cancelButtonLabel = '',
        confirmButtonLabel = '',
        disableConfirmButton = false,
        isLoading = false,
        showCancelButton = true,
        showConfirmButton = true,
        overflowYAuto = false,
        width = 'lg',
        position = 'center',
        closeOnBackdrop = true,
        children,
        footer,
        onConfirm,
        onClose,
        onCancel,
    },
    ref,
) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [isOpen, setOpen] = useState(false);

    const close = () => {
        onClose?.();
        dialogRef.current?.close();
        setOpen(false);
    };

    useImperativeHandle(ref, () => ({
        open: () => {
            setOpen(true);
            dialogRef.current?.showModal();
        },
        close,
    }));

    // Chặn tái phạm bẫy form lồng — một querySelector mỗi lần mở modal.
    useEffect(() => {
        if (isOpen && dialogRef.current?.querySelector('form form')) {
            // eslint-disable-next-line no-console
            console.error(
                'Dialog: nội dung modal đang render <form> lồng trong form của Dialog. ' +
                    'Bỏ thẻ <form> đó và dùng prop onConfirm của Dialog.',
            );
        }
    }, [isOpen]);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        onConfirm?.();
    };

    const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
        if (closeOnBackdrop && event.target === dialogRef.current) close();
    };

    return (
        <dialog
            ref={dialogRef}
            className={[
                'w-full transition-all duration-300 ease-in-out shadow-overlay rounded-xl dialog-next',
                MAX_WIDTH_CLASSES[width] ?? 'max-w-md',
                position === 'top' ? 'dialog-position-top' : '',
                overflowYAuto ? 'overflow-y-auto' : 'overflow-visible',
            ]
                .filter(Boolean)
                .join(' ')}
            onClose={event => {
                if (event.target === dialogRef.current) close();
            }}
            onClick={handleBackdropClick}
            onCancel={onCancel}
        >
            <form
                className="flex flex-col w-full h-auto gap-6 p-6 overflow-visible text-start align-middle transition-all duration-300 ease-in-out transform bg-n-surface-raised rounded-xl"
                onSubmit={handleSubmit}
                onClick={event => event.stopPropagation()}
            >
                {title || description || descriptionSlot ? (
                    <div className="flex flex-col gap-2">
                        <h3 className="text-base font-medium leading-6 text-n-slate-12">{title}</h3>
                        {descriptionSlot ??
                            (description ? <p className="mb-0 text-sm text-n-slate-11">{description}</p> : null)}
                    </div>
                ) : null}
                {isOpen ? children : null}
                {footer ?? (
                    (showCancelButton || showConfirmButton) && (
                        <div className="flex items-center justify-between w-full gap-3">
                            {showCancelButton ? (
                                <Button
                                    variant="faded"
                                    color="slate"
                                    label={cancelButtonLabel || t('DIALOG.BUTTONS.CANCEL')}
                                    className="w-full"
                                    type="button"
                                    onClick={close}
                                />
                            ) : null}
                            {showConfirmButton ? (
                                <Button
                                    color={type === 'edit' ? 'blue' : 'ruby'}
                                    label={confirmButtonLabel || t('DIALOG.BUTTONS.CONFIRM')}
                                    className="w-full"
                                    isLoading={isLoading}
                                    disabled={disableConfirmButton || isLoading}
                                    type="submit"
                                />
                            ) : null}
                        </div>
                    )
                )}
            </form>
        </dialog>
    );
});

export default Dialog;
