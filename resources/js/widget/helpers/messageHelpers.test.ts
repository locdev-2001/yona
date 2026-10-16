import { describe, expect, it } from 'vitest';

import { MESSAGE_TYPE } from './constants';
import {
    messageHtml,
    buildSendAttachmentFormData,
    buildSendAttachmentsFormData,
    buildSendMessagePayload,
    canRecallMessage,
    createTemporaryMessage,
    deliveryStatusOf,
    findUndeliveredMessage,
    getUnreadMessageCount,
    getUnreadTextMessages,
    groupMessagesByDate,
    isDeletedMessage,
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

describe('isDeletedMessage', () => {
    it('nhận ra tin đã thu hồi để vẽ bong bóng nét đứt thay vì bỏ khỏi danh sách', () => {
        expect(isDeletedMessage(message({ content_attributes: { deleted: true } }))).toBe(true);
        expect(isDeletedMessage(message({ content_attributes: {} }))).toBe(false);
        expect(isDeletedMessage(message({}))).toBe(false);
    });
});

describe('canRecallMessage', () => {
    const now = 1758000000;
    const own = (overrides: Partial<WidgetMessage> = {}) =>
        message({ id: 10, message_type: MESSAGE_TYPE.INCOMING, status: 'sent', created_at: now - 60, ...overrides });

    it('cho thu hồi tin của khách còn trong hạn của kênh', () => {
        expect(canRecallMessage(own(), 300, now)).toBe(true);
    });

    it('không cho khi quá hạn hoặc kênh không cho thu hồi (hạn 0)', () => {
        expect(canRecallMessage(own({ created_at: now - 300 }), 300, now)).toBe(false);
        expect(canRecallMessage(own(), 0, now)).toBe(false);
    });

    it('không cho với tin agent, tin đã thu hồi, tin đang gửi hoặc gửi hỏng', () => {
        expect(canRecallMessage(own({ message_type: MESSAGE_TYPE.OUTGOING }), 300, now)).toBe(false);
        expect(canRecallMessage(own({ content_attributes: { deleted: true } }), 300, now)).toBe(false);
        expect(canRecallMessage(own({ id: 'tam-uuid', status: 'in_progress' }), 300, now)).toBe(false);
        expect(canRecallMessage(own({ status: 'failed' }), 300, now)).toBe(false);
    });
});

describe('groupMessagesByDate', () => {
    const agent = { id: 5, name: 'John' };

    it('chia theo ngày, trong ngày gom tin liên tiếp cùng người gửi dưới 2 phút', () => {
        // 1758000000 = 16/09/2025, 1758100000 = 17/09/2025 (giờ UTC).
        const days = groupMessagesByDate([
            message({ id: 1, created_at: 1758000000, message_type: MESSAGE_TYPE.OUTGOING, sender: agent }),
            message({ id: 2, created_at: 1758000030, message_type: MESSAGE_TYPE.OUTGOING, sender: agent }),
            message({ id: 3, created_at: 1758000040, message_type: MESSAGE_TYPE.INCOMING }),
            message({ id: 4, created_at: 1758000400, message_type: MESSAGE_TYPE.INCOMING }),
            message({ id: 5, created_at: 1758100000, message_type: MESSAGE_TYPE.INCOMING }),
        ]);

        expect(days).toHaveLength(2);
        expect(days[0].groups.map(group => group.map(item => item.message.id))).toStrictEqual([[1, 2], [3], [4]]);
        expect(days[1].groups.map(group => group.map(item => item.message.id))).toStrictEqual([[5]]);
    });

    it('tin có khung riêng (carousel, khảo sát, biểu mẫu đã gửi) luôn đứng riêng', () => {
        const days = groupMessagesByDate([
            message({ id: 1, created_at: 1758000000, message_type: MESSAGE_TYPE.OUTGOING, sender: agent }),
            message({
                id: 2,
                created_at: 1758000010,
                message_type: MESSAGE_TYPE.OUTGOING,
                sender: agent,
                content_type: 'cards',
            }),
            message({ id: 3, created_at: 1758000020, message_type: MESSAGE_TYPE.OUTGOING, sender: agent }),
        ]);

        expect(days[0].groups.map(group => group.map(item => item.message.id))).toStrictEqual([[1], [2], [3]]);
    });

    it('hai agent khác nhau không chung nhóm', () => {
        const days = groupMessagesByDate([
            message({ id: 1, created_at: 1758000000, message_type: MESSAGE_TYPE.OUTGOING, sender: agent }),
            message({ id: 2, created_at: 1758000010, message_type: MESSAGE_TYPE.OUTGOING, sender: { id: 6, name: 'An' } }),
        ]);

        expect(days[0].groups).toHaveLength(2);
    });

    it('nhân viên và AI trùng id nhưng khác kiểu người gửi không chung nhóm', () => {
        const days = groupMessagesByDate([
            message({ id: 1, created_at: 1758000000, message_type: MESSAGE_TYPE.OUTGOING, sender: { id: 1, name: 'Linh', type: 'ai_agent' } }),
            message({ id: 2, created_at: 1758000054, message_type: MESSAGE_TYPE.OUTGOING, sender: { id: 1, name: 'John', type: 'user' } }),
            message({ id: 3, created_at: 1758000060, message_type: MESSAGE_TYPE.OUTGOING, sender: { id: 1, name: 'John', type: 'user' } }),
        ]);

        expect(days[0].groups.map(group => group.map(item => item.message.id))).toStrictEqual([[1], [2, 3]]);
    });

    it('tin không có người gửi vẫn gộp với tin kề cùng chiều', () => {
        const days = groupMessagesByDate([
            message({ id: 1, created_at: 1758000000, message_type: MESSAGE_TYPE.OUTGOING }),
            message({ id: 2, created_at: 1758000010, message_type: MESSAGE_TYPE.OUTGOING }),
        ]);

        expect(days[0].groups.map(group => group.map(item => item.message.id))).toStrictEqual([[1, 2]]);
    });

    it('mỗi tin mang vị trí trong nhóm theo luật dùng chung', () => {
        const days = groupMessagesByDate([
            message({ id: 1, created_at: 1758000000, message_type: MESSAGE_TYPE.OUTGOING, sender: agent }),
            message({ id: 2, created_at: 1758000030, message_type: MESSAGE_TYPE.OUTGOING, sender: agent }),
            message({ id: 3, created_at: 1758000060, message_type: MESSAGE_TYPE.OUTGOING, sender: agent }),
            message({ id: 4, created_at: 1758000070, message_type: MESSAGE_TYPE.INCOMING }),
        ]);

        expect(days[0].groups.map(group => group.map(item => item.position))).toStrictEqual([
            ['first', 'middle', 'last'],
            ['single'],
        ]);
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

describe('buildSendAttachmentsFormData', () => {
    it('nhiều tệp trong một tin kèm chú thích và tin được trả lời', () => {
        const first = new File(['1'], 'a.png', { type: 'image/png' });
        const second = new File(['2'], 'b.jpg', { type: 'image/jpeg' });
        const formData = buildSendAttachmentsFormData({ files: [first, second], caption: 'Hai mẫu', replyTo: 9 });

        expect((formData.getAll('message[attachments][]') as File[]).map(file => file.name)).toStrictEqual([
            'a.png',
            'b.jpg',
        ]);
        expect(formData.get('message[content]')).toBe('Hai mẫu');
        expect(formData.get('message[reply_to]')).toBe('9');
    });

    it('đường một tệp cho ra đúng payload của mảng một phần tử', () => {
        const file = new File(['1'], 'a.png', { type: 'image/png' });
        const params = { replyTo: 3, referrerURL: 'https://khach.vn', timestamp: 'Tue Sep 16 2025' };
        const single = buildSendAttachmentFormData({ file, ...params });
        const many = buildSendAttachmentsFormData({ files: [file], ...params });

        expect([...single.entries()]).toStrictEqual([...many.entries()]);
        expect(single.get('message[content]')).toBeNull();
    });
});

describe('deliveryStatusOf', () => {
    const sent = message({ id: 1, status: 'sent', created_at: 1758000000 });

    it('Đã xem khi agent đọc hội thoại sau lúc tin gửi', () => {
        expect(deliveryStatusOf(sent, 1758000100)).toBe('seen');
        expect(deliveryStatusOf(sent, 1757999999)).toBe('sent');
        expect(deliveryStatusOf(sent, 0)).toBe('sent');
    });

    it('giữ trạng thái đang gửi, gửi hỏng và trạng thái kênh báo về', () => {
        expect(deliveryStatusOf(message({ status: 'in_progress' }), 1758000100)).toBe('sending');
        expect(deliveryStatusOf(message({ status: 'failed' }), 1758000100)).toBe('failed');
        expect(deliveryStatusOf(message({ status: 'delivered', created_at: 1758000000 }))).toBe('delivered');
        expect(deliveryStatusOf(message({ status: 'read' }))).toBe('seen');
    });
});

describe('messageHtml', () => {
    it('biến URL trần thành link mở tab mới, không điều hướng trong iframe widget', () => {
        const container = document.createElement('div');
        container.innerHTML = messageHtml('Đăng ký tại https://yona.vn/app/auth/signup nhé');
        const link = container.querySelector('a');

        expect(link?.getAttribute('href')).toBe('https://yona.vn/app/auth/signup');
        expect(link?.getAttribute('target')).toBe('_blank');
        expect(link?.getAttribute('rel')).toContain('noopener');
    });

    it('không để lọt script hay link javascript:', () => {
        const container = document.createElement('div');
        container.innerHTML = messageHtml('<script>alert(1)</script> [bấm](javascript:alert(1))');

        expect(container.querySelector('script')).toBeNull();
        expect([...container.querySelectorAll('a')].some(a => a.getAttribute('href')?.startsWith('javascript:'))).toBe(false);
    });
});
