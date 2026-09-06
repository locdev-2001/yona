import { t } from '../../i18n';

// Port từ dashboard/helper/preChat.js. Nhãn/placeholder mặc định của trường
// chuẩn tra trong bảng chuỗi widget (`WIDGET.PRE_CHAT_FORM.FIELDS.*`); `t` trả
// lại chính khoá khi không có nên dùng đúng nó để phân biệt "có/không có".

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

const widgetFieldString = (key: string, part: 'LABEL' | 'PLACEHOLDER'): string | null => {
    const path = `WIDGET.PRE_CHAT_FORM.FIELDS.${key}.${part}`;
    const value = t(path);

    return value === path ? null : value;
};

export const getLabel = ({ key, label }: { key: string; label: string }): string =>
    widgetFieldString(key, 'LABEL') ?? label;

export const getPlaceHolder = ({ key, placeholder }: { key: string; placeholder: string }): string =>
    widgetFieldString(key, 'PLACEHOLDER') ?? placeholder;

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
        label: getLabel({ key: item.name, label: item.label ? item.label : item.name }),
        placeholder: getPlaceHolder({
            key: item.name,
            placeholder: item.placeholder ? item.placeholder : item.name,
        }),
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
        pre_chat_message: preChatMessage,
        pre_chat_fields: [...formattedPreChatFields, ...customFields],
    };
};
