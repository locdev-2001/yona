import type { ConversationMessage } from 'dashboard/conversation/types';

import { readGroupSender } from './groupSender';

// Khối trích dẫn trên bong bóng đọc hai nguồn trung tính theo thứ tự: tin gốc
// thật (`in_reply_to`, lõi đã chuẩn hoá trong cùng hội thoại) rồi ảnh chụp của
// nền tảng (`in_reply_to_preview`, driver chiều vào ghi khi tin gốc không có
// trong Yona). Không đọc khoá riêng của kênh nào.

export interface ReplyQuote {
    // null = chỉ có ảnh chụp của nền tảng hoặc không tìm thấy → không cuộn tới được.
    targetId: number | null;
    senderName: string | null;
    content: string | null;
    attachmentType: string | null;
    // Đã tra xong mà không có tin gốc lẫn ảnh chụp.
    unavailable: boolean;
}

interface ReplyPreview {
    content: string | null;
    senderName: string | null;
    attachmentType: string | null;
}

function nonEmptyString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function readInReplyToId(contentAttributes: Record<string, unknown>): number | null {
    const id = Number(contentAttributes.in_reply_to);

    return Number.isInteger(id) && id > 0 ? id : null;
}

function readReplyPreview(contentAttributes: Record<string, unknown>): ReplyPreview | null {
    const raw = contentAttributes.in_reply_to_preview;
    if (!raw || typeof raw !== 'object') return null;

    const { content, sender_name: senderName, attachment_type: attachmentType } = raw as Record<string, unknown>;
    const preview = {
        content: nonEmptyString(content),
        senderName: nonEmptyString(senderName),
        attachmentType: nonEmptyString(attachmentType),
    };

    return preview.content || preview.senderName || preview.attachmentType ? preview : null;
}

function firstAttachmentType(message: ConversationMessage): string | null {
    const [first] = message.attachments ?? [];

    return nonEmptyString((first as { file_type?: unknown } | undefined)?.file_type);
}

/**
 * @param target tin gốc: có = đã có dữ liệu · null = đã tra, không có · undefined = chưa biết hoặc đang tải
 */
export function resolveReplyQuote(
    contentAttributes: Record<string, unknown>,
    target: ConversationMessage | null | undefined,
): ReplyQuote | null {
    const inReplyToId = readInReplyToId(contentAttributes);
    const preview = readReplyPreview(contentAttributes);

    if (inReplyToId === null && !preview) return null;

    if (target) {
        return {
            targetId: target.id,
            senderName:
                readGroupSender(target.content_attributes ?? {})?.name ??
                nonEmptyString(target.sender?.name) ??
                preview?.senderName ??
                null,
            content: nonEmptyString(target.content),
            attachmentType: firstAttachmentType(target),
            unavailable: false,
        };
    }

    if (preview) {
        return {
            targetId: target === null ? null : inReplyToId,
            senderName: preview.senderName,
            content: preview.content,
            attachmentType: preview.attachmentType,
            unavailable: false,
        };
    }

    if (target === null) {
        return { targetId: null, senderName: null, content: null, attachmentType: null, unavailable: true };
    }

    return null;
}
