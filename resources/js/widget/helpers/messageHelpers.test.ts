import { describe, expect, it } from 'vitest';

import { MESSAGE_TYPE } from './constants';
import {
    buildSendAttachmentFormData,
    buildSendMessagePayload,
    createTemporaryMessage,
    findUndeliveredMessage,
    getNonDeletedMessages,
    getUnreadMessageCount,
    getUnreadTextMessages,
    groupConversationBySender,
    groupMessagesByDate,
} from './messageHelpers';
import type { WidgetMessage } from '../types';

// Port từ widget/store/modules/specs/conversation/helpers.spec.js + getters.spec.js
// + api/specs/endPoints.spec.js.

const message = (overrides: Partial<WidgetMessage>): WidgetMessage => ({
    id: 1,
    content: 'Hello',
    message_type: MESSAGE_TYPE.INCOMING,
    created_at: 1758000000,
    ...overrides,
});

describe('findUndeliveredMessage', () => {
    it('trả tin đang gửi dở có cùng nội dung', () => {
        const conversation = {
            1: message({ id: 1, content: 'Hello', status: 'in_progress' }),
            2: message({ id: 2, content: 'Hello', status: 'sent' }),
            3: message({ id: 3, content: 'How may I help you', status: 'sent' }),
        };

        expect(findUndeliveredMessage(conversation, { content: 'Hello' })).toStrictEqual([conversation[1]]);
    });
});

describe('createTemporaryMessage', () => {
    it('dựng tin tạm trạng thái in_progress', () => {
        const temporary = createTemporaryMessage({ content: 'hello' });

        expect(temporary.content).toBe('hello');
        expect(temporary.status).toBe('in_progress');
        expect(temporary.message_type).toBe(MESSAGE_TYPE.INCOMING);
    });

    it('giữ replyTo khi trả lời một tin', () => {
        const temporary = createTemporaryMessage({ content: 'hello', replyTo: 124 });

        expect(temporary.replyTo).toBe(124);
    });
});

describe('getNonDeletedMessages', () => {
    it('bỏ tin đã xoá', () => {
        const messages = [
            message({ id: 1, content_attributes: {} }),
            message({ id: 2, content_attributes: { deleted: true } }),
            message({ id: 3, content_attributes: {} }),
        ];

        expect(getNonDeletedMessages({ messages }).map(item => item.id)).toStrictEqual([1, 3]);
    });
});

describe('groupConversationBySender', () => {
    it('chỉ hiện avatar ở tin cuối của mỗi người gửi', () => {
        const grouped = groupConversationBySender([
            message({ id: 1, message_type: MESSAGE_TYPE.OUTGOING, sender: { name: 'John' } }),
            message({ id: 2, message_type: MESSAGE_TYPE.OUTGOING, sender: { name: 'John' } }),
            message({ id: 3, message_type: MESSAGE_TYPE.INCOMING }),
        ]);

        expect(grouped.map(item => item.showAvatar)).toStrictEqual([false, true, true]);
    });

    it('không hiện avatar cho tin form đã gửi', () => {
        const grouped = groupConversationBySender([
            message({
                id: 1,
                message_type: MESSAGE_TYPE.TEMPLATE,
                content_type: 'form',
                content_attributes: { submitted_values: [{ name: 'email', value: 'a@b.c' }] },
            }),
        ]);

        expect(grouped[0].showAvatar).toBe(false);
    });
});

describe('groupMessagesByDate', () => {
    it('gom tin theo ngày và đánh dấu avatar trong từng ngày', () => {
        // 1758000000 = 16/09/2025, 1758100000 = 17/09/2025 (giờ UTC).
        const groups = groupMessagesByDate([
            message({ id: 1, created_at: 1758000000, message_type: MESSAGE_TYPE.OUTGOING, sender: { name: 'John' } }),
            message({ id: 2, created_at: 1758100000, message_type: MESSAGE_TYPE.INCOMING }),
        ]);

        expect(groups).toHaveLength(2);
        expect(groups[0].messages).toHaveLength(1);
        expect(groups[1].messages).toHaveLength(1);
        expect(groups.every(group => group.messages.every(item => item.showAvatar))).toBe(true);
    });
});

describe('getUnreadMessageCount', () => {
    const messages = [
        message({ id: 1, message_type: MESSAGE_TYPE.INCOMING, created_at: 1758000000 }),
        message({ id: 2, message_type: MESSAGE_TYPE.OUTGOING, created_at: 1758000100 }),
        message({ id: 3, message_type: MESSAGE_TYPE.OUTGOING, created_at: 1758000200 }),
    ];

    it('chỉ đếm tin của agent sau mốc đã xem', () => {
        expect(getUnreadMessageCount(messages, 1758000150)).toBe(1);
    });

    it('chưa xem lần nào thì tính hết tin của agent', () => {
        expect(getUnreadMessageCount(messages, undefined)).toBe(2);
    });

    it('getUnreadTextMessages lấy tối đa 3 tin cuối', () => {
        const many = Array.from({ length: 5 }, (_, index) =>
            message({ id: index + 1, message_type: MESSAGE_TYPE.OUTGOING, created_at: 1758000000 + index }),
        );

        expect(getUnreadTextMessages(many, undefined).map(item => item.id)).toStrictEqual([3, 4, 5]);
    });
});

describe('buildSendMessagePayload', () => {
    it('dựng payload tin nhắn với referer_url và reply_to', () => {
        const payload = buildSendMessagePayload({
            content: 'Xin chào',
            replyTo: 42,
            referrerURL: 'https://khach.vn/trang',
            timestamp: 'Tue Sep 16 2025',
        });

        expect(payload).toStrictEqual({
            message: {
                content: 'Xin chào',
                reply_to: 42,
                timestamp: 'Tue Sep 16 2025',
                referer_url: 'https://khach.vn/trang',
            },
        });
    });

    it('chỉ đính custom_attributes và labels khi có dữ liệu', () => {
        const withMetadata = buildSendMessagePayload({
            content: 'Xin chào',
            customAttributes: { plan: 'pro' },
            labels: ['sales'],
        });
        const withoutMetadata = buildSendMessagePayload({ content: 'Xin chào', customAttributes: {}, labels: [] });

        expect(withMetadata.custom_attributes).toStrictEqual({ plan: 'pro' });
        expect(withMetadata.labels).toStrictEqual(['sales']);
        expect(withoutMetadata).not.toHaveProperty('custom_attributes');
        expect(withoutMetadata).not.toHaveProperty('labels');
    });
});

describe('buildSendAttachmentFormData', () => {
    it('đặt tệp vào khóa message[attachments][] cùng referer_url', () => {
        const file = new File(['noi dung'], 'anh.png', { type: 'image/png' });
        const formData = buildSendAttachmentFormData({
            file,
            replyTo: 7,
            referrerURL: 'https://khach.vn',
            labels: ['sales'],
            customAttributes: { plan: 'pro' },
            timestamp: 'Tue Sep 16 2025',
        });

        expect((formData.get('message[attachments][]') as File).name).toBe('anh.png');
        expect(formData.get('message[referer_url]')).toBe('https://khach.vn');
        expect(formData.get('message[timestamp]')).toBe('Tue Sep 16 2025');
        expect(formData.get('message[reply_to]')).toBe('7');
        expect(formData.get('labels[]')).toBe('sales');
        expect(formData.get('custom_attributes[plan]')).toBe('pro');
    });

    it('nhận signed_id dạng chuỗi (tệp đã tải trước)', () => {
        const formData = buildSendAttachmentFormData({ file: 'signed-id-123' });

        expect(formData.get('message[attachments][]')).toBe('signed-id-123');
        expect(formData.get('message[reply_to]')).toBeNull();
    });
});
