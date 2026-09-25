import { t } from '../../i18n';

// Port từ dashboard/helper/preChat.js. Hộp thư tạo trước khi có mặc định tiếng
// Việt đã lưu nhãn tiếng Anh cho trường chuẩn ('Email Id', 'Full name'…); màn
// cấu hình nhận ra các giá trị cũ đó theo `name` của trường và hiện chữ mặc định
// trong bảng chuỗi widget (`WIDGET.PRE_CHAT_FORM.FIELDS.*`). Nhãn quản trị viên đã
// tự đặt thì giữ nguyên.

export interface PreChatField {
    name: string;
    type: string;
    label: string;
    placeholder?: string;
    required: boolean;
    enabled: boolean;
    field_type?: string;
    values?: string[];
    regex_pattern?: string;
    regex_cue?: string;
}

export interface PreChatFormOptions {
    pre_chat_message?: string;
    pre_chat_fields?: PreChatField[];
}

export interface CustomAttributeDefinition {
    attribute_key: string;
    attribute_display_name: string;
    attribute_display_type: string;
    attribute_values?: string[];
    attribute_model: string;
    regex_pattern?: string;
    regex_cue?: string;
}

// Chữ mặc định cũ (tiếng Anh) mà hộp thư tạo trước đây đã lưu cho từng trường chuẩn.
export const standardFieldKeys = {
    emailAddress: {
        key: 'EMAIL_ADDRESS',
        label: 'Email Id',
        placeholder: 'Please enter your email address',
    },
    fullName: {
        key: 'FULL_NAME',
        label: 'Full Name',
        placeholder: 'Please enter your full name',
    },
    phoneNumber: {
        key: 'PHONE_NUMBER',
        label: 'Phone Number',
        placeholder: 'Please enter your phone number',
    },
} as const;

export const LEGACY_DEFAULT_PRE_CHAT_MESSAGE = 'Share your queries or comments here.';

type StandardFieldText = 'label' | 'placeholder';

const widgetFieldString = (key: string, part: 'LABEL' | 'PLACEHOLDER'): string | null => {
    const path = `WIDGET.PRE_CHAT_FORM.FIELDS.${key}.${part}`;
    const value = t(path);

    return value === path ? null : value;
};

const isLegacyDefault = (stored: string | undefined, legacy: string): boolean =>
    !stored?.trim() || stored.trim().toLowerCase() === legacy.toLowerCase();

// Chữ mặc định theo ngôn ngữ đang dùng cho trường chuẩn còn giữ giá trị cũ; null khi
// trường không phải trường chuẩn hoặc quản trị viên đã tự đặt chữ.
export const standardFieldText = (name: string, part: StandardFieldText, stored?: string): string | null => {
    const standard = standardFieldKeys[name as keyof typeof standardFieldKeys];
    if (!standard || !isLegacyDefault(stored, standard[part])) return null;

    return widgetFieldString(standard.key, part === 'label' ? 'LABEL' : 'PLACEHOLDER');
};

export const preChatMessageText = (stored?: string): string | undefined =>
    stored?.trim() === LEGACY_DEFAULT_PRE_CHAT_MESSAGE ? t('INBOX_MGMT.PRE_CHAT_FORM.PRE_CHAT_MESSAGE.DEFAULT') : stored;

export const getCustomFields = ({
    standardFields,
    customAttributes,
}: {
    standardFields: { pre_chat_fields: PreChatField[] };
    customAttributes: CustomAttributeDefinition[];
}): PreChatField[] => {
    const { pre_chat_fields: preChatFields } = standardFields;

    return customAttributes
        .filter(attribute => !preChatFields.find(item => item.name === attribute.attribute_key))
        .map(attribute => ({
            label: attribute.attribute_display_name,
            placeholder: attribute.attribute_display_name,
            name: attribute.attribute_key,
            type: attribute.attribute_display_type,
            values: attribute.attribute_values,
            field_type: attribute.attribute_model,
            regex_pattern: attribute.regex_pattern,
            regex_cue: attribute.regex_cue,
            required: false,
            enabled: false,
        }));
};

export const getFormattedPreChatFields = ({ preChatFields }: { preChatFields: PreChatField[] }): PreChatField[] =>
    preChatFields.map(item => ({
        ...item,
        label: standardFieldText(item.name, 'label', item.label) ?? (item.label || item.name),
        placeholder: standardFieldText(item.name, 'placeholder', item.placeholder) ?? (item.placeholder || item.name),
    }));

export const getPreChatFields = ({
    preChatFormOptions = {},
    customAttributes = [],
}: {
    preChatFormOptions?: PreChatFormOptions;
    customAttributes?: CustomAttributeDefinition[];
}): { pre_chat_message?: string; pre_chat_fields: PreChatField[] } => {
    const { pre_chat_message: preChatMessage, pre_chat_fields: fields } = preChatFormOptions;

    const formattedPreChatFields = getFormattedPreChatFields({ preChatFields: fields ?? [] });
    const customFields = getCustomFields({
        standardFields: { pre_chat_fields: formattedPreChatFields },
        customAttributes,
    });

    return {
        pre_chat_message: preChatMessageText(preChatMessage),
        pre_chat_fields: [...formattedPreChatFields, ...customFields],
    };
};
