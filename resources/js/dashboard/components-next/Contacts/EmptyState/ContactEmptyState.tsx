import { useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import EmptyStateLayout from 'dashboard/components-next/EmptyStateLayout';
import CreateNewContactDialog from 'dashboard/components-next/Contacts/ContactsForm/CreateNewContactDialog';
import type { CreateNewContactDialogHandle } from 'dashboard/components-next/Contacts/ContactsForm/CreateNewContactDialog';
import Button from 'dashboard/components-next/button/Button';
import ContactsCard from 'dashboard/components-next/Contacts/ContactsCard/ContactsCard';
import contactContent from 'dashboard/components-next/Contacts/EmptyState/contactEmptyStateContent';
import { createContact } from 'dashboard/contacts/api';
import type { Contact } from 'dashboard/contacts/types';
import type { DashboardPageProps } from '../../../types';

// Port từ dashboard/components-next/Contacts/EmptyState/ContactEmptyState.vue.
interface ContactEmptyStateProps {
    title?: string;
    subtitle?: string;
    showButton?: boolean;
    buttonLabel?: string;
    className?: string;
    onCreated: (contact: Contact) => void;
}

export default function ContactEmptyState({
    title = '',
    subtitle = '',
    showButton = true,
    buttonLabel = '',
    className = '',
    onCreated,
}: ContactEmptyStateProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const createNewContactDialogRef = useRef<CreateNewContactDialogHandle>(null);
    const [isCreating, setCreating] = useState(false);

    const onCreate = async (contact: unknown) => {
        setCreating(true);
        try {
            const created = await createContact(currentAccount.id, contact as Record<string, unknown>);
            createNewContactDialogRef.current?.onSuccess();
            useAlert(t('CONTACTS_LAYOUT.HEADER.ACTIONS.CONTACT_CREATION.SUCCESS_MESSAGE'));
            onCreated(created);
        } catch {
            useAlert(t('CONTACTS_LAYOUT.HEADER.ACTIONS.CONTACT_CREATION.ERROR_MESSAGE'));
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className={className}>
            <EmptyStateLayout
                title={title}
                subtitle={subtitle}
                emptyStateItem={
                    <div className="grid grid-cols-1 gap-4 p-px overflow-hidden">
                        {contactContent.slice(0, 5).map(contact => (
                            <ContactsCard
                                key={contact.id}
                                id={contact.id}
                                name={contact.name}
                                email={contact.email}
                                thumbnail={contact.thumbnail}
                                phoneNumber={contact.phoneNumber}
                                additionalAttributes={contact.additionalAttributes}
                                isExpanded={false}
                            />
                        ))}
                    </div>
                }
                actions={
                    showButton ? (
                        <div>
                            <Button
                                label={buttonLabel}
                                icon="i-lucide-plus"
                                onClick={() => createNewContactDialogRef.current?.open()}
                            />
                            <CreateNewContactDialog
                                ref={createNewContactDialogRef}
                                isCreating={isCreating}
                                onCreate={onCreate}
                            />
                        </div>
                    ) : undefined
                }
            />
        </div>
    );
}
