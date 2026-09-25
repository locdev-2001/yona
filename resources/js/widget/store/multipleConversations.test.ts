import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MESSAGE_TYPE } from '../helpers/constants';
import type { WidgetMessage } from '../types';

// Nhiều hội thoại: hội thoại đang mở khai ở api/client, mọi request mang
// `conversation_id`; hội thoại mới tự khoá vào id server tạo ra sau tin đầu.

const apiMock = vi.hoisted(() => ({
    sendMessage: vi.fn(),
    fetchMessages: vi.fn(),
    fetchConversationAttributes: vi.fn(),
    fetchConversationList: vi.fn(),
}));

vi.mock('../api/widget', () => ({
    onConfigLoaded: () => () => undefined,
    sendMessage: apiMock.sendMessage,
    fetchMessages: apiMock.fetchMessages,
    fetchConversationAttributes: apiMock.fetchConversationAttributes,
    fetchConversationList: apiMock.fetchConversationList,
}));

const { buildSearch, getActiveConversation, setActiveConversation } = await import('../api/client');
const { widgetStore } = await import('./widgetStore');
const { conversationList } = await import('./conversationList');

const message = (overrides: Partial<WidgetMessage> = {}): WidgetMessage =>
    ({ id: 1, content: 'Dạ còn 2 cái ạ', message_type: MESSAGE_TYPE.OUTGOING, created_at: 100, conversation_id: 7, ...overrides }) as WidgetMessage;

beforeEach(() => {
    setActiveConversation(null);
    widgetStore.clearConversations();
    widgetStore.clearConversationAttributes();
    conversationList.reset();
    apiMock.fetchMessages.mockReset().mockResolvedValue({ payload: [message()], meta: {} });
    apiMock.fetchConversationAttributes.mockReset().mockResolvedValue({ id: 7, status: 'open' });
    apiMock.sendMessage.mockReset();
    apiMock.fetchConversationList.mockReset();
});

describe('conversation_id trên request', () => {
    it('chưa chọn hội thoại thì không gửi (server dùng hội thoại mới nhất)', () => {
        expect(buildSearch()).not.toContain('conversation_id');
    });

    it('đã chọn thì mọi request mang đúng id', () => {
        setActiveConversation(7);

        expect(buildSearch()).toContain('conversation_id=7');
    });

    it('lần đầu đọc hội thoại thì khoá vào id server trả về', async () => {
        await widgetStore.getConversationAttributes();

        expect(getActiveConversation()).toBe(7);
    });
});

describe('openConversation', () => {
    it('đổi hẳn khung chat sang hội thoại được chọn', async () => {
        widgetStore.addOrUpdateMessage(message({ id: 99, conversation_id: 3 }));

        await widgetStore.openConversation(7);

        expect(getActiveConversation()).toBe(7);
        expect(Object.keys(widgetStore.getState().conversations)).toEqual(['1']);
        expect(widgetStore.getState().conversationAttributes.id).toBe(7);
    });

    it('hội thoại mới: khung chat trống, tin đầu tạo hội thoại và khoá vào id đó', async () => {
        widgetStore.addOrUpdateMessage(message({ id: 99 }));
        await widgetStore.openConversation('new');

        expect(Object.keys(widgetStore.getState().conversations)).toEqual([]);
        expect(buildSearch()).toContain('conversation_id=new');

        apiMock.sendMessage.mockResolvedValueOnce(message({ id: 200, message_type: MESSAGE_TYPE.INCOMING, content: 'chuyện khác', conversation_id: 12 }));
        apiMock.fetchConversationAttributes.mockResolvedValueOnce({ id: 12, status: 'open' });
        await widgetStore.sendMessage({ content: 'chuyện khác' });

        expect(getActiveConversation()).toBe(12);
        expect(buildSearch()).toContain('conversation_id=12');
    });
});

describe('danh sách hội thoại', () => {
    const item = (id: number, activity: number, unread = 0) => ({
        id,
        status: 'open',
        unread_count: unread,
        last_activity_at: activity,
        last_message: { id: id * 10, preview: `tin ${id}`, message_type: MESSAGE_TYPE.OUTGOING, created_at: activity },
    });

    it('tin mới ở hội thoại đang đóng: lên đầu danh sách và tăng số chưa đọc', async () => {
        apiMock.fetchConversationList.mockResolvedValueOnce({ payload: [item(1, 200), item(2, 100)], meta: { has_more: false } });
        await conversationList.load();

        conversationList.applyMessage(message({ id: 5, conversation_id: 2, created_at: 300, content: 'Phí ship 30.000đ' }), { isOpen: false });

        const [first] = conversationList.getState().items;
        expect(first.id).toBe(2);
        expect(first.unread_count).toBe(1);
        expect(first.last_message?.preview).toBe('Phí ship 30.000đ');
        expect(conversationList.unreadTotal()).toBe(1);
    });

    it('tin của chính khách không tính là chưa đọc; mở hội thoại thì về 0', async () => {
        apiMock.fetchConversationList.mockResolvedValueOnce({ payload: [item(1, 200, 2)], meta: { has_more: false } });
        await conversationList.load();

        conversationList.applyMessage(message({ conversation_id: 1, message_type: MESSAGE_TYPE.INCOMING, created_at: 300 }), { isOpen: false });
        expect(conversationList.getState().items[0].unread_count).toBe(2);

        conversationList.markRead(1);
        expect(conversationList.unreadTotal()).toBe(0);
    });

    it('tải trang sau không lặp hội thoại đã có', async () => {
        apiMock.fetchConversationList
            .mockResolvedValueOnce({ payload: [item(1, 200)], meta: { has_more: true } })
            .mockResolvedValueOnce({ payload: [item(1, 200), item(2, 100)], meta: { has_more: false } });

        await conversationList.load();
        await conversationList.load({ more: true });

        expect(conversationList.getState().items.map(entry => entry.id)).toEqual([1, 2]);
        expect(conversationList.getState().hasMore).toBe(false);
    });
});
