import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Input from 'dashboard/components-next/input/Input';
import { t } from '../../../../i18n';

// Port từ components-next/Contacts/ContactsForm/CreateSegmentDialog.vue.
// Dialog là chủ sở hữu <form> duy nhất — component này KHÔNG render <form>.
interface CreateSegmentDialogProps {
    isCreating?: boolean;
    onCreate: (name: string) => void;
}

const CreateSegmentDialog = forwardRef<DialogHandle, CreateSegmentDialogProps>(function CreateSegmentDialog(
    { isCreating = false, onCreate },
    ref,
) {
    const dialogRef = useRef<DialogHandle>(null);
    const [name, setName] = useState('');
    const [touched, setTouched] = useState(false);

    useImperativeHandle(ref, () => ({
        open: () => dialogRef.current?.open(),
        close: () => dialogRef.current?.close(),
    }));

    const handleConfirm = () => {
        setTouched(true);
        if (!name.trim()) return;
        onCreate(name);
        setName('');
        setTouched(false);
    };

    const hasError = touched && !name.trim();

    return (
        <Dialog
            ref={dialogRef}
            title={t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.CREATE_SEGMENT.TITLE')}
            confirmButtonLabel={t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.CREATE_SEGMENT.CONFIRM')}
            isLoading={isCreating}
            disableConfirmButton={isCreating}
            onConfirm={handleConfirm}
        >
            <Input
                value={name}
                label={t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.CREATE_SEGMENT.LABEL')}
                placeholder={t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.CREATE_SEGMENT.PLACEHOLDER')}
                message={hasError ? t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.CREATE_SEGMENT.ERROR') : ''}
                messageType={hasError ? 'error' : 'info'}
                onChange={event => setName(event.target.value)}
            />
        </Dialog>
    );
});

export default CreateSegmentDialog;
