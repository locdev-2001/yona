import { getPlainText } from 'shared/helpers/MessageFormatter';
import type { ConversationMessage } from 'dashboard/conversation/types';
import { readCallLog } from 'dashboard/calls/callLog';
import type { CallLogData } from 'dashboard/calls/callLog';
import { deletedMessageLabel } from './deletedMessage';

export type MessagePreviewBody =
    | { kind: 'sticker' }
    | { kind: 'call'; call: CallLogData }
    | { kind: 'text'; text: string }
    | { kind: 'attachment'; fileType: string }
    | { kind: 'empty' };

/**
 * Một dòng xem trước nói gì, cùng thứ tự với App\Messaging\MessagePreview: tin thu hồi,
 * cuộc gọi (lời theo người xem, dịch lúc hiển thị), sticker (dù mang ảnh đính kèm hay chữ), chữ hoặc dòng máy chủ gửi sẵn, rồi mới tới tệp
 * (kể cả tệp còn đang dựng).
 */
export function messagePreviewBody(message: Partial<ConversationMessage>): MessagePreviewBody {
    const deletedLabel = deletedMessageLabel(message.content_attributes);
    if (deletedLabel) return { kind: 'text', text: deletedLabel };

    const call = readCallLog(message.content_attributes as Record<string, unknown> | null | undefined);
    if (call) return { kind: 'call', call };

    if (message.content_type === 'sticker') return { kind: 'sticker' };

    const subject = (message.content_attributes as { email?: { subject?: string } } | null | undefined)?.email?.subject;
    if (message.content || message.preview_text) {
        return { kind: 'text', text: message.preview_text || getPlainText(subject || message.content) };
    }

    if (message.attachments?.length) return { kind: 'attachment', fileType: String(message.attachments[0]?.file_type ?? '') };

    // Tệp còn đang dựng ở worker: xem trước như tin có tệp.
    if ((message.content_attributes as { pending_document?: unknown } | null | undefined)?.pending_document) {
        return { kind: 'attachment', fileType: 'file' };
    }

    return { kind: 'empty' };
}
