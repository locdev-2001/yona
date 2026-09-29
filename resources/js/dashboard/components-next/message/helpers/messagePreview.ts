import { getPlainText } from 'shared/helpers/MessageFormatter';
import type { ConversationMessage } from 'dashboard/conversation/types';
import { deletedMessageLabel } from './deletedMessage';

export type MessagePreviewBody =
    | { kind: 'sticker' }
    | { kind: 'text'; text: string }
    | { kind: 'attachment'; fileType: string }
    | { kind: 'empty' };

/**
 * Một dòng xem trước nói gì, cùng thứ tự với App\Messaging\MessagePreview: tin thu hồi,
 * sticker (dù mang ảnh đính kèm hay chữ), chữ hoặc dòng máy chủ gửi sẵn, rồi mới tới tệp.
 */
export function messagePreviewBody(message: Partial<ConversationMessage>): MessagePreviewBody {
    const deletedLabel = deletedMessageLabel(message.content_attributes);
    if (deletedLabel) return { kind: 'text', text: deletedLabel };

    if (message.content_type === 'sticker') return { kind: 'sticker' };

    const subject = (message.content_attributes as { email?: { subject?: string } } | null | undefined)?.email?.subject;
    if (message.content || message.preview_text) {
        return { kind: 'text', text: message.preview_text || getPlainText(subject || message.content) };
    }

    if (message.attachments) return { kind: 'attachment', fileType: String(message.attachments[0]?.file_type ?? '') };

    return { kind: 'empty' };
}
