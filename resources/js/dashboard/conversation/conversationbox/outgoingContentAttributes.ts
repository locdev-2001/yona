import type { OutgoingMention } from 'dashboard/components/widgets/WootWriter/groupMemberMentions';

// Nguồn duy nhất dựng `content_attributes` cho tin agent gửi đi từ khung soạn.
// Mỗi thao tác soạn (trả lời trích dẫn, nhắc tên thành viên nhóm…) thêm một trường
// vào input và một khoá ở đây — ReplyBox không tự ghép payload. Sticker không đi
// đường này: `content_attributes.sticker` do máy chủ dựng từ `sticker_id`.

export interface OutgoingComposeInput {
    inReplyTo?: number | null;
    mentions?: OutgoingMention[];
}

export function buildOutgoingContentAttributes({
    inReplyTo,
    mentions,
}: OutgoingComposeInput): Record<string, unknown> | undefined {
    const attributes: Record<string, unknown> = {};

    if (typeof inReplyTo === 'number' && inReplyTo > 0) {
        attributes.in_reply_to = inReplyTo;
    }

    if (mentions?.length) {
        attributes.mentions = mentions;
    }

    return Object.keys(attributes).length > 0 ? attributes : undefined;
}
