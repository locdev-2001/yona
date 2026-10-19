import { t } from '../../../i18n';

// Port từ dashboard/routes/dashboard/onboarding/shared/constants.js. Danh sách vai
// trò/ngành/nguồn thay bằng bộ hợp SME bán online Việt Nam: giá trị lưu vào
// custom_attributes là khoá ổn định, nhãn đọc từ ONBOARDING_NEXT.OPTIONS.
export interface SelectOption {
    value: string;
    label: string;
}

export const COMPANY_SIZE_OPTIONS: SelectOption[] = [
    { value: '1-10', label: '1 - 10' },
    { value: '11-50', label: '11 - 50' },
    { value: '51-200', label: '51 - 200' },
    { value: '201-500', label: '201 - 500' },
    { value: '500+', label: '500+' },
];

export const USER_ROLE_KEYS = ['owner', 'sales_manager', 'customer_support', 'marketing', 'other'] as const;

export const INDUSTRY_KEYS = [
    'fashion',
    'beauty',
    'mother_baby',
    'food_beverage',
    'electronics',
    'home_living',
    'education',
    'travel_services',
    'real_estate',
    'wholesale',
    'other',
] as const;

export const REFERRAL_SOURCE_KEYS = ['zalo', 'facebook', 'tiktok', 'google', 'friend', 'youtube', 'other'] as const;

type TranslatedOptionGroup = 'USER_ROLE' | 'INDUSTRY' | 'REFERRAL_SOURCE';

// Gọi lúc render (không phải lúc nạp module) để nhãn theo đúng locale đang bật.
export function translatedOptions(group: TranslatedOptionGroup, keys: readonly string[]): SelectOption[] {
    return keys.map(key => ({ value: key, label: t(`ONBOARDING_NEXT.OPTIONS.${group}.${key.toUpperCase()}`) }));
}
