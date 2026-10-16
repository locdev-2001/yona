import { format, fromUnixTime } from 'date-fns';
import { messageMarkdownHtml } from 'shared/helpers/externalLinks';

import { joinsPreviousMessage, resolveGroupPositions } from 'shared/helpers/messageGrouping';
import type { GroupableMessage } from 'shared/helpers/messageGrouping';

import { messageTypeFor } from 'shared/messaging';

import { MESSAGE_TYPE, STANDALONE_CONTENT_TYPES } from './constants';
import { getUuid, groupBy } from './utils';
import type { MessageAttachment, MessagesOfDay, PositionedMessage, WidgetMessage } from '../types';

// Port từ widget/store/modules/conversation/helpers.js + getters.js (phần thuần)
// và shared/helpers/DateHelper.js#formatUnixDate.

/** HTML của nội dung tin trong widget: link mở tab mới thay vì điều hướng ngay trong iframe widget. */
export const messageHtml = (content: string | null | undefined): string => messageMarkdownHtml(content);

export const formatUnixDate =(date: number, dateFormat = 'MMM dd, yyyy'): string =>
    format(fromUnixTime(date), dateFormat);

// shared/helpers/MessageTypeHelper.js
export const isASubmittedFormMessage = (message: Pick<WidgetMessage, 'content_type' | 'content_attributes'>): boolean =>
    message?.content_type === 'form' && Boolean(message?.content_attributes?.submitted_values);

export const createTemporaryMessage = ({
    attachments,
    content,
    contentType,
    contentAttributes,
    replyTo,
}: {
    attachments?: MessageAttachment[];
    content?: string;
    contentType?: string;
    contentAttributes?: WidgetMessage['content_attributes'];
    replyTo?: number | string | null;
}): WidgetMessage => ({
    id: getUuid(),
    content,
    attachments,
    status: 'in_progress',
    replyTo,
    created_at: new Date().getTime() / 1000,
    message_type: MESSAGE_TYPE.INCOMING,
    ...(contentType ? { content_type: contentType } : {}),
    ...(contentAttributes ? { content_attributes: contentAttributes } : {}),
});

// Quy tin widget về dạng của luật gộp nhóm dùng chung: cùng chiều tin + cùng người
// gửi; tin có khung riêng (khảo sát, biểu mẫu, carousel…) luôn đứng một mình.
// Id người gửi chỉ duy nhất trong từng kiểu (nhân viên #1 khác AI #1), nên khoá phải mang kiểu.
const toGroupableMessage = (message: WidgetMessage): GroupableMessage => ({
    senderKey: `${message.message_type}:${message.sender?.type ?? ''}:${message.sender?.id ?? message.sender?.name ?? ''}`,
    createdAt: message.created_at,
    standalone:
        isASubmittedFormMessage(message) ||
        STANDALONE_CONTENT_TYPES.includes(message.content_type ?? '') ||
        messageTypeFor(message.content_type) !== undefined,
});

const splitIntoGroups = (messages: WidgetMessage[]): PositionedMessage[][] => {
    const positions = resolveGroupPositions(messages.map(toGroupableMessage));

    return messages.reduce<PositionedMessage[][]>((groups, message, index) => {
        const position = positions[index];
        if (joinsPreviousMessage(position) && groups.length) {
            groups[groups.length - 1].push({ message, position });
        } else {
            groups.push([{ message, position }]);
        }
        return groups;
    }, []);
};

export const groupMessagesByDate = (messages: WidgetMessage[]): MessagesOfDay[] => {
    const messagesGroupedByDate = groupBy(messages, message => formatUnixDate(message.platform_sent_at ?? message.created_at));
    return Object.keys(messagesGroupedByDate).map(date => ({
        date,
        groups: splitIntoGroups(messagesGroupedByDate[date]),
    }));
};

export const findUndeliveredMessage = (
    messageInbox: Record<string, WidgetMessage>,
    { content }: Pick<WidgetMessage, 'content'>,
): WidgetMessage[] =>
    Object.values(messageInbox).filter(message => message.content === content && message.status === 'in_progress');

// Tin đã thu hồi vẫn nằm trong danh sách để hiện bong bóng nét đứt cho cả hai bên.
export const isDeletedMessage = (message: Pick<WidgetMessage, 'content_attributes'>): boolean =>
    Boolean(message?.content_attributes?.deleted);

// Chỉ để ẩn/hiện mục "Thu hồi"; máy chủ vẫn là nơi quyết định cuối cùng.
export const canRecallMessage = (
    message: WidgetMessage,
    recallWindowSeconds: number,
    nowSeconds = Date.now() / 1000,
): boolean =>
    message.message_type === MESSAGE_TYPE.INCOMING &&
    typeof message.id === 'number' &&
    !isDeletedMessage(message) &&
    message.status !== 'in_progress' &&
    message.status !== 'failed' &&
    nowSeconds - message.created_at < recallWindowSeconds;

// Tin đang tải lên huỷ được tới khi mọi tệp đã lên hết máy chủ. Tin chỉ có một tệp (không
// phải ảnh) đặt nút huỷ ngay trên thẻ tệp; tin nhiều tệp hoặc có ảnh có đúng MỘT nút
// "Huỷ gửi" dưới tin, vì huỷ là huỷ cả tin.
export type UploadCancelPlacement = 'card' | 'message';

export const uploadCancelPlacement = (message: WidgetMessage): UploadCancelPlacement | null => {
    const attachments = message.attachments ?? [];
    if (message.status !== 'in_progress' || !attachments.length) return null;
    if (attachments.every(attachment => (attachment.progress ?? 0) >= 100)) return null;

    return attachments.length === 1 && attachments[0].file_type !== 'image' ? 'card' : 'message';
};

export type DeliveryStatus = 'sending' | 'failed' | 'sent' | 'delivered' | 'seen';

// Trạng thái hiện dưới tin của khách: agent đọc hội thoại sau lúc tin gửi = Đã xem.
export const deliveryStatusOf = (message: WidgetMessage, agentLastSeenAt = 0): DeliveryStatus => {
    if (message.status === 'in_progress') return 'sending';
    if (message.status === 'failed') return 'failed';
    if (message.status === 'read' || (agentLastSeenAt > 0 && message.created_at <= agentLastSeenAt)) return 'seen';
    return message.status === 'delivered' ? 'delivered' : 'sent';
};

export const getUnreadMessageCount = (messages: WidgetMessage[], userLastSeenAt?: number): number =>
    messages.filter(chat => {
        const isOutGoing = chat.message_type === MESSAGE_TYPE.OUTGOING;
        const hasNotSeen = userLastSeenAt ? chat.created_at * 1000 > userLastSeenAt * 1000 : true;
        return hasNotSeen && isOutGoing;
    }).length;

// getUnreadTextMessages: tối đa 3 tin cuối của agent, đúng bản gốc.
export const getUnreadTextMessages = (messages: WidgetMessage[], userLastSeenAt?: number): WidgetMessage[] => {
    const unreadCount = getUnreadMessageCount(messages, userLastSeenAt);
    const outgoingMessages = messages.filter(message => message.message_type === MESSAGE_TYPE.OUTGOING);
    return outgoingMessages.splice(-Math.min(unreadCount, 3));
};

// endPoints.sendMessage: payload gửi tin của khách (referer_url + timestamp + reply_to).
export const buildSendMessagePayload = ({
    content,
    replyTo = null,
    referrerURL = '',
    customAttributes,
    labels,
    timestamp = new Date().toString(),
}: {
    content: string;
    replyTo?: number | string | null;
    referrerURL?: string;
    customAttributes?: Record<string, unknown>;
    labels?: string[];
    timestamp?: string;
}): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
        message: {
            content,
            reply_to: replyTo,
            timestamp,
            referer_url: referrerURL,
        },
    };
    if (customAttributes && Object.keys(customAttributes).length > 0) {
        payload.custom_attributes = customAttributes;
    }
    if (labels && labels.length > 0) {
        payload.labels = labels;
    }
    return payload;
};

// Nhiều tệp đi trong CÙNG một tin: khoá `message[attachments][]`, chú thích ở
// `message[content]`. Đường một tệp là trường hợp một phần tử của đường này.
export const buildSendAttachmentsFormData = ({
    files,
    caption = '',
    replyTo = null,
    referrerURL = '',
    customAttributes,
    labels,
    timestamp = new Date().toString(),
}: {
    files: (File | string)[];
    caption?: string;
    replyTo?: number | string | null;
    referrerURL?: string;
    customAttributes?: Record<string, unknown>;
    labels?: string[];
    timestamp?: string;
}): FormData => {
    const formData = new FormData();
    files.forEach(file => {
        if (typeof file === 'string') {
            formData.append('message[attachments][]', file);
        } else {
            formData.append('message[attachments][]', file, file.name);
        }
    });
    if (caption) {
        formData.append('message[content]', caption);
    }
    formData.append('message[referer_url]', referrerURL);
    formData.append('message[timestamp]', timestamp);
    if (replyTo !== null && replyTo !== undefined) {
        formData.append('message[reply_to]', String(replyTo));
    }
    if (customAttributes && Object.keys(customAttributes).length > 0) {
        Object.entries(customAttributes).forEach(([key, value]) => {
            formData.append(`custom_attributes[${key}]`, String(value));
        });
    }
    if (labels && labels.length > 0) {
        labels.forEach(label => formData.append('labels[]', label));
    }
    return formData;
};

export const buildSendAttachmentFormData = ({
    file,
    ...rest
}: {
    file: File | string;
    replyTo?: number | string | null;
    referrerURL?: string;
    customAttributes?: Record<string, unknown>;
    labels?: string[];
    timestamp?: string;
}): FormData => buildSendAttachmentsFormData({ files: [file], ...rest });
