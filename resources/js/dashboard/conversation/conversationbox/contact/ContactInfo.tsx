import { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import NextButton from 'dashboard/components-next/button/Button';
import ConfirmContactDeleteDialog from 'dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog';
import type { ConfirmContactDeleteDialogHandle } from 'dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog';
import { useAlert } from 'dashboard/composables/useAlert';
import { patchJson, parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import type { ContactMeta } from 'dashboard/conversation/types';
import { t } from '../../../../i18n';
import type { DashboardPageProps } from '../../../types';
import ContactInfoRow from './ContactInfoRow';

// Port từ routes/dashboard/conversation/contact/ContactInfo.vue — avatar + tên
// + các dòng email/phone/identifier/company/location (copy + sửa inline qua
// PATCH /contacts/{id} của B2) + hàng nút. Bỏ: sửa tên inline (InlineInput — dùng
// trang contact), SocialIcons, mô tả, tooltip created_at (meta.sender chưa mang
// created_at), ComposeConversation (nhóm B) + ContactMergeModal (nhóm sau) +
// VoiceCallButton (EE) → 3 nút này KHÔNG render (không để placeholder chết);
// Edit → trang chi tiết contact (EditContact modal tái dùng ở nhóm sau).
interface ContactInfoProps {
    contact: ContactMeta;
    onPanelClose: () => void;
}

type EditableField = 'email' | 'phone_number' | 'company_name';

export default function ContactInfo({ contact: initialContact, onPanelClose }: ContactInfoProps) {
    const { currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const isAdmin = currentAccountUser.role === 'administrator';
    const [contact, setContact] = useState<ContactMeta>(initialContact);
    const deleteDialogRef = useRef<ConfirmContactDeleteDialogHandle>(null);

    useEffect(() => {
        setContact(initialContact);
    }, [initialContact]);

    const additionalAttributes = (contact.additional_attributes ?? {}) as Record<string, string | undefined>;
    const location = [additionalAttributes.city, additionalAttributes.country].filter(Boolean).join(', ');
    const contactProfileLink = accountScopedUrl(accountId, `contacts/${contact.id}`);

    const updateContactField = async (field: EditableField, value: string) => {
        const payload =
            field === 'company_name'
                ? { additional_attributes: { ...additionalAttributes, company_name: value } }
                : { [field]: value };
        try {
            await patchJson(`/api/v1/accounts/${accountId}/contacts/${contact.id}`, payload);
            setContact(current =>
                field === 'company_name'
                    ? { ...current, additional_attributes: { ...additionalAttributes, company_name: value } }
                    : { ...current, [field]: value },
            );
            useAlert(t('CONTACT_FORM.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('CONTACT_FORM.ERROR_MESSAGE'));
        }
    };

    return (
        <div className="relative items-center w-full p-4">
            <div className="flex flex-col w-full gap-2 text-left rtl:text-right">
                <div className="flex flex-row justify-between">
                    <Avatar
                        src={contact.thumbnail}
                        name={contact.name ?? ''}
                        status={(contact.availability_status as 'online' | 'busy' | 'offline') ?? null}
                        size={48}
                        hideOfflineStatus
                    />
                </div>

                <div className="flex flex-col items-start gap-1.5 min-w-0 w-full">
                    <div className="flex items-center w-full min-w-0 gap-2">
                        <div className="group/name flex items-center min-w-0 gap-2">
                            <h3 className="flex-shrink max-w-full min-w-0 my-0 text-base capitalize break-words text-n-slate-12">
                                {contact.name}
                            </h3>
                        </div>
                        <div className="flex flex-row items-center gap-2">
                            <a href={contactProfileLink} target="_blank" rel="noopener nofollow noreferrer" className="leading-3">
                                <span className="i-lucide-external-link text-sm text-n-slate-10" />
                            </a>
                        </div>
                    </div>

                    <div className="flex flex-col items-start w-full gap-2">
                        <ContactInfoRow
                            href={contact.email ? `mailto:${contact.email}` : ''}
                            value={contact.email}
                            icon="mail"
                            emoji="✉️"
                            title={t('CONTACT_PANEL.EMAIL_ADDRESS')}
                            showCopy
                            editable
                            onUpdate={value => updateContactField('email', value)}
                        />
                        <ContactInfoRow
                            href={contact.phone_number ? `tel:${contact.phone_number}` : ''}
                            value={contact.phone_number}
                            icon="call"
                            emoji="📞"
                            title={t('CONTACT_PANEL.PHONE_NUMBER')}
                            showCopy
                            editable
                            onUpdate={value => updateContactField('phone_number', value)}
                        />
                        {contact.identifier ? (
                            <ContactInfoRow value={contact.identifier} icon="contact-identify" emoji="🪪" title={t('CONTACT_PANEL.IDENTIFIER')} />
                        ) : null}
                        <ContactInfoRow
                            value={additionalAttributes.company_name}
                            icon="building-bank"
                            emoji="🏢"
                            title={t('CONTACT_PANEL.COMPANY')}
                            editable
                            onUpdate={value => updateContactField('company_name', value)}
                        />
                        {location || additionalAttributes.location ? (
                            <ContactInfoRow
                                value={location || additionalAttributes.location}
                                icon="map"
                                emoji="🌍"
                                title={t('CONTACT_PANEL.LOCATION')}
                            />
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center w-full mt-0.5 gap-2">
                    <NextButton
                        title={t('EDIT_CONTACT.BUTTON_LABEL')}
                        icon="i-ph-pencil-simple"
                        slate
                        faded
                        sm
                        onClick={() => router.visit(contactProfileLink)}
                    />
                    {isAdmin ? (
                        <NextButton
                            title={t('DELETE_CONTACT.BUTTON_LABEL')}
                            icon="i-ph-trash"
                            slate
                            faded
                            sm
                            ruby
                            onClick={() => deleteDialogRef.current?.open()}
                        />
                    ) : null}
                </div>
                {isAdmin ? (
                    <ConfirmContactDeleteDialog
                        ref={deleteDialogRef}
                        accountId={accountId}
                        contactId={contact.id}
                        onDeleted={() => {
                            onPanelClose();
                            router.visit(accountScopedUrl(accountId, 'dashboard'));
                        }}
                    />
                ) : null}
            </div>
        </div>
    );
}
