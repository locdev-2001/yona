import type { ConversationMessage } from 'dashboard/conversation/types';
import { yonaStickerImageUrl } from 'shared/sticker/stickerPayload';

import { ATTACHMENT_TYPES, CONTENT_TYPES } from '../constants';
import { attachmentExtension, attachmentFileName, type MessageAttachment } from './attachments';
import { readGroupSender } from './groupSender';

// Khối trích dẫn trên bong bóng đọc hai nguồn trung tính theo thứ tự: tin gốc
// thật (`in_reply_to`, lõi đã chuẩn hoá trong cùng hội thoại) rồi ảnh chụp của
// nền tảng (`in_reply_to_preview`, driver chiều vào ghi khi tin gốc không có
// trong Yona). Không đọc khoá riêng của kênh nào.

export type ReplyQuoteMediaKind = 'image' | 'video' | 'sticker' | 'audio' | 'file';

// Hình thu nhỏ hoặc tệp của tin gốc — chỉ có khi tin gốc nằm trong Yona.
export interface ReplyQuoteMedia {
    kind: ReplyQuoteMediaKind;
    // Ảnh tĩnh để thu nhỏ (ảnh, ảnh bìa video, sticker); null = không có ảnh thu nhỏ.
    imageUrl: string | null;
    // Video không có ảnh bìa thì lấy khung đầu từ chính tệp.
    videoUrl: string | null;
    fileName: string | null;
    extension: string;
    fileSize: number | null;
}

export interface ReplyQuote {
    // null = chỉ có ảnh chụp của nền tảng hoặc không tìm thấy → không cuộn tới được.
    targetId: number | null;
    senderName: string | null;
    content: string | null;
    attachmentType: string | null;
    media: ReplyQuoteMedia | null;
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

function firstAttachment(message: ConversationMessage): MessageAttachment | null {
    const [first] = (message.attachments ?? []) as unknown as MessageAttachment[];

    return first ?? null;
}

const ATTACHMENT_MEDIA_KINDS: Record<string, ReplyQuoteMediaKind> = {
    [ATTACHMENT_TYPES.IMAGE]: 'image',
    [ATTACHMENT_TYPES.VIDEO]: 'video',
    [ATTACHMENT_TYPES.IG_REEL]: 'video',
    [ATTACHMENT_TYPES.AUDIO]: 'audio',
    [ATTACHMENT_TYPES.FILE]: 'file',
};

/** Ảnh/video/sticker/tệp của một tin để hiện thu nhỏ trong khối trích dẫn hoặc ô soạn. */
export function replyQuoteMediaOf(message: ConversationMessage): ReplyQuoteMedia | null {
    const attachment = firstAttachment(message);
    const isSticker = message.content_type === CONTENT_TYPES.STICKER;
    const kind = isSticker ? 'sticker' : attachment ? ATTACHMENT_MEDIA_KINDS[attachment.file_type] : undefined;

    if (!kind) return null;

    const dataUrl = nonEmptyString(attachment?.data_url);
    const thumbUrl = nonEmptyString(attachment?.thumb_url);
    const imageUrl = {
        sticker: () => yonaStickerImageUrl(message.content_attributes?.sticker) ?? dataUrl,
        image: () => thumbUrl ?? dataUrl,
        video: () => thumbUrl,
        audio: () => null,
        file: () => null,
    }[kind]();

    return {
        kind,
        imageUrl,
        videoUrl: kind === 'video' ? dataUrl : null,
        fileName: attachment ? nonEmptyString(attachmentFileName(attachment)) : null,
        extension: attachment ? attachmentExtension(attachment) : '',
        fileSize: attachment?.file_size ?? null,
    };
}

/** Khối trích dẫn dựng từ chính tin gốc (bong bóng trả lời và ô soạn đang trả lời). */
export function quoteOfMessage(message: ConversationMessage, fallbackSenderName: string | null = null): ReplyQuote {
    const media = replyQuoteMediaOf(message);

    return {
        targetId: message.id,
        senderName:
            readGroupSender(message.content_attributes ?? {})?.name ??
            nonEmptyString(message.sender?.name) ??
            fallbackSenderName,
        content: nonEmptyString(message.content),
        attachmentType: media?.kind === 'sticker' ? 'sticker' : nonEmptyString(firstAttachment(message)?.file_type),
        media,
        unavailable: false,
    };
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
        return quoteOfMessage(target, preview?.senderName ?? null);
    }

    if (preview) {
        return {
            targetId: target === null ? null : inReplyToId,
            senderName: preview.senderName,
            content: preview.content,
            attachmentType: preview.attachmentType,
            media: null,
            unavailable: false,
        };
    }

    if (target === null) {
        return { targetId: null, senderName: null, content: null, attachmentType: null, media: null, unavailable: true };
    }

    return null;
}
