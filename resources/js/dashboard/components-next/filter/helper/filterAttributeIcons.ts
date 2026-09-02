import { t } from '../../../../i18n';
import type { FilterSelectOption, FilterType } from './filterHelper';

// Port từ components-next/filter/helper/filterAttributeIcons.js.
const ATTRIBUTE_ICONS: Record<string, string> = {
    name: 'i-lucide-user',
    email: 'i-lucide-mail',
    phone_number: 'i-lucide-phone',
    identifier: 'i-lucide-fingerprint',
    country_code: 'i-lucide-flag',
    city: 'i-lucide-map-pin',
    company_name: 'i-lucide-building-2',
    blocked: 'i-lucide-ban',
    status: 'i-lucide-circle-dot',
    priority: 'i-lucide-signal-high',
    assignee_id: 'i-lucide-user-round',
    inbox_id: 'i-lucide-inbox',
    team_id: 'i-lucide-users-round',
    contact_id: 'i-lucide-contact',
    display_id: 'i-lucide-hash',
    campaign_id: 'i-lucide-megaphone',
    browser_language: 'i-lucide-globe',
    referer: 'i-lucide-link',
    message_type: 'i-lucide-message-square',
    private_note: 'i-lucide-sticky-note',
    content: 'i-lucide-message-square-text',
    mail_subject: 'i-lucide-mail-open',
    conversation_language: 'i-lucide-languages',
    labels: 'i-lucide-tags',
    created_at: 'i-lucide-calendar',
    last_activity_at: 'i-lucide-activity',
};

const CUSTOM_TYPE_ICONS: Record<string, string> = {
    text: 'i-lucide-type',
    number: 'i-lucide-hash',
    currency: 'i-lucide-banknote',
    percent: 'i-lucide-percent',
    link: 'i-lucide-link',
    date: 'i-lucide-calendar',
    list: 'i-lucide-list',
    checkbox: 'i-lucide-square-check',
};

const DEFAULT_ICON = 'i-lucide-tag';

export const getAttributeIcon = ({
    attributeKey,
    attributeDisplayType,
}: {
    attributeKey?: string;
    attributeDisplayType?: string;
}): string =>
    (attributeDisplayType && CUSTOM_TYPE_ICONS[attributeDisplayType]) ||
    (attributeKey && ATTRIBUTE_ICONS[attributeKey]) ||
    DEFAULT_ICON;

const GROUPS = [
    { model: 'standard', labelKey: 'STANDARD_FILTERS' },
    { model: 'additional', labelKey: 'ADDITIONAL_FILTERS' },
    { model: 'customAttributes', labelKey: 'CUSTOM_ATTRIBUTES' },
] as const;

const KNOWN_MODELS: string[] = GROUPS.map(({ model }) => model);

// Gắn icon cho từng attribute và chia nhóm bằng header disabled (FilterSelect
// render header thành tiêu đề không bấm được).
export const groupFilterTypes = (filterTypes: FilterType[], i18nKey = 'FILTER'): (FilterType | FilterSelectOption)[] => {
    const modelOf = (type: FilterType) => type.attributeModel || 'standard';
    const withIcon = (type: FilterType): FilterType => ({ ...type, icon: type.icon || getAttributeIcon(type) });

    const grouped = GROUPS.flatMap(({ model, labelKey }) => {
        const group = filterTypes.filter(type => modelOf(type) === model);
        if (!group.length) return [];
        return [
            { value: `__group_${model}`, label: t(`${i18nKey}.GROUPS.${labelKey}`), disabled: true } as FilterSelectOption,
            ...group.map(withIcon),
        ];
    });

    const ungrouped = filterTypes.filter(type => !KNOWN_MODELS.includes(modelOf(type)));

    return [...grouped, ...ungrouped.map(withIcon)];
};
