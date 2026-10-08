import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { widgetStore } from '../store/widgetStore';
import { WidgetConnector } from './WidgetConnector';

// Echo giả: giữ hàm nhận mọi sự kiện của kênh khách để test bắn sự kiện như Reverb.
let deliverEvent: (eventName: string, data: unknown) => void = () => undefined;

vi.mock('./echo', () => ({
    createWidgetEcho: () => ({
        private: () => ({
            listenToAll: (handler: (eventName: string, data: unknown) => void) => {
                deliverEvent = handler;
            },
        }),
        connector: { pusher: { connection: { state: 'connecting', bind: () => undefined, unbind: () => undefined } } },
        disconnect: () => undefined,
    }),
}));

let connector: WidgetConnector;

beforeEach(async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ id: 3, status: 'open' })));
    await widgetStore.getConversationAttributes();
    vi.restoreAllMocks();
    vi.useFakeTimers();
    connector = new WidgetConnector('pubsub-token');
});

afterEach(() => {
    connector.disconnect();
    widgetStore.toggleAgentTyping('off');
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('conversation.updated', () => {
    it('đúng hội thoại đang mở thì tải lại bản tóm tắt để header thấy nhân viên phụ trách mới', () => {
        const reload = vi.spyOn(widgetStore, 'getConversationAttributes').mockResolvedValue();

        deliverEvent('.conversation.updated', { id: 3, assignee_id: 7 });

        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('hội thoại khác thì bỏ qua', () => {
        const reload = vi.spyOn(widgetStore, 'getConversationAttributes').mockResolvedValue();

        deliverEvent('.conversation.updated', { id: 99 });

        expect(reload).not.toHaveBeenCalled();
    });
});

describe('conversation.typing_on', () => {
    it('giữ định danh, tên và ảnh người đang gõ để bong bóng ba chấm hiện avatar người đó', () => {
        deliverEvent('.conversation.typing_on', {
            conversation: { id: 3 },
            user: { id: 7, type: 'user', name: 'Nguyễn Minh', available_name: 'Minh', avatar_url: 'https://cdn.example/minh.png' },
        });

        expect(widgetStore.getState().uiFlags.isAgentTyping).toBe(true);
        expect(widgetStore.getState().typingAgent).toStrictEqual({
            id: 7,
            type: 'user',
            name: 'Minh',
            avatar_url: 'https://cdn.example/minh.png',
        });
    });

    it('ngừng gõ thì bỏ người đang gõ', () => {
        deliverEvent('.conversation.typing_on', { conversation: { id: 3 }, user: { name: 'Minh' } });
        deliverEvent('.conversation.typing_off', { conversation: { id: 3 } });

        expect(widgetStore.getState().typingAgent).toBeNull();
    });
});
