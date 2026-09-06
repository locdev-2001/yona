import { useState } from 'react';
import { usePage } from '@inertiajs/react';

import type { CustomAttributeWithValue } from 'dashboard/components-next/CustomAttributes/types';
import { useCamelCustomAttributes } from 'dashboard/composables/useCustomAttributes';
import type { Contact } from 'dashboard/contacts/types';
import type { UISettings } from 'dashboard/composables/useUISettings';
import type { DashboardPageProps } from 'dashboard/types';
import { t } from '../../../../i18n';
import ContactCustomAttributeItem from './ContactCustomAttributeItem';

// Port từ components-next/Contacts/ContactsSidebar/ContactCustomAttributes.vue
interface ContactCustomAttributesProps {
    selectedContact?: Contact | null;
    onContactUpdated?: (contact: Contact) => void;
}

export default function ContactCustomAttributes({
    selectedContact,
    onContactUpdated,
}: ContactCustomAttributesProps) {
    const { currentAccount, auth } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const uiSettings = (auth.user?.ui_settings ?? {}) as UISettings;
    const [searchQuery, setSearchQuery] = useState('');

    const contactAttributes = useCamelCustomAttributes(accountId, 'contact_attribute');
    const customAttributes = (selectedContact?.customAttributes ?? {}) as Record<string, unknown>;

    // Cùng thứ tự với panel hội thoại (ui_settings dùng chung một khoá).
    const savedOrder = (uiSettings.conversation_elements_order_conversation_contact_panel as string[] | undefined) ?? [];
    const sortByUISettings = (attributes: CustomAttributeWithValue[]): CustomAttributeWithValue[] => {
        if (!savedOrder.length) return attributes;
        const orderMap = new Map(savedOrder.map((key, index) => [key, index]));

        return [...attributes].sort(
            (first, second) =>
                (orderMap.get(first.attributeKey) ?? Infinity) - (orderMap.get(second.attributeKey) ?? Infinity),
        );
    };

    const withValues = (used: boolean): CustomAttributeWithValue[] =>
        sortByUISettings(
            contactAttributes
                .filter(attribute => (attribute.attributeKey in customAttributes) === used)
                .map(attribute => ({ ...attribute, value: customAttributes[attribute.attributeKey] ?? '' })),
        );

    const usedAttributes = selectedContact ? withValues(true) : [];
    const unusedAttributes = selectedContact ? withValues(false) : [];
    const filteredUnusedAttributes = unusedAttributes.filter(attribute =>
        attribute.attributeDisplayName.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    if (!contactAttributes.length) {
        return (
            <p className="px-6 py-10 text-sm leading-6 text-center text-n-slate-11">
                {t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.EMPTY_STATE')}
            </p>
        );
    }

    const contactId = selectedContact?.id ?? 0;
    const notifyUpdate = (contact: Contact) => onContactUpdated?.(contact);

    return (
        <div className="flex flex-col gap-6 px-6">
            {usedAttributes.length ? (
                <div className="flex flex-col gap-2">
                    {usedAttributes.map(attribute => (
                        <ContactCustomAttributeItem
                            key={attribute.id}
                            accountId={accountId}
                            contactId={contactId}
                            attribute={attribute}
                            isEditingView
                            onContactUpdated={notifyUpdate}
                        />
                    ))}
                </div>
            ) : null}
            {unusedAttributes.length ? (
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-[1px] bg-n-slate-5" />
                    <span className="text-sm font-medium text-n-slate-10">
                        {t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.UNUSED_ATTRIBUTES', { count: unusedAttributes.length })}
                    </span>
                    <div className="flex-1 h-[1px] bg-n-slate-5" />
                </div>
            ) : null}
            <div className="flex flex-col gap-3">
                {unusedAttributes.length ? (
                    <div className="relative">
                        <span className="absolute i-lucide-search size-3.5 top-2 left-3" />
                        <input
                            value={searchQuery}
                            type="search"
                            placeholder={t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.SEARCH_PLACEHOLDER')}
                            className="w-full h-8 py-2 pl-10 pr-2 text-sm reset-base outline-none border-none rounded-lg bg-n-alpha-black2 dark:bg-n-solid-1 text-n-slate-12"
                            onChange={event => setSearchQuery(event.target.value)}
                        />
                    </div>
                ) : null}
                {!filteredUnusedAttributes.length && unusedAttributes.length ? (
                    <div className="flex items-center justify-start h-11">
                        <p className="text-sm text-n-slate-11">
                            {t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.NO_ATTRIBUTES')}
                        </p>
                    </div>
                ) : null}
                {unusedAttributes.length ? (
                    <div className="flex flex-col gap-2">
                        {filteredUnusedAttributes.map(attribute => (
                            <ContactCustomAttributeItem
                                key={attribute.id}
                                accountId={accountId}
                                contactId={contactId}
                                attribute={attribute}
                                onContactUpdated={notifyUpdate}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
