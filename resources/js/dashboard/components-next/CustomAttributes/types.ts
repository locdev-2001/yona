import type { CamelCustomAttribute } from 'dashboard/composables/useCustomAttributes';

// Thuộc tính kèm giá trị hiện tại của liên hệ (ContactCustomAttributes dựng ra).
export interface CustomAttributeWithValue extends CamelCustomAttribute {
    value: unknown;
}

export interface AttributeInputProps {
    attribute: CustomAttributeWithValue;
    isEditingView?: boolean;
    onUpdate: (value: unknown) => void;
    onDelete: () => void;
}
