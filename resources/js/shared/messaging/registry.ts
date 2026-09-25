import type { ComponentType } from 'react';

import type { StructuredMessage } from './model';

/**
 * Một loại tin có cấu trúc phía giao diện — đối xứng với StructuredType phía server.
 * Widget và hộp thư chỉ hỏi registry; không nơi nào khác rẽ nhánh theo content_type.
 */
export interface MessageTypeDefinition<Model = unknown> {
    contentType: string;
    /** `content_attributes` đã chuẩn hoá → model; payload sai (tin đời cũ) trả null để host hiện chữ. */
    parse: (attributes: Record<string, unknown>, message: StructuredMessage) => Model | null;
    View: ComponentType<{ model: Model; message: StructuredMessage }>;
    /**
     * `host`: host vẽ `content` thành bong bóng chữ thường rồi đặt View bên dưới
     * (câu hỏi + chip, lời dẫn + thẻ). `view`: View tự vẽ cả chữ (thẻ nút, form).
     */
    content: 'host' | 'view';
    /** Phía vẽ tin: tin khách tạo có cấu trúc (yêu cầu đặt hàng) nằm bên phải. */
    side: 'agent' | 'contact';
}

const definitions = new Map<string, MessageTypeDefinition>();

export function defineMessageType<Model>(definition: MessageTypeDefinition<Model>): MessageTypeDefinition<Model> {
    return definition;
}

export function registerMessageTypes(list: MessageTypeDefinition<never>[]): void {
    for (const definition of list) {
        definitions.set(definition.contentType, definition as unknown as MessageTypeDefinition);
    }
}

export const messageTypeFor = (contentType?: string | null): MessageTypeDefinition | undefined =>
    contentType ? definitions.get(contentType) : undefined;

export interface ResolvedStructuredMessage {
    definition: MessageTypeDefinition;
    model: unknown;
}

/** Tin có cấu trúc render được, hoặc null (không phải loại đăng ký, hay payload đời cũ sai). */
export function resolveStructured(message: StructuredMessage): ResolvedStructuredMessage | null {
    const definition = messageTypeFor(message.content_type);
    const attributes = message.content_attributes;

    if (!definition || !attributes || typeof attributes !== 'object') return null;

    const model = definition.parse(attributes, message);

    return model === null ? null : { definition, model };
}
