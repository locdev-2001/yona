import { inboxSupports } from 'shared/composables/useInboxCapabilities';

import { MESSAGE_STATUS, MESSAGE_TYPES } from '../constants';

// Nguồn duy nhất quyết định nút nào hiện trên thanh hành động của bong bóng.
// Gate theo NĂNG LỰC KÊNH của inbox, không theo loại kênh. Hành động mới thêm
// một cờ ở đây và một nút trong MessageActions.

export interface MessageActionInput {
    id: number;
    messageType: number;
    status: string | null;
    isPrivate: boolean;
    contentAttributes: Record<string, unknown>;
    inboxCapabilities: readonly string[];
    // Nơi dựng bong bóng có truyền handler cho hành động đó hay không.
    handlers: { reply: boolean; react: boolean; delete: boolean };
}

export interface MessageActionFlags {
    reply: boolean;
    react: boolean;
    delete: boolean;
    // Kênh thu hồi được ở cả hai đầu → nút xoá mang nhãn "thu hồi".
    recall: boolean;
}

const REPLYABLE_MESSAGE_TYPES: number[] = [MESSAGE_TYPES.INCOMING, MESSAGE_TYPES.OUTGOING];

const UNSETTLED_STATUSES: Array<string | null> = [MESSAGE_STATUS.FAILED, MESSAGE_STATUS.PROGRESS];

export function resolveMessageActions({
    id,
    messageType,
    status,
    isPrivate,
    contentAttributes,
    inboxCapabilities,
    handlers,
}: MessageActionInput): MessageActionFlags {
    const inbox = { capabilities: inboxCapabilities };
    const isDeleted = Boolean(contentAttributes.deleted);

    return {
        reply:
            handlers.reply &&
            inboxSupports(inbox, 'outbound_reply_to') &&
            !isDeleted &&
            !isPrivate &&
            id > 0 &&
            REPLYABLE_MESSAGE_TYPES.includes(messageType) &&
            !UNSETTLED_STATUSES.includes(status),
        react: handlers.react && inboxSupports(inbox, 'outbound_reaction') && !isDeleted,
        delete: handlers.delete && !isDeleted && messageType === MESSAGE_TYPES.OUTGOING,
        recall: inboxSupports(inbox, 'outbound_recall'),
    };
}
