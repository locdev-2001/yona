import { readCallLog } from 'dashboard/calls/callLog';
import type { ConversationMessage } from 'dashboard/conversation/types';
import { MESSAGE_TYPES } from '../constants';
import { readGroupSender } from './groupSender';

export type CallNoticeSide = 'own' | 'other';

/**
 * Tin cuộc gọi trong nhóm (mở phòng thoại, gọi nhóm) mang người khởi tạo làm người gửi, nên nằm
 * và gộp cụm theo người đó như tin nhắn thường. Tin người khác khởi tạo có `content_attributes.sender`.
 * null: tin hệ thống thường (căn giữa, đứng riêng).
 */
export function callNoticeSide(message: ConversationMessage): CallNoticeSide | null {
    const contentAttributes = message.content_attributes ?? {};
    const isInitiatedNotice =
        message.message_type === MESSAGE_TYPES.ACTIVITY && readCallLog(contentAttributes) !== null && Boolean(message.sender_id ?? message.sender?.id);

    if (!isInitiatedNotice) return null;

    return readGroupSender(contentAttributes) === null ? 'own' : 'other';
}
