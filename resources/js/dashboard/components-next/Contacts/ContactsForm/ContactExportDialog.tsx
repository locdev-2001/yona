import { forwardRef, useImperativeHandle, useRef } from 'react';

import { t } from '../../../../i18n';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { buildConversationFilterPayload } from 'dashboard/components-next/filter/helper/filterQuery';
import type { ConversationFilterPayload } from 'dashboard/components-next/filter/helper/filterQuery';
import type { ConversationFilterCondition } from 'dashboard/components-next/filter/helper/filterHelper';
import type { CustomView } from 'dashboard/composables/useCustomViews';

// Port từ components-next/Contacts/ContactsForm/ContactExportDialog.vue.
export interface ContactExportQuery {
    payload: ConversationFilterPayload[];
    label: string;
}

interface ContactExportDialogProps {
    activeSegment?: CustomView | null;
    appliedFilters?: ConversationFilterCondition[];
    activeLabel?: string;
    isExporting?: boolean;
    onExport: (query: ContactExportQuery) => void;
}

const ContactExportDialog = forwardRef<DialogHandle, ContactExportDialogProps>(function ContactExportDialog(
    { activeSegment = null, appliedFilters = [], activeLabel = '', isExporting = false, onExport },
    ref,
) {
    const dialogRef = useRef<DialogHandle>(null);

    useImperativeHandle(ref, () => ({
        open: () => dialogRef.current?.open(),
        close: () => dialogRef.current?.close(),
    }));

    const handleConfirm = () => {
        const payload = activeSegment
            ? ((activeSegment.query?.payload ?? []) as ConversationFilterPayload[])
            : appliedFilters.length
              ? buildConversationFilterPayload(appliedFilters)
              : [];

        onExport({ payload, label: activeLabel });
        dialogRef.current?.close();
    };

    return (
        <Dialog
            ref={dialogRef}
            title={t('CONTACTS_LAYOUT.HEADER.ACTIONS.EXPORT_CONTACT.TITLE')}
            description={t('CONTACTS_LAYOUT.HEADER.ACTIONS.EXPORT_CONTACT.DESCRIPTION')}
            confirmButtonLabel={t('CONTACTS_LAYOUT.HEADER.ACTIONS.EXPORT_CONTACT.CONFIRM')}
            isLoading={isExporting}
            disableConfirmButton={isExporting}
            onConfirm={handleConfirm}
        />
    );
});

export default ContactExportDialog;
