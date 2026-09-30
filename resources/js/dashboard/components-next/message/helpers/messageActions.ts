import { inboxSupports } from 'shared/composables/useInboxCapabilities';

import { MESSAGE_STATUS, MESSAGE_TYPES } from '../constants';

// Nguồn duy nhất cho thao tác trên một tin: cờ nào bật (theo NĂNG LỰC KÊNH của
// inbox, trạng thái tin và handler nơi dựng có truyền hay không) và danh sách
// thao tác theo nhóm. Thanh rê chuột, menu ⋯/chuột phải và bottom sheet trên
// điện thoại cùng đọc từ đây. Thêm thao tác mới = một cờ + một dòng trong
// MESSAGE_ACTIONS + một handler ở MessageActions.

export interface MessageActionHandlers {
    reply: boolean;
    react: boolean;
    delete: boolean;
    forward: boolean;
    createCannedResponse?: boolean;
    translate?: boolean;
}

export interface MessageActionInput {
    id: number;
    messageType: number;
    status: string | null;
    isPrivate: boolean;
    content?: string | null;
    // Tin có đúng một ảnh sao chép được (lưới nhiều ảnh dùng menu gốc của từng ảnh).
    hasCopyableImage?: boolean;
    contentAttributes: Record<string, unknown>;
    inboxCapabilities: readonly string[];
    // Nơi dựng bong bóng có truyền handler cho hành động đó hay không.
    handlers: MessageActionHandlers;
}

export interface MessageActionFlags {
    reply: boolean;
    react: boolean;
    delete: boolean;
    // Chuyển tiếp không gate theo kênh nguồn: năng lực nằm ở hộp thư đích, lõi
    // quyết cho từng đích khi agent chọn.
    forward: boolean;
    copy: boolean;
    copyImage: boolean;
    copyLink: boolean;
    createCannedResponse: boolean;
    translate: boolean;
    // Kênh thu hồi được ở cả hai đầu → nút xoá mang nhãn "thu hồi".
    recall: boolean;
}

export type MessageActionId = 'reply' | 'forward' | 'copy' | 'copyImage' | 'copyLink' | 'createCannedResponse' | 'translate' | 'delete';

export type MessageActionGroup = 'respond' | 'content' | 'danger';

export interface MessageActionDescriptor {
    id: MessageActionId;
    group: MessageActionGroup;
    icon: string;
    // Nhãn của "xoá" đổi theo cờ recall nên tính ở nơi vẽ, không cố định ở đây.
    labelKey: string;
}

// Thứ tự trong mảng là thứ tự hiện trên menu; nhóm `danger` luôn cuối, chữ đỏ.
export const MESSAGE_ACTIONS: readonly MessageActionDescriptor[] = [
    { id: 'reply', group: 'respond', icon: 'i-lucide-reply', labelKey: 'CONVERSATION.MESSAGE_ACTIONS.REPLY' },
    { id: 'forward', group: 'respond', icon: 'i-lucide-forward', labelKey: 'CONVERSATION.MESSAGE_ACTIONS.FORWARD' },
    { id: 'copy', group: 'content', icon: 'i-lucide-copy', labelKey: 'CONVERSATION.CONTEXT_MENU.COPY' },
    { id: 'copyImage', group: 'content', icon: 'i-lucide-image', labelKey: 'CONVERSATION.CONTEXT_MENU.COPY_IMAGE' },
    { id: 'copyLink', group: 'content', icon: 'i-lucide-link', labelKey: 'CONVERSATION.CONTEXT_MENU.COPY_PERMALINK' },
    {
        id: 'createCannedResponse',
        group: 'content',
        icon: 'i-lucide-message-square-quote',
        labelKey: 'CONVERSATION.CONTEXT_MENU.CREATE_A_CANNED_RESPONSE',
    },
    { id: 'translate', group: 'content', icon: 'i-lucide-languages', labelKey: 'CONVERSATION.CONTEXT_MENU.TRANSLATE' },
    { id: 'delete', group: 'danger', icon: 'i-lucide-trash-2', labelKey: 'CONVERSATION.MESSAGE_ACTIONS.DELETE' },
];

// Tin đã gửi xong của cuộc trò chuyện (không phải ghi chú, hoạt động, tin đang chờ).
const CHAT_MESSAGE_TYPES: number[] = [MESSAGE_TYPES.INCOMING, MESSAGE_TYPES.OUTGOING];

const UNSETTLED_STATUSES: Array<string | null> = [MESSAGE_STATUS.FAILED, MESSAGE_STATUS.PROGRESS];

export function resolveMessageActions({
    id,
    messageType,
    status,
    isPrivate,
    content = null,
    hasCopyableImage = false,
    contentAttributes,
    inboxCapabilities,
    handlers,
}: MessageActionInput): MessageActionFlags {
    const inbox = { capabilities: inboxCapabilities };
    const isDeleted = Boolean(contentAttributes.deleted);
    const isSettledChatMessage =
        !isDeleted &&
        !isPrivate &&
        id > 0 &&
        CHAT_MESSAGE_TYPES.includes(messageType) &&
        !UNSETTLED_STATUSES.includes(status);
    const hasText = !isDeleted && Boolean(content?.trim());

    return {
        reply: handlers.reply && inboxSupports(inbox, 'outbound_reply_to') && isSettledChatMessage,
        react: handlers.react && inboxSupports(inbox, 'outbound_reaction') && !isDeleted,
        delete: handlers.delete && !isDeleted && messageType === MESSAGE_TYPES.OUTGOING,
        forward: handlers.forward && isSettledChatMessage,
        copy: hasText,
        copyImage: !isDeleted && hasCopyableImage,
        copyLink: !isDeleted && id > 0,
        createCannedResponse: Boolean(handlers.createCannedResponse) && hasText,
        translate: Boolean(handlers.translate) && hasText && id > 0 && messageType !== MESSAGE_TYPES.ACTIVITY,
        recall: inboxSupports(inbox, 'outbound_recall'),
    };
}

// Thao tác hiện trên menu, giữ thứ tự nguồn và chia nhóm; nhóm rỗng bị bỏ để
// không vẽ vạch ngăn thừa. Thao tác kênh không hỗ trợ thì không có mặt.
export function groupMessageActions(flags: MessageActionFlags): MessageActionDescriptor[][] {
    const visible = MESSAGE_ACTIONS.filter(action => flags[action.id]);
    const groups: MessageActionGroup[] = ['respond', 'content', 'danger'];

    return groups.map(group => visible.filter(action => action.group === group)).filter(items => items.length > 0);
}

export function hasAnyMessageAction(flags: MessageActionFlags): boolean {
    return flags.react || MESSAGE_ACTIONS.some(action => flags[action.id]);
}

// Liên kết mở hội thoại đang xem tại đúng tin này (cùng tham số tìm kiếm dùng).
export function messagePermalink(currentUrl: string, messageId: number, paramName: string): string {
    const url = new URL(currentUrl);
    url.search = '';
    url.hash = '';
    url.searchParams.set(paramName, String(messageId));

    return url.toString();
}
