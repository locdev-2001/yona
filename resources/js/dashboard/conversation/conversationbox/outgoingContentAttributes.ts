// Nguồn duy nhất dựng `content_attributes` cho tin agent gửi đi từ khung soạn.
// Mỗi thao tác soạn (trả lời trích dẫn, và sau này nhắc tên, sticker…) thêm một
// trường vào input và một khoá ở đây — ReplyBox không tự ghép payload.

export interface OutgoingComposeInput {
    inReplyTo?: number | null;
}

export function buildOutgoingContentAttributes({ inReplyTo }: OutgoingComposeInput): Record<string, unknown> | undefined {
    const attributes: Record<string, unknown> = {};

    if (typeof inReplyTo === 'number' && inReplyTo > 0) {
        attributes.in_reply_to = inReplyTo;
    }

    return Object.keys(attributes).length > 0 ? attributes : undefined;
}
