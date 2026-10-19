import CheckboxAttribute from 'dashboard/components-next/CustomAttributes/CheckboxAttribute';
import DateAttribute from 'dashboard/components-next/CustomAttributes/DateAttribute';
import ListAttribute from 'dashboard/components-next/CustomAttributes/ListAttribute';
import OtherAttribute from 'dashboard/components-next/CustomAttributes/OtherAttribute';
import type { CustomAttributeWithValue } from 'dashboard/components-next/CustomAttributes/types';
import { useAlert } from 'dashboard/composables/useAlert';
import { deleteContactCustomAttributes, updateContact } from 'dashboard/contacts/api';
import type { Contact } from 'dashboard/contacts/types';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { t } from '../../../../i18n';

// Port từ components-next/Contacts/ContactsSidebar/ContactCustomAttributeItem.vue
const COMPONENT_BY_TYPE = {
    list: ListAttribute,
    checkbox: CheckboxAttribute,
    date: DateAttribute,
} as const;

interface ContactCustomAttributeItemProps {
    accountId: number;
    contactId: number;
    attribute: CustomAttributeWithValue;
    isEditingView?: boolean;
    onContactUpdated: (contact: Contact) => void;
}

export default function ContactCustomAttributeItem({
    accountId,
    contactId,
    attribute,
    isEditingView = false,
    onContactUpdated,
}: ContactCustomAttributeItemProps) {
    const AttributeComponent =
        COMPONENT_BY_TYPE[attribute.attributeDisplayType as keyof typeof COMPONENT_BY_TYPE] ?? OtherAttribute;

    const handleUpdate = async (value: unknown) => {
        try {
            onContactUpdated(
                await updateContact(accountId, contactId, {
                    customAttributes: { [attribute.attributeKey]: value },
                }),
            );
            useAlert(t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.API.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.API.UPDATE_ERROR'));
        }
    };

    const handleDelete = async () => {
        try {
            onContactUpdated(await deleteContactCustomAttributes(accountId, contactId, [attribute.attributeKey]));
            useAlert(t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.API.DELETE_SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.API.DELETE_ERROR'));
        }
    };

    return (
        <div
            className={`grid grid-cols-[140px,1fr] group/attribute items-center w-full gap-2 ${
                isEditingView ? 'min-h-10' : 'min-h-11'
            }`}
        >
            <div className="flex items-center justify-between truncate">
                <span className="text-sm font-medium truncate text-n-slate-12">{attribute.attributeDisplayName}</span>
            </div>
            <AttributeComponent
                attribute={attribute}
                isEditingView={isEditingView}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
            />
        </div>
    );
}
