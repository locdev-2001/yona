import { isProductFeatureVisible, type ProductFeature } from 'shared/helpers/productVisibility';
import { CONVERSATION_ATTRIBUTES, type FilterSelectOption, type FilterType } from './filterHelper';

const ATTRIBUTE_FEATURES: Partial<Record<string, ProductFeature>> = {
    [CONVERSATION_ATTRIBUTES.TEAM_ID]: 'teams',
    [CONVERSATION_ATTRIBUTES.PRIORITY]: 'conversationPriority',
    [CONVERSATION_ATTRIBUTES.CAMPAIGN_ID]: 'campaigns',
    [CONVERSATION_ATTRIBUTES.STATUS]: 'conversationStatus',
    [CONVERSATION_ATTRIBUTES.ASSIGNEE_ID]: 'conversationAssignment',
    [CONVERSATION_ATTRIBUTES.BROWSER_LANGUAGE]: 'websiteWidget',
    [CONVERSATION_ATTRIBUTES.REFERER]: 'websiteWidget',
};

// Giữ nguyên definitions để đọc bộ lọc đã lưu; chỉ lọc những lựa chọn có thể thêm mới.
export function selectableFilterTypes(filterTypes: (FilterType | FilterSelectOption)[]): (FilterType | FilterSelectOption)[] {
    const visibleTypes = filterTypes.filter(filterType => {
        if (!('attributeKey' in filterType)) return true;
        const feature = filterType.attributeModel === 'customAttributes'
            ? 'customAttributes'
            : ATTRIBUTE_FEATURES[filterType.attributeKey];
        return !feature || isProductFeatureVisible(feature);
    });

    return visibleTypes.filter((filterType, index) => {
        if (!filterType.value.startsWith('__group_')) return true;
        const next = visibleTypes[index + 1];
        return next !== undefined && !next.value.startsWith('__group_');
    });
}
