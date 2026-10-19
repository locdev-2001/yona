import { useRef, useState } from 'react';
import { ICONS } from 'dashboard/icons';

import { t } from '../../../../i18n';
import CardLayout from 'dashboard/components-next/CardLayout';
import ContactsForm from 'dashboard/components-next/Contacts/ContactsForm/ContactsForm';
import Button from 'dashboard/components-next/button/Button';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import Flag from 'dashboard/components-next/flag/Flag';
import ContactDeleteSection from 'dashboard/components-next/Contacts/ContactsCard/ContactDeleteSection';
import Checkbox from 'dashboard/components-next/checkbox/Checkbox';
import countries from 'shared/constants/countries';
import type { ContactAdditionalAttributes, ContactFormState } from 'dashboard/contacts/types';

// Port từ dashboard/components-next/Contacts/ContactsCard/ContactsCard.vue.
interface ContactsCardProps {
    id: number;
    name?: string;
    email?: string | null;
    companyId?: number | string;
    additionalAttributes?: ContactAdditionalAttributes;
    phoneNumber?: string | null;
    identified?: boolean;
    thumbnail?: string;
    availabilityStatus?: string | null;
    isExpanded?: boolean;
    isUpdating?: boolean;
    selectable?: boolean;
    isSelected?: boolean;
    onToggle?: () => void;
    onUpdateContact?: (contactData: ContactFormState) => void;
    onShowContact?: (id: number) => void;
    onSelect?: (value: boolean) => void;
    onAvatarHover?: (isHovered: boolean) => void;
    onDeleted?: () => void;
}

const countriesMap = countries.reduce<Record<string, (typeof countries)[number]>>((acc, country) => {
    acc[country.id] = country;
    return acc;
}, {});

export default function ContactsCard({
    id,
    name = '',
    email = '',
    companyId = '',
    additionalAttributes = {},
    phoneNumber = '',
    identified = true,
    thumbnail = '',
    availabilityStatus = null,
    isExpanded = false,
    isUpdating = false,
    selectable = false,
    isSelected = false,
    onToggle,
    onUpdateContact,
    onShowContact,
    onSelect,
    onAvatarHover,
    onDeleted,
}: ContactsCardProps) {
    const getInitialContactData = () => ({
        id,
        name,
        email,
        companyId,
        phoneNumber,
        additionalAttributes,
    });

    const contactDataRef = useRef<ContactFormState | Record<string, unknown>>(getInitialContactData());
    const [isFormInvalid, setFormInvalid] = useState(false);

    const { country, countryCode, city } = additionalAttributes || {};
    const activeCountry =
        country || countryCode ? countriesMap[country ?? ''] || countriesMap[countryCode ?? ''] : undefined;
    const countryDetails = activeCountry
        ? {
              countryCode: activeCountry.id,
              city: city ? `${city},` : null,
              name: activeCountry.name,
          }
        : null;
    const formattedLocation = countryDetails
        ? [countryDetails.city, countryDetails.name].filter(Boolean).join(' ')
        : '';

    const handleFormUpdate = (updatedData: ContactFormState) => {
        contactDataRef.current = { ...contactDataRef.current, ...updatedData };
    };

    const handleUpdateContact = () => {
        onUpdateContact?.(contactDataRef.current as ContactFormState);
    };

    const onClickExpand = () => {
        onToggle?.();
        contactDataRef.current = getInitialContactData();
    };

    return (
        <div className="relative">
            <CardLayout
                layout="row"
                className={isSelected ? '!bg-n-surface-selected' : ''}
                after={
                    <div
                        className={`transition-all duration-500 ease-in-out grid overflow-hidden ${
                            isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                        }`}
                    >
                        <div className="overflow-hidden">
                            <div className="flex flex-col gap-6 p-6 pt-2">
                                {isExpanded ? (
                                    <ContactsForm
                                        contactData={getInitialContactData()}
                                        onUpdate={handleFormUpdate}
                                        onValidityChange={setFormInvalid}
                                    />
                                ) : null}
                                <div>
                                    <Button
                                        label={t('CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.UPDATE_BUTTON')}
                                        size="sm"
                                        isLoading={isUpdating}
                                        disabled={isUpdating || isFormInvalid}
                                        onClick={handleUpdateContact}
                                    />
                                </div>
                            </div>
                            <ContactDeleteSection contactId={id} onDeleted={onDeleted} />
                        </div>
                    </div>
                }
            >
                <div className="flex items-center justify-start flex-1 gap-4">
                    <div
                        className="relative"
                        onMouseEnter={() => onAvatarHover?.(true)}
                        onMouseLeave={() => onAvatarHover?.(false)}
                    >
                        <Avatar
                            seed={avatarSeed('contact', id)}
                            name={name}
                            src={thumbnail}
                            size={42}
                            status={availabilityStatus as 'online' | 'busy' | 'offline' | null}
                            hideOfflineStatus
                            overlay={
                                selectable
                                    ? ({ size }) => (
                                          <label
                                              className="flex items-center justify-center rounded-full cursor-pointer absolute inset-0 z-10 backdrop-blur-[2px]"
                                              style={{ width: `${size}px`, height: `${size}px` }}
                                              onClick={event => event.stopPropagation()}
                                          >
                                              <Checkbox
                                                  checked={isSelected}
                                                  onChange={() => onSelect?.(!isSelected)}
                                              />
                                          </label>
                                      )
                                    : undefined
                            }
                        />
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="text-base font-medium truncate text-n-slate-12">{name}</span>
                            {identified ? null : (
                                <span
                                    className="px-1.5 py-0.5 text-xs rounded-md bg-n-alpha-2 text-n-slate-11"
                                    title={t('CONTACTS_LAYOUT.CARD.UNIDENTIFIED_HINT')}
                                >
                                    {t('CONTACTS_LAYOUT.CARD.UNIDENTIFIED_BADGE')}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                                {additionalAttributes?.companyName ? (
                                    <span className={`${ICONS.company} size-4 text-n-slate-10 mb-0.5`} />
                                ) : null}
                                {additionalAttributes?.companyName ? (
                                    <span className="text-sm truncate text-n-slate-11">
                                        {additionalAttributes.companyName}
                                    </span>
                                ) : null}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1">
                            {email ? (
                                <div className="truncate max-w-72" title={email}>
                                    <span className="text-sm text-n-slate-11">{email}</span>
                                </div>
                            ) : null}
                            {email ? <div className="w-px h-3 truncate bg-n-slate-6" /> : null}
                            {phoneNumber ? (
                                <span className="text-sm truncate text-n-slate-11">{phoneNumber}</span>
                            ) : null}
                            {phoneNumber ? <div className="w-px h-3 truncate bg-n-slate-6" /> : null}
                            {countryDetails ? (
                                <span className="inline-flex items-center gap-2 text-sm truncate text-n-slate-11">
                                    <Flag country={countryDetails.countryCode} className="size-3.5" />
                                    {formattedLocation}
                                </span>
                            ) : null}
                            {countryDetails ? <div className="w-px h-3 truncate bg-n-slate-6" /> : null}
                            <Button
                                label={t('CONTACTS_LAYOUT.CARD.VIEW_DETAILS')}
                                variant="link"
                                size="xs"
                                onClick={() => onShowContact?.(id)}
                            />
                        </div>
                    </div>
                </div>

                <Button
                    icon="i-lucide-chevron-down"
                    variant="ghost"
                    color="slate"
                    size="xs"
                    className={isExpanded ? 'rotate-180' : ''}
                    onClick={onClickExpand}
                />
            </CardLayout>
        </div>
    );
}
