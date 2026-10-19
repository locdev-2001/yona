import { useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { ICONS } from 'dashboard/icons';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { dynamicTime } from 'shared/helpers/timeHelper';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import Button from 'dashboard/components-next/button/Button';
import ContactsForm from 'dashboard/components-next/Contacts/ContactsForm/ContactsForm';
import type { ContactsFormHandle } from 'dashboard/components-next/Contacts/ContactsForm/ContactsForm';
import ConfirmContactDeleteDialog from 'dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog';
import ContactLabels from 'dashboard/components-next/Contacts/ContactLabels/ContactLabels';
import type { ConfirmContactDeleteDialogHandle } from 'dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog';
import { deleteContactAvatar, updateContact, updateContactAvatar } from 'dashboard/contacts/api';
import type { Contact, ContactFormState } from 'dashboard/contacts/types';
import type { DashboardPageProps } from '../../../types';

// Port từ dashboard/components-next/Contacts/Pages/ContactDetails.vue.
// fetchContactableInbox sau update (B3) bỏ.
interface ContactDetailsProps {
    selectedContact: Contact;
    onContactUpdated: (contact: Contact) => void;
    onGoToContactsList: () => void;
    // Hồ sơ đã hiện ảnh, tên và nhãn ở thẻ bên trái thì không lặp lại ở đây.
    showHeader?: boolean;
}

export default function ContactDetails({
    selectedContact,
    onContactUpdated,
    onGoToContactsList,
    showHeader = true,
}: ContactDetailsProps) {
    const { currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;
    const confirmDeleteContactDialogRef = useRef<ConfirmContactDeleteDialogHandle>(null);
    const contactsFormRef = useRef<ContactsFormHandle>(null);
    const contactDataRef = useRef<Record<string, unknown>>({ ...selectedContact });
    const [isFormInvalid, setFormInvalid] = useState(false);
    const [isUpdating, setUpdating] = useState(false);

    const createdAt = selectedContact.createdAt ? dynamicTime(selectedContact.createdAt) : '';
    const lastActivityAt = selectedContact.lastActivityAt ? dynamicTime(selectedContact.lastActivityAt) : '';
    // Ảnh đọc thẳng từ liên hệ đang hiển thị để ảnh đổi ở máy khác (contact.updated) cũng hiện ra.
    const avatarSrc = selectedContact.thumbnail || '';

    const handleFormUpdate = (updatedData: ContactFormState) => {
        contactDataRef.current = { ...contactDataRef.current, ...updatedData };
    };

    const handleUpdateContact = async () => {
        setUpdating(true);
        try {
            const { customAttributes, ...basicContactData } = contactDataRef.current;
            const updated = await updateContact(currentAccount.id, selectedContact.id, basicContactData);
            onContactUpdated(updated);
            useAlert(t('CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.SUCCESS_MESSAGE'));
        } catch {
            useAlert(t('CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.ERROR_MESSAGE'));
        } finally {
            setUpdating(false);
        }
    };

    const handleAvatarUpload = async ({ file }: { file: File }) => {
        try {
            const updated = await updateContactAvatar(currentAccount.id, selectedContact.id, file);
            onContactUpdated(updated);
            useAlert(t('CONTACTS_LAYOUT.DETAILS.AVATAR.UPLOAD.SUCCESS_MESSAGE'));
        } catch {
            useAlert(t('CONTACTS_LAYOUT.DETAILS.AVATAR.UPLOAD.ERROR_MESSAGE'));
        }
    };

    const handleAvatarDelete = async () => {
        try {
            const updated = await deleteContactAvatar(currentAccount.id, selectedContact.id);
            onContactUpdated(updated);
            useAlert(t('CONTACTS_LAYOUT.DETAILS.AVATAR.DELETE.SUCCESS_MESSAGE'));
        } catch {
            useAlert(t('CONTACTS_LAYOUT.DETAILS.AVATAR.DELETE.ERROR_MESSAGE'));
        }
    };

    return (
        <div className="flex flex-col items-start gap-8 pb-6">
            {showHeader ? (
                <div className="flex flex-col items-start gap-3">
                    <Avatar
                        seed={avatarSeed('contact', selectedContact.id)}
                        src={avatarSrc}
                        name={selectedContact.name || ''}
                        size={72}
                        allowUpload
                        onUpload={handleAvatarUpload}
                        onDelete={handleAvatarDelete}
                    />
                    <div className="flex flex-col gap-1">
                        <h3 className="text-base font-medium text-n-slate-12">{selectedContact.name}</h3>
                        <div className="flex flex-col gap-1.5">
                            {selectedContact.identifier ? (
                                <span className="inline-flex items-center gap-1 text-sm text-n-slate-11">
                                    <span className={`${ICONS.contactIdentifier} text-n-slate-10 size-4`} />
                                    {selectedContact.identifier}
                                </span>
                            ) : null}
                            <span className="inline-flex items-center gap-1 text-sm text-n-slate-11">
                                {selectedContact.identifier ? (
                                    <span className={`${ICONS.activity} text-n-slate-10 size-4`} />
                                ) : null}
                                {t('CONTACTS_LAYOUT.DETAILS.CREATED_AT', { date: createdAt })}
                                {' • '}
                                {t('CONTACTS_LAYOUT.DETAILS.LAST_ACTIVITY', { date: lastActivityAt })}
                            </span>
                        </div>
                    </div>
                    <ContactLabels contactId={selectedContact.id} />
                </div>
            ) : null}
            <div className="flex flex-col items-start gap-6">
                <ContactsForm
                    ref={contactsFormRef}
                    contactData={selectedContact}
                    isDetailsView
                    onUpdate={handleFormUpdate}
                    onValidityChange={setFormInvalid}
                />
                <Button
                    label={t('CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.UPDATE_BUTTON')}
                    size="sm"
                    isLoading={isUpdating}
                    disabled={isUpdating || isFormInvalid}
                    onClick={handleUpdateContact}
                />
            </div>
            {currentAccountUser.role === 'administrator' ? (
                <>
                    <div className="flex flex-col items-start w-full gap-4 pt-6">
                        <div className="flex flex-col gap-2">
                            <h6 className="text-base font-medium text-n-slate-12">
                                {t('CONTACTS_LAYOUT.DETAILS.DELETE_CONTACT')}
                            </h6>
                            <span className="text-sm text-n-slate-11">
                                {t('CONTACTS_LAYOUT.DETAILS.DELETE_CONTACT_DESCRIPTION')}
                            </span>
                        </div>
                        <Button
                            label={t('CONTACTS_LAYOUT.DETAILS.DELETE_CONTACT')}
                            color="ruby"
                            onClick={() => confirmDeleteContactDialogRef.current?.open()}
                        />
                    </div>
                    <ConfirmContactDeleteDialog
                        ref={confirmDeleteContactDialogRef}
                        accountId={currentAccount.id}
                        contactId={selectedContact.id}
                        onGoToContactsList={onGoToContactsList}
                    />
                </>
            ) : null}
        </div>
    );
}
