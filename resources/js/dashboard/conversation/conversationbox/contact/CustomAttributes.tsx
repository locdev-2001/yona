import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import NextButton from 'dashboard/components-next/button/Button';
import CustomAttribute from 'dashboard/components/CustomAttribute';
import type { CustomAttributeValue } from 'dashboard/components/CustomAttribute';
import { useAlert } from 'dashboard/composables/useAlert';
import { deleteContactCustomAttributes, updateContact } from 'dashboard/contacts/api';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { copyTextToClipboard } from 'shared/helpers/clipboard';

import { t } from '../../../../i18n';
import { useConversation } from '../../ConversationContext';
import { useCustomAttributeDefinitions } from './customAttributeDefinitions';
import type { StaticAttributeElement } from './conversationInfoAttributes';

// Port từ routes/dashboard/conversation/customAttributes/CustomAttributes.vue.
// Khác biệt cố ý: kéo thả sắp xếp bỏ (như ContactPanel) — thứ tự đã lưu trong
// ui_settings vẫn được tôn trọng khi đọc.
const PEEK_LIMIT = 5;

const EVEN_ODD_CLASS = '[&>*:nth-child(even)]:bg-n-surface-hover';

interface CustomAttributesProps {
    attributeType: 'conversation_attribute' | 'contact_attribute';
    attributeFrom: string;
    emptyStateMessage?: string;
    staticElements?: StaticAttributeElement[];
    renderStaticItem?: (element: StaticAttributeElement) => ReactNode;
    // Chỉ cần cho attributeType = contact_attribute (nguồn giá trị + nơi ghi).
    contactId?: number;
    contactCustomAttributes?: Record<string, unknown>;
    onContactCustomAttributesChange?: (customAttributes: Record<string, unknown>) => void;
}

export default function CustomAttributes({
    attributeType,
    attributeFrom,
    emptyStateMessage = '',
    staticElements = [],
    renderStaticItem,
    contactId = 0,
    contactCustomAttributes,
    onContactCustomAttributesChange,
}: CustomAttributesProps) {
    const { accountId, selectedConversation, uiSettings, updateUISettings, updateConversationCustomAttributes } =
        useConversation();
    const definitions = useCustomAttributeDefinitions(accountId, attributeType);

    const orderKey = `conversation_elements_order_${attributeFrom}`;
    const showAllKey = `show_all_attributes_${attributeFrom}`;
    const [showAllAttributes, setShowAllAttributes] = useState(() => Boolean(uiSettings[showAllKey]));

    const isConversationAttribute = attributeType === 'conversation_attribute';
    const customAttributes = (isConversationAttribute
        ? (selectedConversation?.custom_attributes ?? {})
        : (contactCustomAttributes ?? {})) as Record<string, unknown>;

    const savedOrder = (uiSettings[orderKey] as string[] | undefined) ?? [];
    const combinedElements = sortBySavedOrder(
        [
            ...staticElements,
            ...definitions.map(definition => ({
                ...definition,
                type: 'custom_attribute' as const,
                key: definition.attribute_key,
                value: (customAttributes[definition.attribute_key] ?? '') as CustomAttributeValue,
            })),
        ],
        savedOrder,
    );
    const displayedElements =
        showAllAttributes || combinedElements.length <= PEEK_LIMIT
            ? combinedElements
            : combinedElements.slice(0, PEEK_LIMIT);

    // initializeSettings của bản gốc: lần đầu ghi thứ tự mặc định vào ui_settings.
    useEffect(() => {
        if (uiSettings[orderKey]) return;
        updateUISettings({ [orderKey]: combinedElements.map(element => element.key) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onClickToggle = () => {
        const nextValue = !showAllAttributes;
        setShowAllAttributes(nextValue);
        updateUISettings({ [showAllKey]: nextValue });
    };

    const persist = async (updatedAttributes: Record<string, unknown>, removedKey?: string) => {
        if (isConversationAttribute) {
            await updateConversationCustomAttributes(updatedAttributes);
            return;
        }
        if (!contactId) return;

        const contact = removedKey
            ? await deleteContactCustomAttributes(accountId, contactId, [removedKey])
            : await updateContact(accountId, contactId, { customAttributes: updatedAttributes });
        onContactCustomAttributesChange?.((contact.customAttributes ?? {}) as Record<string, unknown>);
    };

    const onUpdate = async (key: string, value: CustomAttributeValue) => {
        try {
            await persist({ ...customAttributes, [key]: value });
            useAlert(t('CUSTOM_ATTRIBUTES.FORM.UPDATE.SUCCESS'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('CUSTOM_ATTRIBUTES.FORM.UPDATE.ERROR'));
        }
    };

    const onDelete = async (key: string) => {
        try {
            const { [key]: _removed, ...updatedAttributes } = customAttributes;
            await persist(updatedAttributes, key);
            useAlert(t('CUSTOM_ATTRIBUTES.FORM.DELETE.SUCCESS'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('CUSTOM_ATTRIBUTES.FORM.DELETE.ERROR'));
        }
    };

    const onCopy = async (value: CustomAttributeValue) => {
        await copyTextToClipboard(String(value));
        useAlert(t('CUSTOM_ATTRIBUTES.COPY_SUCCESSFUL'));
    };

    return (
        <div className="conversation--details">
            <div className={`last:rounded-b-lg ${EVEN_ODD_CLASS}`}>
                {displayedElements.map(element => (
                    <div
                        key={element.key}
                        className={[
                            'drag-handle relative rounded-md',
                            showAllAttributes ? 'cursor-grab' : '',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                    >
                        {element.type === 'static_attribute' ? (
                            renderStaticItem?.(element as StaticAttributeElement)
                        ) : (
                            <CustomAttribute
                                attributeKey={element.attribute_key}
                                attributeType={element.attribute_display_type}
                                values={element.attribute_values}
                                label={element.attribute_display_name}
                                description={element.attribute_description}
                                value={element.value}
                                showActions
                                attributeRegex={element.regex_pattern}
                                regexCue={element.regex_cue}
                                onUpdate={onUpdate}
                                onDelete={onDelete}
                                onCopy={onCopy}
                            />
                        )}
                    </div>
                ))}
            </div>
            {!displayedElements.length && emptyStateMessage ? (
                <p className="p-3 text-center">{emptyStateMessage}</p>
            ) : null}
            {combinedElements.length > PEEK_LIMIT ? (
                <div className="flex items-center px-2 py-2">
                    <NextButton
                        ghost
                        xs
                        icon={showAllAttributes ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'}
                        label={showAllAttributes ? t('CUSTOM_ATTRIBUTES.SHOW_LESS') : t('CUSTOM_ATTRIBUTES.SHOW_MORE')}
                        onClick={onClickToggle}
                    />
                </div>
            ) : null}
        </div>
    );
}

// combinedElements của bản gốc: phần tử chưa có trong thứ tự đã lưu dồn xuống cuối.
function sortBySavedOrder<T extends { key: string }>(elements: T[], savedOrder: string[]): T[] {
    if (!savedOrder.length) return elements;

    return [...elements].sort((first, second) => {
        const firstPosition = savedOrder.indexOf(first.key);
        const secondPosition = savedOrder.indexOf(second.key);
        if (firstPosition === -1 && secondPosition === -1) return 0;
        if (firstPosition === -1) return 1;
        if (secondPosition === -1) return -1;

        return firstPosition - secondPosition;
    });
}
