// Hình dạng payload tin có cấu trúc SAU KHI server chuẩn hoá — khớp
// app/Messaging/Structured và fixtures ở tests/Contracts/Messaging.

export type ActionKind = 'reply' | 'link' | 'webview' | 'order' | 'copy' | 'call' | 'postback';

export interface StructuredAction {
    kind: ActionKind;
    label: string;
    value?: string;
    url?: string;
    page?: string;
    phone?: string;
    payload?: string;
}

export interface Price {
    amount: number;
    currency: string;
    compare_at?: number;
    discount_percent?: number;
}

export interface VariantOption {
    value: string;
    label: string;
    media_url?: string;
    disabled?: boolean;
}

export interface Variant {
    name: string;
    options: VariantOption[];
}

export interface CardItem {
    id: string;
    title: string;
    description?: string;
    media_url?: string;
    price?: Price;
    stock_label?: string;
    max_quantity?: number;
    variants?: Variant[];
    actions: StructuredAction[];
}

export interface ChoiceItem {
    title: string;
    value: string;
}

export interface ArticleItem {
    title: string;
    description?: string;
    url: string;
}

export type FormFieldType = 'text' | 'text_area' | 'email' | 'phone' | 'select' | 'date';

export interface FormField {
    name: string;
    type: FormFieldType;
    label: string;
    placeholder?: string;
    required?: boolean;
    options?: { label: string; value: string }[];
}

export type OrderStatus = 'placed' | 'confirmed' | 'shipped' | 'delivering' | 'delivered' | 'cancelled';

/** Câu trả lời đã ghi trên tin gốc (`content_attributes.submitted_values`). */
export interface SubmittedValue {
    name?: string;
    title?: string;
    value?: string;
}

/** Phần tối thiểu của một tin mà kit cần, chung cho widget và hộp thư. */
export interface StructuredMessage {
    id: number | string;
    content?: string | null;
    content_type?: string | null;
    content_attributes?: Record<string, unknown> | null;
    message_type: number;
}
