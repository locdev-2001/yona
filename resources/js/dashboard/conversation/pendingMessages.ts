import { MESSAGE_STATUS } from './constants';
import { localFileAttachment } from './localAttachment';
import type { ConversationMessage } from './types';

// Tin tạm của khung chat: chèn ngay lúc bấm Gửi (id âm, mang echo_id), bản máy
// chủ trả về — qua phản hồi hay realtime, cái nào tới trước — thay đúng chỗ theo
// echo_id. Tin tạm chưa tới máy chủ thì không có gì để "gửi lại" phía máy chủ:
// nó giữ nguyên nội dung ở máy, lỗi thì hiện Gửi lại / Xoá ngay trên bong bóng.

export interface OutgoingAttachment {
    file: File;
    // URL đọc được ngay trong trình duyệt để bong bóng tạm hiện ảnh trước khi tải lên xong.
    previewUrl: string;
}

/** Tin chỉ có ở máy: chưa được máy chủ cấp id. */
export function isUnsentMessageId(id: number): boolean {
    return id < 0;
}

/** Đính kèm của tin tạm, cùng hình dạng máy chủ trả để bong bóng hiện ngay ảnh/tệp. */
export function pendingAttachments(attachments: OutgoingAttachment[]): NonNullable<ConversationMessage['attachments']> {
    return attachments.map(({ file, previewUrl }, index) => ({ ...localFileAttachment(file, previewUrl, -(index + 1)) }));
}

function updateUnsent(
    messages: ConversationMessage[],
    echoId: string,
    update: (message: ConversationMessage) => ConversationMessage,
): ConversationMessage[] {
    return messages.map((message) =>
        message.echo_id === echoId && isUnsentMessageId(message.id) ? update(message) : message,
    );
}

/**
 * Gửi hỏng: giữ tin tạm với lý do lỗi theo cùng hình dạng lỗi kênh của máy chủ
 * (`external_error`) để bong bóng hiện một kiểu báo lỗi. Bản máy chủ đã thay
 * vào (realtime tới trước phản hồi lỗi) thì không đụng.
 */
export function markUnsentFailed(messages: ConversationMessage[], echoId: string, reason: string): ConversationMessage[] {
    return updateUnsent(messages, echoId, (message) => ({
        ...message,
        status: MESSAGE_STATUS.FAILED,
        content_attributes: { ...message.content_attributes, external_error: { message: reason } },
    }));
}

export function markUnsentSending(messages: ConversationMessage[], echoId: string): ConversationMessage[] {
    return updateUnsent(messages, echoId, (message) => {
        const { external_error: _discardedError, ...contentAttributes } = message.content_attributes;
        return { ...message, status: MESSAGE_STATUS.PROGRESS, content_attributes: contentAttributes };
    });
}

export function removeUnsent(messages: ConversationMessage[], echoId: string): ConversationMessage[] {
    return messages.filter((message) => !(message.echo_id === echoId && isUnsentMessageId(message.id)));
}
