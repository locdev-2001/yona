import { forwardRef, useImperativeHandle, useRef } from 'react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { deleteContact } from 'dashboard/contacts/api';

// Port từ dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog.vue.
export interface ConfirmContactDeleteDialogHandle {
    open: () => void;
    close: () => void;
}

interface ConfirmContactDeleteDialogProps {
    accountId: number;
    contactId: number;
    // goToContactsList (trang chi tiết) / refetch danh sách (trang list).
    onGoToContactsList?: () => void;
    onDeleted?: () => void;
}

const ConfirmContactDeleteDialog = forwardRef<ConfirmContactDeleteDialogHandle, ConfirmContactDeleteDialogProps>(
    function ConfirmContactDeleteDialog({ accountId, contactId, onGoToContactsList, onDeleted }, ref) {
        const dialogRef = useRef<DialogHandle>(null);

        useImperativeHandle(ref, () => ({
            open: () => dialogRef.current?.open(),
            close: () => dialogRef.current?.close(),
        }));

        const handleDialogConfirm = async () => {
            onGoToContactsList?.();
            try {
                await deleteContact(accountId, contactId);
                useAlert(t('CONTACTS_LAYOUT.DETAILS.DELETE_DIALOG.API.SUCCESS_MESSAGE'));
                onDeleted?.();
            } catch {
                useAlert(t('CONTACTS_LAYOUT.DETAILS.DELETE_DIALOG.API.ERROR_MESSAGE'));
            }
            dialogRef.current?.close();
        };

        return (
            <Dialog
                ref={dialogRef}
                type="alert"
                title={t('CONTACTS_LAYOUT.DETAILS.DELETE_DIALOG.TITLE')}
                description={t('CONTACTS_LAYOUT.DETAILS.DELETE_DIALOG.DESCRIPTION')}
                confirmButtonLabel={t('CONTACTS_LAYOUT.DETAILS.DELETE_DIALOG.CONFIRM')}
                onConfirm={handleDialogConfirm}
            />
        );
    },
);

export default ConfirmContactDeleteDialog;
