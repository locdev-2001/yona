import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { ApiError } from 'dashboard/helper/apiClient';
import { createContact } from 'dashboard/contacts/api';
import ContactHeader from 'dashboard/components-next/Contacts/ContactsHeader/ContactHeader';
import type { SortState } from './components/ContactSortMenu';
import CreateNewContactDialog from 'dashboard/components-next/Contacts/ContactsForm/CreateNewContactDialog';
import type { CreateNewContactDialogHandle } from 'dashboard/components-next/Contacts/ContactsForm/CreateNewContactDialog';
import type { Contact, ContactFormState } from 'dashboard/contacts/types';
import type { DashboardPageProps } from '../../../types';

// Port từ dashboard/components-next/Contacts/ContactsHeader/ContactListHeaderWrapper.vue.
// Bỏ ở B2 (nhóm C): Import/Export dialog, Create/Delete segment dialog,
// ContactsFilter — chỉ còn luồng tạo contact mới.
interface ContactListHeaderWrapperProps {
    showSearch?: boolean;
    searchValue?: string;
    activeSort?: string;
    activeOrdering?: string;
    headerTitle?: string;
    isLabelView?: boolean;
    isActiveView?: boolean;
    onUpdateSort: (state: SortState) => void;
    onSearch: (value: string) => void;
    onContactCreated: (contact: Contact) => void;
}

// DuplicateContactException của bản gốc: 422 có attributes chứa cột trùng.
function alertContactCreationError(error: unknown) {
    const i18nPrefix = 'CONTACTS_LAYOUT.HEADER.ACTIONS.CONTACT_CREATION';

    if (error instanceof ApiError && error.status === 422) {
        const attributes = (error.body as { attributes?: string[] } | null)?.attributes ?? [];

        if (attributes.includes('email')) {
            useAlert(t(`${i18nPrefix}.EMAIL_ADDRESS_DUPLICATE`));
            return;
        }
        if (attributes.includes('phone_number')) {
            useAlert(t(`${i18nPrefix}.PHONE_NUMBER_DUPLICATE`));
            return;
        }
        if (error.body?.message) {
            useAlert(error.body.message);
            return;
        }
    }
    useAlert(t(`${i18nPrefix}.ERROR_MESSAGE`));
}

export interface ContactListHeaderWrapperHandle {
    openCreateNewContactDialog: () => void;
}

const ContactListHeaderWrapper = forwardRef<ContactListHeaderWrapperHandle, ContactListHeaderWrapperProps>(
    function ContactListHeaderWrapper(
        {
            showSearch = true,
            searchValue = '',
            activeSort = 'last_activity_at',
            activeOrdering = '',
            headerTitle = '',
            isLabelView = false,
            isActiveView = false,
            onUpdateSort,
            onSearch,
            onContactCreated,
        },
        ref,
    ) {
        const { currentAccount } = usePage<DashboardPageProps>().props;
        const createNewContactDialogRef = useRef<CreateNewContactDialogHandle>(null);
        const [isCreating, setCreating] = useState(false);

        useImperativeHandle(ref, () => ({
            openCreateNewContactDialog: () => createNewContactDialogRef.current?.open(),
        }));

        const onCreate = async (contact: ContactFormState) => {
            setCreating(true);
            try {
                const created = await createContact(currentAccount.id, contact as unknown as Record<string, unknown>);
                createNewContactDialogRef.current?.onSuccess();
                useAlert(t('CONTACTS_LAYOUT.HEADER.ACTIONS.CONTACT_CREATION.SUCCESS_MESSAGE'));
                onContactCreated(created);
            } catch (error) {
                alertContactCreationError(error);
            } finally {
                setCreating(false);
            }
        };

        return (
            <>
                <ContactHeader
                    showSearch={showSearch}
                    searchValue={searchValue}
                    activeSort={activeSort}
                    activeOrdering={activeOrdering}
                    headerTitle={headerTitle}
                    isLabelView={isLabelView}
                    isActiveView={isActiveView}
                    buttonLabel={t('CONTACTS_LAYOUT.HEADER.MESSAGE_BUTTON')}
                    onSearch={onSearch}
                    onUpdateSort={onUpdateSort}
                    onAdd={() => createNewContactDialogRef.current?.open()}
                />

                <CreateNewContactDialog ref={createNewContactDialogRef} isCreating={isCreating} onCreate={onCreate} />
            </>
        );
    },
);

export default ContactListHeaderWrapper;
