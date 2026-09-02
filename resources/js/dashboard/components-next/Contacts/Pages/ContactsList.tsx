import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { ApiError } from 'dashboard/helper/apiClient';
import ContactsCard from 'dashboard/components-next/Contacts/ContactsCard/ContactsCard';
import { overlayPresence, useContactPresenceOverlay } from 'dashboard/components-next/avatar/presence';
import { updateContact } from 'dashboard/contacts/api';
import type { Contact, ContactFormState } from 'dashboard/contacts/types';
import type { DashboardPageProps } from '../../../types';

// Port từ dashboard/components-next/Contacts/Pages/ContactsList.vue —
// store contacts/update thay bằng gọi API + báo parent cập nhật danh sách;
// presence.update phủ availabilityStatus như UPDATE_CONTACTS_PRESENCE
// (contact vắng trong map → null).
interface ContactsListProps {
    contacts: Contact[];
    selectedContactIds?: number[];
    onToggleContact: (payload: { id: number; value?: boolean }) => void;
    onContactUpdated: (contact: Contact) => void;
    onContactDeleted: () => void;
}

// handleContactOperationErrors của store: 422 attributes → duplicate.
function alertUpdateError(error: unknown) {
    const i18nPrefix = 'CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.FORM';

    if (error instanceof ApiError && error.status === 422) {
        const attributes = (error.body as { attributes?: string[] } | null)?.attributes ?? [];

        if (attributes.includes('email')) {
            useAlert(t(`${i18nPrefix}.EMAIL_ADDRESS.DUPLICATE`));
            return;
        }
        if (attributes.includes('phone_number')) {
            useAlert(t(`${i18nPrefix}.PHONE_NUMBER.DUPLICATE`));
            return;
        }
        if (error.body?.message) {
            useAlert(error.body.message);
            return;
        }
    }
    useAlert(t('CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.ERROR_MESSAGE'));
}

export function mergeContactPresence(
    contacts: Contact[],
    presenceMap: Record<number, 'online'>,
    hasReceivedPresence: boolean,
): Contact[] {
    return overlayPresence<Contact, string | null>(
        contacts,
        presenceMap,
        hasReceivedPresence,
        null,
        contact => contact.id,
        (contact, availabilityStatus) => ({ ...contact, availabilityStatus }),
    );
}

export default function ContactsList({
    contacts: fetchedContacts,
    selectedContactIds = [],
    onToggleContact,
    onContactUpdated,
    onContactDeleted,
}: ContactsListProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const { presenceMap, hasReceivedPresence } = useContactPresenceOverlay();
    const contacts = mergeContactPresence(fetchedContacts, presenceMap, hasReceivedPresence);
    const [isUpdating, setUpdating] = useState(false);
    const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
    const [hoveredAvatarId, setHoveredAvatarId] = useState<number | null>(null);

    const selectedIdsSet = new Set(selectedContactIds);

    const handleUpdateContact = async (updatedData: ContactFormState) => {
        setUpdating(true);
        try {
            const updated = await updateContact(
                currentAccount.id,
                updatedData.id,
                updatedData as unknown as Record<string, unknown>,
            );
            onContactUpdated(updated);
            useAlert(t('CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.SUCCESS_MESSAGE'));
        } catch (error) {
            alertUpdateError(error);
        } finally {
            setUpdating(false);
        }
    };

    const onClickViewDetails = (id: number) => {
        router.visit(`/app/accounts/${currentAccount.id}/contacts/${id}${window.location.search}`);
    };

    const isSelected = (id: number) => selectedIdsSet.has(id);
    const shouldShowSelection = (id: number) => hoveredAvatarId === id || isSelected(id);

    return (
        <div className="flex flex-col gap-4">
            {contacts.map(contact => (
                <div key={contact.id} className="relative">
                    <ContactsCard
                        id={contact.id}
                        name={contact.name}
                        email={contact.email}
                        companyId={contact.companyId}
                        thumbnail={contact.thumbnail}
                        phoneNumber={contact.phoneNumber}
                        additionalAttributes={contact.additionalAttributes}
                        availabilityStatus={contact.availabilityStatus}
                        isExpanded={expandedCardId === contact.id}
                        isUpdating={isUpdating}
                        selectable={shouldShowSelection(contact.id)}
                        isSelected={isSelected(contact.id)}
                        onToggle={() =>
                            setExpandedCardId(current => (current === contact.id ? null : contact.id))
                        }
                        onUpdateContact={handleUpdateContact}
                        onShowContact={onClickViewDetails}
                        onSelect={value => onToggleContact({ id: contact.id, value })}
                        onAvatarHover={isHovered => setHoveredAvatarId(isHovered ? contact.id : null)}
                        onDeleted={onContactDeleted}
                    />
                </div>
            ))}
        </div>
    );
}
