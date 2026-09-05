import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import { MEDIA_TYPES, NON_FILE_TYPES } from 'dashboard/components-next/message/constants';

// Phần thuần của SharedFiles.vue + components-next/SharedAttachments/{Media,Files}.vue.
const newestFirst = (first: MessageAttachment, second: MessageAttachment): number =>
    (second.created_at || 0) - (first.created_at || 0);

export function mediaAttachments(attachments: MessageAttachment[]): MessageAttachment[] {
    return attachments
        .filter(attachment => Boolean(attachment.data_url) && MEDIA_TYPES.includes(attachment.file_type))
        .sort(newestFirst);
}

export function fileAttachments(attachments: MessageAttachment[]): MessageAttachment[] {
    return attachments
        .filter(
            attachment =>
                Boolean(attachment.data_url) &&
                !MEDIA_TYPES.includes(attachment.file_type) &&
                !NON_FILE_TYPES.includes(attachment.file_type),
        )
        .sort(newestFirst);
}

// hasContent của SharedFiles.vue — quyết định hiện danh sách hay câu rỗng.
export function hasSharedContent(attachments: MessageAttachment[]): boolean {
    return attachments.some(
        attachment => Boolean(attachment.data_url) && !NON_FILE_TYPES.includes(attachment.file_type),
    );
}

// overflow của Media.vue: ô cuối của phần xem trước biến thành "+N".
export function mediaOverflowCount(total: number, peekLimit: number): number {
    if (peekLimit <= 0) return 0;

    return total > peekLimit ? total - (peekLimit - 1) : 0;
}

export function fileNameFromUrl(url?: string | null): string {
    if (!url) return '';
    const name = url.split('/').pop();

    return name ? decodeURIComponent(name) : '';
}
