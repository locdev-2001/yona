// Dấu chuyển tiếp trung tính `content_attributes.forwarded_from`, dùng cho cả hai
// chiều: agent chuyển tiếp trong Yona (`internal`, chỉ mang id nội bộ) và khách
// chuyển tiếp trên nền tảng (`channel`, tên người gửi gốc tuỳ chọn).

export type ForwardOrigin = 'internal' | 'channel';

export interface ForwardedFrom {
    origin: ForwardOrigin;
    senderName: string | null;
    sourceConversationId: number | null;
}

const FORWARD_ORIGINS: readonly string[] = ['internal', 'channel'];

export function readForwardedFrom(contentAttributes: Record<string, unknown>): ForwardedFrom | null {
    const raw = contentAttributes.forwarded_from;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

    const { origin, sender_name: senderName, conversation_id: conversationId } = raw as Record<string, unknown>;
    if (typeof origin !== 'string' || !FORWARD_ORIGINS.includes(origin)) return null;

    const sourceConversationId = Number(conversationId);

    return {
        origin: origin as ForwardOrigin,
        senderName: typeof senderName === 'string' && senderName.trim() !== '' ? senderName.trim() : null,
        sourceConversationId:
            origin === 'internal' && Number.isInteger(sourceConversationId) && sourceConversationId > 0
                ? sourceConversationId
                : null,
    };
}
