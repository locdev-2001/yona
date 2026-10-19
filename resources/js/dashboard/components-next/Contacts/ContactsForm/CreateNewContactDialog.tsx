import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { t } from '../../../../i18n';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Button from 'dashboard/components-next/button/Button';
import ContactsForm from './ContactsForm';
import type { ContactsFormHandle } from './ContactsForm';
import type { ContactFormState } from 'dashboard/contacts/types';

// Port từ dashboard/components-next/Contacts/ContactsForm/CreateNewContactDialog.vue.
export interface CreateNewContactDialogHandle {
    open: () => void;
    close: () => void;
    onSuccess: () => void;
}

interface CreateNewContactDialogProps {
    isCreating?: boolean;
    onCreate: (contact: ContactFormState) => void;
}

const CreateNewContactDialog = forwardRef<CreateNewContactDialogHandle, CreateNewContactDialogProps>(
    function CreateNewContactDialog({ isCreating = false, onCreate }, ref) {
        const dialogRef = useRef<DialogHandle>(null);
        const contactsFormRef = useRef<ContactsFormHandle>(null);
        const contactRef = useRef<ContactFormState | null>(null);
        const [isFormInvalid, setFormInvalid] = useState(true);

        useImperativeHandle(ref, () => ({
            open: () => dialogRef.current?.open(),
            close: () => dialogRef.current?.close(),
            onSuccess: () => {
                contactsFormRef.current?.resetForm();
                contactRef.current = null;
                dialogRef.current?.close();
            },
        }));

        const handleDialogConfirm = () => {
            if (!contactRef.current) return;
            onCreate(contactRef.current);
        };

        return (
            <Dialog
                ref={dialogRef}
                width="3xl"
                overflowYAuto
                onConfirm={handleDialogConfirm}
                footer={
                    <div className="flex items-center justify-between w-full gap-3">
                        <Button
                            label={t('DIALOG.BUTTONS.CANCEL')}
                            variant="link"
                            type="reset"
                            className="h-10 hover:!no-underline hover:text-n-brand"
                            onClick={() => dialogRef.current?.close()}
                        />
                        <Button
                            type="submit"
                            label={t('CONTACTS_LAYOUT.HEADER.ACTIONS.CONTACT_CREATION.SAVE_CONTACT')}
                            color="blue"
                            disabled={isFormInvalid}
                            isLoading={isCreating}
                        />
                    </div>
                }
            >
                <ContactsForm
                    ref={contactsFormRef}
                    isNewContact
                    onUpdate={contact => {
                        contactRef.current = contact;
                    }}
                    onValidityChange={setFormInvalid}
                />
            </Dialog>
        );
    },
);

export default CreateNewContactDialog;
