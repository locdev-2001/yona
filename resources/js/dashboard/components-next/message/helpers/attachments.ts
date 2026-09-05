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
    created_at?: number;
    sender?: Record<string, unknown> | null;
}

export const BUBBLE_NAMES = {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    FILE: 'file',
    FALLBACK: 'fallback',
} as const;

export type BubbleName = (typeof BUBBLE_NAMES)[keyof typeof BUBBLE_NAMES];

const SINGLE_ATTACHMENT_BUBBLES: Record<string, BubbleName> = {
    [ATTACHMENT_TYPES.IMAGE]: BUBBLE_NAMES.IMAGE,
    [ATTACHMENT_TYPES.FILE]: BUBBLE_NAMES.FILE,
    [ATTACHMENT_TYPES.AUDIO]: BUBBLE_NAMES.AUDIO,
    [ATTACHMENT_TYPES.VIDEO]: BUBBLE_NAMES.VIDEO,
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
