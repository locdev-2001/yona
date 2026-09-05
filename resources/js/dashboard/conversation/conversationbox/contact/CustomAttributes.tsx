import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import NextButton from 'dashboard/components-next/button/Button';

import { t } from '../../../../i18n';
import { useConversation } from '../../ConversationContext';
import { useCustomAttributeDefinitions } from './customAttributeDefinitions';
import type { StaticAttributeElement } from './conversationInfoAttributes';

// Port từ routes/dashboard/conversation/customAttributes/CustomAttributes.vue.
// Khác biệt cố ý: kéo thả sắp xếp bỏ (như ContactPanel), thân custom attribute
// (CustomAttribute.vue) chờ định nghĩa thuộc tính của E1 — hiện danh sách định
// nghĩa luôn rỗng nên chỉ còn phần tử tĩnh + câu rỗng, đúng như oracle.
const PEEK_LIMIT = 5;

const EVEN_ODD_CLASS = [
    '[&>*:nth-child(odd)]:!bg-n-surface-1 [&>*:nth-child(even)]:!bg-n-slate-1',
    'dark:[&>*:nth-child(odd)]:!bg-n-surface-2 dark:[&>*:nth-child(even)]:!bg-n-surface-1',
].join(' ');

interface CustomAttributesProps {
    attributeType: 'conversation_attribute' | 'contact_attribute';
    attributeFrom: string;
    emptyStateMessage?: string;
    staticElements?: StaticAttributeElement[];
    renderStaticItem?: (element: StaticAttributeElement) => ReactNode;
}

export default function CustomAttributes({
    attributeType,
    attributeFrom,
    emptyStateMessage = '',
    staticElements = [],
    renderStaticItem,
}: CustomAttributesProps) {
    const { uiSettings, updateUISettings } = useConversation();
    const definitions = useCustomAttributeDefinitions(attributeType);

    const orderKey = `conversation_elements_order_${attributeFrom}`;
    const showAllKey = `show_all_attributes_${attributeFrom}`;
    const [showAllAttributes, setShowAllAttributes] = useState(() => Boolean(uiSettings[showAllKey]));

    const savedOrder = (uiSettings[orderKey] as string[] | undefined) ?? [];
    const combinedElements = sortBySavedOrder(
        [...staticElements, ...definitions.map(definition => ({ ...definition, key: definition.attribute_key }))],
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

    return (
        <div className="conversation--details">
            <div className={`last:rounded-b-lg ${EVEN_ODD_CLASS}`}>
                {displayedElements.map(element => (
                    <div
                        key={element.key}
                        className={[
                            'drag-handle relative border-b border-n-weak/50 dark:border-n-weak/90',
                            showAllAttributes ? 'cursor-grab' : '',
                            combinedElements.length <= PEEK_LIMIT
                                ? 'last:border-transparent dark:last:border-transparent'
                                : '',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                    >
                        {'type' in element && element.type === 'static_attribute'
                            ? renderStaticItem?.(element as StaticAttributeElement)
                            : null}
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
