import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ICONS } from 'dashboard/icons';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import NextButton from 'dashboard/components-next/button/Button';
import Flag from 'dashboard/components-next/flag/Flag';
import ComposeConversation from 'dashboard/components-next/NewConversation/ComposeConversation';
import ConfirmContactDeleteDialog from 'dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog';
import type { ConfirmContactDeleteDialogHandle } from 'dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog';
import { useAlert } from 'dashboard/composables/useAlert';
import { patchJson, parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { dynamicTime } from 'shared/helpers/timeHelper';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import type { UISettings } from 'dashboard/composables/useUISettings';
import { t } from '../../../../i18n';
import type { DashboardPageProps } from '../../../types';
import { useContactAvailabilityStatus } from 'dashboard/realtime/hooks';
import type { AvailabilityStatus } from 'dashboard/constants/globals';
import ContactInfoRow from './ContactInfoRow';
import ContactMergeModal from './ContactMergeModal';
import type { FullContact } from './useContactDetails';

// Port từ routes/dashboard/conversation/contact/ContactInfo.vue — nạp contact
// đầy đủ qua GET /contacts/{id} (contacts/show gốc) để có created_at (tooltip ⓘ)
// + country_code (cờ); avatar + tên + dòng email/phone/identifier/company/
// location (copy + sửa inline qua PATCH /contacts/{id} của B2) + 4 nút: New
// message (ComposeConversation, gửi thật), Edit (→ trang contact; EditContact
// modal nhóm sau), Merge (ContactMergeModal shell), Delete (dialog B2).
// Bỏ: sửa tên inline, SocialIcons, mô tả, VoiceCallButton (EE).
interface ContactInfoProps {
    contact: FullContact;
    uiSettings: UISettings;
    onContactChange: Dispatch<SetStateAction<FullContact>>;
    onToggleSignature: () => void;
    onPanelClose: () => void;
}

type EditableField = 'email' | 'phone_number' | 'company_name';

export default function ContactInfo({
    contact,
    uiSettings,
    onContactChange: setContact,
    onToggleSignature,
    onPanelClose,
}: ContactInfoProps) {
    const { currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const isAdmin = currentAccountUser.role === 'administrator';
    const contactAvailabilityStatus = useContactAvailabilityStatus(
        contact.id,
        contact.availability_status as AvailabilityStatus | undefined,
    );
    const deleteDialogRef = useRef<ConfirmContactDeleteDialogHandle>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditingName) nameInputRef.current?.focus();
    }, [isEditingName]);

    const additionalAttributes = (contact.additional_attributes ?? {}) as Record<string, string | undefined>;
    const cityAndCountry = [additionalAttributes.city, additionalAttributes.country].filter(Boolean).join(', ');
    const contactProfileLink = accountScopedUrl(accountId, `contacts/${contact.id}`);

    // startEditingName/saveNameEdit gốc: click tên hoặc ✎ → sửa inline, Enter/blur lưu, Esc hủy.
    const startEditingName = () => {
        setEditName(contact.name || '');
        setIsEditingName(true);
    };

    const saveNameEdit = async () => {
        if (!isEditingName) return;
        setIsEditingName(false);
        const trimmed = editName.trim();
        if (!trimmed || trimmed === contact.name) return;
        try {
            await patchJson(`/api/v1/accounts/${accountId}/contacts/${contact.id}`, { name: trimmed });
            setContact(current => ({ ...current, name: trimmed }));
            useAlert(t('CONTACT_FORM.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('CONTACT_FORM.ERROR_MESSAGE'));
        }
    };

    const updateContactField = async (field: EditableField, value: string) => {
        const payload =
            field === 'company_name'
                ? { additional_attributes: { ...additionalAttributes, company_name: value } }
                : { [field]: value };
        try {
            const response = await patchJson<{ payload?: Partial<FullContact> }>(
                `/api/v1/accounts/${accountId}/contacts/${contact.id}`,
                payload,
            );
            // Máy chủ chuẩn hoá (vd 0912… → +84912…): hiện đúng giá trị đã lưu.
            setContact(current =>
                field === 'company_name'
                    ? { ...current, additional_attributes: { ...additionalAttributes, company_name: value } }
                    : { ...current, [field]: response?.payload?.[field] ?? value },
            );
            useAlert(t('CONTACT_FORM.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('CONTACT_FORM.ERROR_MESSAGE'));
        }
    };

    // Một khai báo cho cả dòng có giá trị lẫn nút "Thêm …" — đổi trường chỉ sửa
    // một chỗ (thêm/bớt trường không phải sửa hai nhánh JSX).
    const contactRows = [
        {
            key: 'email',
            href: contact.email ? `mailto:${contact.email}` : '',
            value: contact.email,
            icon: ICONS.mail,
            emoji: '✉️',
            title: t('CONTACT_PANEL.EMAIL_ADDRESS'),
            addLabel: t('CONTACT_PANEL.ADD_EMAIL_ADDRESS'),
            showCopy: true,
            editable: true,
            onUpdate: (value: string) => updateContactField('email', value),
        },
        {
            key: 'phone_number',
            href: contact.phone_number ? `tel:${contact.phone_number}` : '',
            value: contact.phone_number,
            icon: ICONS.phone,
            emoji: '📞',
            title: t('CONTACT_PANEL.PHONE_NUMBER'),
            addLabel: t('CONTACT_PANEL.ADD_PHONE_NUMBER'),
            showCopy: true,
            editable: true,
            onUpdate: (value: string) => updateContactField('phone_number', value),
        },
        {
            key: 'company_name',
            value: additionalAttributes.company_name,
            icon: ICONS.company,
            emoji: '🏢',
            title: t('CONTACT_PANEL.COMPANY'),
            addLabel: t('CONTACT_PANEL.ADD_COMPANY'),
            editable: true,
            onUpdate: (value: string) => updateContactField('company_name', value),
        },
    ];
    const emptyRows = contactRows.filter(row => !row.value);

    return (
        <div className="relative items-center w-full p-4">
            <div className="flex flex-col w-full gap-2 text-left rtl:text-right">
                <div className="flex flex-row justify-between">
                    <Avatar
                        seed={avatarSeed('contact', contact.id)}
                        src={contact.thumbnail}
                        name={contact.name ?? ''}
                        status={contactAvailabilityStatus}
                        size={48}
                        hideOfflineStatus
                        previewable
                    />
                </div>

                <div className="flex flex-col items-start gap-1.5 min-w-0 w-full">
                    <div className="flex items-center w-full min-w-0 gap-2">
                        <div className="group/name flex items-center min-w-0 gap-2">
                            {isEditingName ? (
                                <input
                                    ref={nameInputRef}
                                    value={editName}
                                    className="!text-base !font-medium !w-auto max-w-full min-w-0 field-surface rounded-md px-1.5 text-n-slate-12 [field-sizing:content]"
                                    onChange={event => setEditName(event.target.value)}
                                    onKeyDown={event => {
                                        if (event.key === 'Enter') void saveNameEdit();
                                        if (event.key === 'Escape') setIsEditingName(false);
                                    }}
                                    onBlur={() => void saveNameEdit()}
                                />
                            ) : (
                                <h3
                                    className="flex-shrink max-w-full min-w-0 my-0 text-base break-words text-n-slate-12 cursor-pointer hover:text-n-slate-12/80"
                                    title={t('CONTACT_PANEL.CLICK_TO_EDIT')}
                                    onClick={startEditingName}
                                >
                                    {contact.name}
                                </h3>
                            )}
                            <NextButton
                                ghost
                                xs
                                slate
                                icon="i-lucide-pencil"
                                title={t('CONTACT_PANEL.CLICK_TO_EDIT')}
                                className={`flex-shrink-0 -mx-1 opacity-0 transition-opacity ${
                                    isEditingName ? 'invisible' : 'group-hover/name:opacity-100 focus-visible:opacity-100'
                                }`}
                                onClick={startEditingName}
                            />
                        </div>
                        <div className="flex flex-row items-center gap-2">
                            {contact.created_at ? (
                                <span
                                    title={`${t('CONTACT_PANEL.CREATED_AT_LABEL')} ${dynamicTime(contact.created_at)}`}
                                    className="i-lucide-info text-sm text-n-slate-10"
                                />
                            ) : null}
                            <a href={contactProfileLink} target="_blank" rel="noopener nofollow noreferrer" className="leading-3">
                                <span className="i-lucide-external-link text-sm text-n-slate-10" />
                            </a>
                        </div>
                    </div>

                    <div className="flex flex-col items-start w-full gap-2">
                        {contactRows
                            .filter(row => row.value)
                            .map(({ key, ...row }) => <ContactInfoRow key={key} {...row} />)}
                        {contact.identifier ? (
                            <ContactInfoRow value={contact.identifier} icon={ICONS.contactId} emoji="🪪" title={t('CONTACT_PANEL.IDENTIFIER')} />
                        ) : null}
                        {cityAndCountry || additionalAttributes.location ? (
                            <ContactInfoRow
                                value={cityAndCountry || additionalAttributes.location}
                                icon={ICONS.location}
                                emoji="🌍"
                                title={t('CONTACT_PANEL.LOCATION')}
                                trailing={
                                    cityAndCountry ? (
                                        additionalAttributes.country_code ? (
                                            <Flag country={additionalAttributes.country_code} className="size-3.5" />
                                        ) : (
                                            <span>🌎</span>
                                        )
                                    ) : null
                                }
                            />
                        ) : null}
                        {emptyRows.length ? (
                            <div className="flex flex-wrap items-center w-full gap-x-4 gap-y-1">
                                {emptyRows.map(({ key, ...row }) => (
                                    <ContactInfoRow key={key} {...row} />
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center w-full mt-0.5 gap-2">
                    <ComposeConversation
                        contact={contact}
                        uiSettings={uiSettings}
                        onToggleSignature={onToggleSignature}
                        trigger={() => (
                            <NextButton title={t('CONTACT_PANEL.NEW_MESSAGE')} icon={ICONS.message} slate faded sm />
                        )}
                    />
                    <NextButton
                        title={t('EDIT_CONTACT.BUTTON_LABEL')}
                        icon={ICONS.edit}
                        slate
                        faded
                        sm
                        onClick={() => router.visit(contactProfileLink)}
                    />
                    <ContactMergeModal
                        primaryContact={contact}
                        onMerged={mergedContact => setContact(mergedContact as FullContact)}
                        trigger={() => <NextButton title={t('CONTACT_PANEL.MERGE_CONTACT')} icon={ICONS.merge} slate faded sm />}
                    />
                    {isAdmin ? (
                        <NextButton
                            title={t('DELETE_CONTACT.BUTTON_LABEL')}
                            icon={ICONS.delete}
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
