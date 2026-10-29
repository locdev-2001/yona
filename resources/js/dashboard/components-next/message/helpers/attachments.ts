import type { ConversationMessage } from 'dashboard/conversation/types';

import { ATTACHMENT_TYPES, MEDIA_TYPES, MESSAGE_STATUS } from '../constants';

// Phần thuần của Message.vue#componentToRender + chips/AttachmentChips.vue +
// provider.js#filteredCurrentChatAttachments. Payload đính kèm giữ nguyên
// snake_case của `_attachment.json.jbuilder` (bản gốc camel hóa trong store rồi
// snake hóa lại khi mở gallery — ta bỏ vòng lặp đó).

export interface MessageAttachment {
    id: number;
    message_id?: number;
    file_type: string;
    extension?: string | null;
    data_url?: string | null;
    thumb_url?: string | null;
    file_size?: number | null;
    width?: number | null;
    height?: number | null;
    fallback_title?: string | null;
    filename?: string | null;
    created_at?: number;
    sender?: Record<string, unknown> | null;
}

export const BUBBLE_NAMES = {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    FILE: 'file',
    LOCATION: 'location',
    FALLBACK: 'fallback',
} as const;

export type BubbleName = (typeof BUBBLE_NAMES)[keyof typeof BUBBLE_NAMES];

const SINGLE_ATTACHMENT_BUBBLES: Record<string, BubbleName> = {
    [ATTACHMENT_TYPES.IMAGE]: BUBBLE_NAMES.IMAGE,
    [ATTACHMENT_TYPES.FILE]: BUBBLE_NAMES.FILE,
    [ATTACHMENT_TYPES.AUDIO]: BUBBLE_NAMES.AUDIO,
    [ATTACHMENT_TYPES.VIDEO]: BUBBLE_NAMES.VIDEO,
    [ATTACHMENT_TYPES.LOCATION]: BUBBLE_NAMES.LOCATION,
    [ATTACHMENT_TYPES.IG_REEL]: BUBBLE_NAMES.VIDEO,
};

/**
 * componentToRender của Message.vue, phần đính kèm: chỉ đúng MỘT đính kèm và
 * không có nội dung chữ mới lên bubble riêng; ngược lại về bubble text (đính kèm
 * hiện dạng chip). fallback bỏ qua điều kiện content như bản gốc.
 */
export function resolveBubbleName(
    attachments: MessageAttachment[] | undefined | null,
    content: string | null | undefined,
): BubbleName {
    if (!Array.isArray(attachments) || attachments.length !== 1) return BUBBLE_NAMES.TEXT;

    const fileType = attachments[0].file_type;
    if (fileType === ATTACHMENT_TYPES.FALLBACK) return BUBBLE_NAMES.FALLBACK;
    if (content) return BUBBLE_NAMES.TEXT;

    return SINGLE_ATTACHMENT_BUBBLES[fileType] ?? BUBBLE_NAMES.TEXT;
}

export interface AttachmentChipGroups {
    media: MessageAttachment[];
    recordings: MessageAttachment[];
    files: MessageAttachment[];
}

/**
 * AttachmentChips.vue: nhóm ảnh+video (ảnh đứng trước video), ghi âm và tệp.
 */
export function groupAttachmentChips(attachments: MessageAttachment[] | undefined | null): AttachmentChipGroups {
    const all = Array.isArray(attachments) ? attachments : [];
    const mediaOrder = [ATTACHMENT_TYPES.IMAGE, ATTACHMENT_TYPES.VIDEO] as string[];

    return {
        media: all
            .filter((attachment) => mediaOrder.includes(attachment.file_type))
            .sort((a, b) => mediaOrder.indexOf(a.file_type) - mediaOrder.indexOf(b.file_type)),
        recordings: all.filter((attachment) => attachment.file_type === ATTACHMENT_TYPES.AUDIO),
        files: all.filter((attachment) => attachment.file_type === ATTACHMENT_TYPES.FILE),
    };
}

/**
 * ADD_CONVERSATION_ATTACHMENTS: gom đính kèm của các tin ĐÃ gửi, thêm created_at
 * và sender như `_attachment.json.jbuilder` để header gallery có dữ liệu.
 */
export function collectMediaAttachments(messages: ConversationMessage[]): MessageAttachment[] {
    return messages.flatMap((message) => {
        if (message.status !== MESSAGE_STATUS.SENT) return [];
        const attachments = (message.attachments ?? []) as unknown as MessageAttachment[];

        return attachments
            .filter((attachment) => MEDIA_TYPES.includes(attachment.file_type))
            .map((attachment) => ({
                ...attachment,
                message_id: attachment.message_id ?? message.id,
                created_at: attachment.created_at ?? message.created_at,
                sender: (attachment.sender ?? message.sender ?? null) as Record<string, unknown> | null,
            }));
    });
}

/** Tên tệp để hiện: tên gốc nếu API trả, không thì đoạn cuối của đường dẫn tệp. */
export function attachmentFileName(attachment: MessageAttachment): string {
    if (attachment.filename) return attachment.filename;

    const lastSegment = (attachment.data_url ?? '').split(/[?#]/)[0].split('/').pop() ?? '';
    try {
        return decodeURIComponent(lastSegment);
    } catch {
        return lastSegment;
    }
}

/** Phần mở rộng viết thường, dùng chọn icon theo loại tệp. */
export function attachmentExtension(attachment: MessageAttachment): string {
    const fileName = attachmentFileName(attachment);
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex > 0) return fileName.slice(dotIndex + 1).toLowerCase();

    return (attachment.extension ?? '').replace(/^\./, '').toLowerCase();
}

/**
 * Danh sách trình xem đi qua khi mở một ảnh/video trong tin: tin nhiều mục thì
 * lướt đúng các mục của tin (đếm "3/7"); tin một mục duyệt cả hội thoại. Mục
 * của tin lấy bản đã gom ở hội thoại (có người gửi, thời điểm) khi có.
 */
export function resolveGalleryItems(
    messageMedia: MessageAttachment[],
    conversationMedia: MessageAttachment[],
    opened: MessageAttachment,
): MessageAttachment[] {
    if (messageMedia.length > 1) {
        return messageMedia.map((item) => conversationMedia.find((known) => known.id === item.id) ?? item);
    }

    return conversationMedia.some((item) => item.id === opened.id) ? conversationMedia : messageMedia;
}

const SINGLE_MEDIA_MAX_WIDTH = 288;
const SINGLE_MEDIA_MAX_HEIGHT = 320;
const SINGLE_MEDIA_MIN_WIDTH = 128;
const SINGLE_MEDIA_FALLBACK = { width: 240, height: 180 };

export interface MediaFrame {
    width: number;
    aspectRatio: string;
}

/**
 * Khung của một ảnh/video đứng riêng: giữ tỉ lệ thật, không vượt khung tối đa,
 * không hẹp quá mức (ảnh quá dọc thì cắt giữa). Chưa biết kích thước thì dùng
 * khung 4:3 để giữ chỗ.
 */
export function singleMediaFrame(width?: number | null, height?: number | null): MediaFrame {
    const hasSize = Boolean(width && height && width > 0 && height > 0);
    const sourceWidth = hasSize ? Number(width) : SINGLE_MEDIA_FALLBACK.width;
    const sourceHeight = hasSize ? Number(height) : SINGLE_MEDIA_FALLBACK.height;

    const fittedWidth = Math.min(SINGLE_MEDIA_MAX_WIDTH, sourceWidth, (SINGLE_MEDIA_MAX_HEIGHT * sourceWidth) / sourceHeight);
    const frameWidth = Math.round(Math.max(SINGLE_MEDIA_MIN_WIDTH, fittedWidth));
    const frameHeight = Math.min(SINGLE_MEDIA_MAX_HEIGHT, Math.round((frameWidth * sourceHeight) / sourceWidth));

    return { width: frameWidth, aspectRatio: `${frameWidth} / ${Math.max(1, frameHeight)}` };
}
