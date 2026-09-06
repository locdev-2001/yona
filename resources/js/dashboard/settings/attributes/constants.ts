// Port từ routes/dashboard/settings/attributes/constants.js.
export const ATTRIBUTE_MODELS = [
    { id: 0, key: 'CONVERSATION' },
    { id: 1, key: 'CONTACT' },
] as const;

export const ATTRIBUTE_TYPES = [
    { id: 0, key: 'TEXT' },
    { id: 1, key: 'NUMBER' },
    { id: 4, key: 'LINK' },
    { id: 5, key: 'DATE' },
    { id: 6, key: 'LIST' },
    { id: 7, key: 'CHECKBOX' },
] as const;

export const ATTRIBUTE_TYPE_LIST = 6;
export const ATTRIBUTE_TYPE_TEXT = 0;

export const ATTRIBUTE_MODEL_NAMES = ['conversation_attribute', 'contact_attribute'] as const;

// `attribute_display_type` API trả về chữ thường; form dùng id số của gốc.
export const attributeTypeIdOf = (displayType: string): number =>
    ATTRIBUTE_TYPES.find(type => type.key.toLowerCase() === displayType)?.id ?? ATTRIBUTE_TYPE_TEXT;
