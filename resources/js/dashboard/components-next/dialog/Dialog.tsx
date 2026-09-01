import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';

// Port từ dashboard/components-next/dialog/Dialog.vue — <dialog> native,
// mở/đóng qua ref (tương đương defineExpose({open, close}) của bản gốc).
export interface DialogHandle {
    open: () => void;
    close: () => void;
}

type DialogWidth = '3xl' | '2xl' | 'xl' | 'lg' | 'md' | 'sm';

interface DialogProps {
    type?: 'alert' | 'edit';
    title?: string;
    description?: string;
    cancelButtonLabel?: string;
    confirmButtonLabel?: string;
    disableConfirmButton?: boolean;
    isLoading?: boolean;
    showCancelButton?: boolean;
    showConfirmButton?: boolean;
    overflowYAuto?: boolean;
    width?: DialogWidth;
    position?: 'center' | 'top';
    children?: ReactNode;
    footer?: ReactNode;
    onConfirm?: () => void;
    onClose?: () => void;
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
        cancelButtonLabel = '',
        confirmButtonLabel = '',
        disableConfirmButton = false,
        isLoading = false,
        showCancelButton = true,
        showConfirmButton = true,
        overflowYAuto = false,
        width = 'lg',
        position = 'center',
        children,
        footer,
        onConfirm,
        onClose,
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

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        onConfirm?.();
    };

    const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
        if (event.target === dialogRef.current) close();
    };

    return (
        <dialog
            ref={dialogRef}
            className={[
                'w-full transition-all duration-300 ease-in-out shadow-xl rounded-xl dialog-next',
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
        >
            <form
                className="flex flex-col w-full h-auto gap-6 p-6 overflow-visible text-start align-middle transition-all duration-300 ease-in-out transform bg-n-alpha-3 backdrop-blur-[100px] shadow-xl rounded-xl"
                onSubmit={handleSubmit}
                onClick={event => event.stopPropagation()}
            >
                {title || description ? (
                    <div className="flex flex-col gap-2">
                        <h3 className="text-base font-medium leading-6 text-n-slate-12">{title}</h3>
                        {description ? <p className="mb-0 text-sm text-n-slate-11">{description}</p> : null}
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
