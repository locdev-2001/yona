import { format, fromUnixTime } from 'date-fns';

import { MESSAGE_TYPE } from './constants';
import { getUuid, groupBy } from './utils';
import type { GroupedMessages, MessageAttachment, WidgetMessage } from '../types';

// Port từ widget/store/modules/conversation/helpers.js + getters.js (phần thuần)
// và shared/helpers/DateHelper.js#formatUnixDate.

export const formatUnixDate = (date: number, dateFormat = 'MMM dd, yyyy'): string =>
    format(fromUnixTime(date), dateFormat);

// shared/helpers/MessageTypeHelper.js
export const isASubmittedFormMessage = (message: Pick<WidgetMessage, 'content_type' | 'content_attributes'>): boolean =>
    message?.content_type === 'form' && Boolean(message?.content_attributes?.submitted_values);

export const createTemporaryMessage = ({
    attachments,
    content,
    replyTo,
}: {
    attachments?: MessageAttachment[];
    content?: string;
    replyTo?: number | string | null;
}): WidgetMessage => ({
    id: getUuid(),
    content,
    attachments,
    status: 'in_progress',
    replyTo,
    created_at: new Date().getTime() / 1000,
    message_type: MESSAGE_TYPE.INCOMING,
});

const getSenderName = (message: WidgetMessage) => (message.sender ? message.sender.name : '');

const shouldShowAvatar = (message: WidgetMessage, nextMessage: WidgetMessage) =>
    getSenderName(message) !== getSenderName(nextMessage) ||
    message.message_type !== nextMessage.message_type ||
    isASubmittedFormMessage(nextMessage);

export const groupConversationBySender = (conversationsForADate: WidgetMessage[]): WidgetMessage[] =>
    conversationsForADate.map((message, index) => {
        const isLastMessage = index === conversationsForADate.length - 1;
        let showAvatar: boolean;
        if (isASubmittedFormMessage(message)) {
            showAvatar = false;
        } else if (isLastMessage) {
            showAvatar = true;
        } else {
            showAvatar = shouldShowAvatar(message, conversationsForADate[index + 1]);
        }
        return { showAvatar, ...message };
    });

export const groupMessagesByDate = (messages: WidgetMessage[]): GroupedMessages[] => {
    const messagesGroupedByDate = groupBy(messages, message => formatUnixDate(message.created_at));
    return Object.keys(messagesGroupedByDate).map(date => ({
        date,
        messages: groupConversationBySender(messagesGroupedByDate[date]),
    }));
};

export const findUndeliveredMessage = (
    messageInbox: Record<string, WidgetMessage>,
    { content }: Pick<WidgetMessage, 'content'>,
): WidgetMessage[] =>
    Object.values(messageInbox).filter(message => message.content === content && message.status === 'in_progress');

export const getNonDeletedMessages = ({ messages }: { messages: WidgetMessage[] }): WidgetMessage[] =>
    messages.filter(item => !(item.content_attributes && item.content_attributes.deleted));

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

// endPoints.sendAttachment: multipart, khóa `message[attachments][]` như bản gốc.
export const buildSendAttachmentFormData = ({
    file,
    replyTo = null,
    referrerURL = '',
    customAttributes,
    labels,
    timestamp = new Date().toString(),
}: {
    file: File | string;
    replyTo?: number | string | null;
    referrerURL?: string;
    customAttributes?: Record<string, unknown>;
    labels?: string[];
    timestamp?: string;
}): FormData => {
    const formData = new FormData();
    if (typeof file === 'string') {
        formData.append('message[attachments][]', file);
    } else {
        formData.append('message[attachments][]', file, file.name);
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
