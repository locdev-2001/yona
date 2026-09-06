import { getRegexp, isPhoneNumberValidWithDialCode, startsWithPlus } from 'shared/helpers/Validators';
import type { PreChatField, WidgetContact } from '../types';

// Phần thuần của widget/components/PreChat/Form.vue: lọc trường theo hồ sơ khách,
// dựng luật kiểm tra (thay FormKit) và gom payload gửi đi.

export type PreChatFormValues = Record<string, string | boolean | undefined>;

// Tên luật giữ đúng tên rule của FormKit để tra bảng thông báo lỗi.
export type ValidationRule =
    | 'required'
    | 'accepted'
    | 'optional'
    | 'email'
    | 'startsWithPlus'
    | 'isValidPhoneNumber'
    | 'url'
    | 'date'
    | 'matches';

// Bảng của `getValidation` bản gốc: null = không thêm luật nào ngoài required/optional.
const RULES_BY_KEY: Record<string, ValidationRule[] | null | false> = {
    emailAddress: ['email'],
    phoneNumber: ['startsWithPlus', 'isValidPhoneNumber'],
    url: ['url'],
    date: ['date'],
    text: null,
    select: null,
    number: null,
    checkbox: false,
    contact_attribute: null,
    conversation_attribute: null,
};

// Luật `email` của FormKit.
const EMAIL_PATTERN =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export const findFieldType = (type: string): string => {
    if (type === 'link') return 'url';
    if (type === 'list') return 'select';

    return type;
};

// filteredPreChatFields: đã biết khách là ai thì bỏ hẳn trường tương ứng.
export const filterPreChatFields = (preChatFields: PreChatField[], contact: WidgetContact | null): PreChatField[] => {
    const hasEmail = Boolean(contact?.has_email);
    const hasPhoneNumber = Boolean(contact?.has_phone_number);
    const isKnownContact = Boolean(contact?.identifier) || hasEmail || hasPhoneNumber;

    return preChatFields.filter(field => {
        if (hasEmail && field.name === 'emailAddress') return false;
        if (hasPhoneNumber && field.name === 'phoneNumber') return false;
        if (isKnownContact && field.name === 'fullName') return false;

        return true;
    });
};

export const enabledPreChatFields = (
    preChatFields: PreChatField[],
    contact: WidgetContact | null,
): PreChatField[] => filterPreChatFields(preChatFields, contact).filter(field => field.enabled);

// getValidation: [luật nền] + [luật theo kiểu]. Mảng rỗng = không kiểm gì
// (bản gốc trả chuỗi '' cho trường không nằm trong bảng).
export const validationRulesFor = (field: PreChatField): ValidationRule[] => {
    const type = field.name === 'phoneNumber' ? '' : findFieldType(field.type);
    const fieldType = field.field_type ?? '';

    if (!(type in RULES_BY_KEY) && !(field.name in RULES_BY_KEY) && !(fieldType in RULES_BY_KEY)) {
        return [];
    }

    const baseRule: ValidationRule = field.required ? (type === 'checkbox' ? 'accepted' : 'required') : 'optional';
    const extra =
        RULES_BY_KEY[type] ||
        RULES_BY_KEY[field.name] ||
        (field.regex_pattern && (fieldType === 'contact_attribute' || fieldType === 'conversation_attribute')
            ? (['matches'] as ValidationRule[])
            : RULES_BY_KEY[fieldType]);

    return extra ? [baseRule, ...extra] : [baseRule];
};

const isBlank = (value: unknown): boolean => value === undefined || value === null || value === '';

const passesRule = (rule: ValidationRule, value: string, field: PreChatField): boolean => {
    switch (rule) {
        case 'required':
            return !isBlank(value);
        case 'accepted':
            return value === 'true' || value === 'yes' || value === 'on' || value === '1';
        case 'email':
            return EMAIL_PATTERN.test(value);
        case 'startsWithPlus':
            return startsWithPlus(value);
        case 'isValidPhoneNumber':
            return isPhoneNumberValidWithDialCode(value);
        case 'url':
            try {
                return Boolean(new URL(value));
            } catch {
                return false;
            }
        case 'date':
            return !Number.isNaN(Date.parse(value));
        case 'matches': {
            if (!field.regex_pattern) return true;
            const pattern = getRegexp(field.regex_pattern);

            // FormKit cache RegExp và gọi .test() liên tục — bỏ cờ g/y để lastIndex
            // không làm kết quả nhảy qua lại giữa các lần gõ.
            return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, '')).test(value);
        }
        default:
            return true;
    }
};

// Luật đầu tiên hỏng quyết định thông báo — đúng cách FormKit dừng ở rule chặn
// đầu tiên. `optional` với giá trị rỗng bỏ qua mọi luật còn lại.
// `rules` chỉ truyền cho ô có luật khai thẳng trong template (ô Message).
export const firstFailingRule = (
    field: PreChatField,
    value: string,
    rules: ValidationRule[] = validationRulesFor(field),
): ValidationRule | null => {
    for (const rule of rules) {
        if (rule === 'optional') {
            if (isBlank(value)) return null;
            continue;
        }
        if (!passesRule(rule, value, field)) return rule;
    }

    return null;
};

export const valueForField = (field: PreChatField, values: PreChatFormValues): string | null => {
    const raw = values[field.name];
    if (findFieldType(field.type) === 'select') {
        const index = Number(raw);
        return field.values?.[index] ?? null;
    }

    return raw === undefined || raw === '' || raw === false ? null : String(raw);
};

const customAttributesOf = (
    fields: PreChatField[],
    values: PreChatFormValues,
    fieldType: 'contact_attribute' | 'conversation_attribute',
): Record<string, string | null> =>
    Object.fromEntries(
        fields
            .filter(field => field.field_type === fieldType)
            .map(field => [field.name, valueForField(field, values)]),
    );

export interface PreChatSubmission {
    fullName?: string;
    emailAddress?: string;
    phoneNumber?: string;
    message?: string;
    contactCustomAttributes: Record<string, string | null>;
    conversationCustomAttributes: Record<string, string | null>;
}

export const buildPreChatSubmission = (
    fields: PreChatField[],
    values: PreChatFormValues,
): PreChatSubmission => ({
    fullName: values.fullName as string | undefined,
    emailAddress: values.emailAddress as string | undefined,
    phoneNumber: values.phoneNumber as string | undefined,
    message: values.message as string | undefined,
    contactCustomAttributes: customAttributesOf(fields, values, 'contact_attribute'),
    conversationCustomAttributes: customAttributesOf(fields, values, 'conversation_attribute'),
});
