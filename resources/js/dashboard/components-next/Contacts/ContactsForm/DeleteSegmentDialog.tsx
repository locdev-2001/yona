import { forwardRef, useImperativeHandle, useRef } from 'react';

import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { t } from '../../../../i18n';

// Port từ components-next/Contacts/ContactsForm/DeleteSegmentDialog.vue.
const DeleteSegmentDialog = forwardRef<DialogHandle, { isDeleting?: boolean; onDelete: () => void }>(
    function DeleteSegmentDialog({ isDeleting = false, onDelete }, ref) {
        const dialogRef = useRef<DialogHandle>(null);

        useImperativeHandle(ref, () => ({
            open: () => dialogRef.current?.open(),
            close: () => dialogRef.current?.close(),
        }));

        return (
            <Dialog
                ref={dialogRef}
                type="alert"
                title={t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.DELETE_SEGMENT.TITLE')}
                description={t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.DELETE_SEGMENT.DESCRIPTION')}
                confirmButtonLabel={t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.DELETE_SEGMENT.CONFIRM')}
                isLoading={isDeleting}
                disableConfirmButton={isDeleting}
                onConfirm={onDelete}
            />
        );
    },
);

export default DeleteSegmentDialog;
