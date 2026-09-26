import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { currentRoute, replaceRoute } from './router';

import App, { showMessagesWhenConversationExists } from './App';
import { IFrameHelper } from './helpers/iframe';
import { widgetStore } from './store/widgetStore';
import { decodeFrameMessage, encodeFrameMessage } from '../sdk/constants/frameEvents';
import type { ChannelConfig, WidgetContact, WidgetMessage } from './types';

const anyMessage = { id: 1, content: 'hello', message_type: 0, created_at: 1 } as unknown as WidgetMessage;

const goHome = () => {
    replaceRoute('home');
};

// App.vue#toggle-open: mở widget ở màn hình chủ mà đã có hội thoại thì vào thẳng
// khung chat. Ở bản này danh sách tin về SAU sự kiện `toggle-open`, nên luật còn
// phải chạy lại lúc tải xong — nếu không, tải lại trang là kẹt ở màn hình chủ và
// khách không thấy bong bóng khảo sát của hội thoại đã đóng.
describe('showMessagesWhenConversationExists', () => {
    beforeEach(() => {
        widgetStore.clearConversations();
        widgetStore.patchAppConfig({ isWidgetOpen: false });
        goHome();
    });

    it('opens the chat view when the widget is open and the history has arrived', () => {
        widgetStore.patchAppConfig({ isWidgetOpen: true });
        widgetStore.addOrUpdateMessage(anyMessage);

        showMessagesWhenConversationExists();

        expect(currentRoute()).toBe('messages');
    });

    it('stays on the home view while the widget is closed', () => {
        widgetStore.addOrUpdateMessage(anyMessage);

        showMessagesWhenConversationExists();

        expect(currentRoute()).toBe('home');
    });

    it('stays on the home view when the visitor has no message yet', () => {
        widgetStore.patchAppConfig({ isWidgetOpen: true });

        showMessagesWhenConversationExists();

        expect(currentRoute()).toBe('home');
    });

    it('leaves a view other than home untouched', () => {
        widgetStore.patchAppConfig({ isWidgetOpen: true });
        widgetStore.addOrUpdateMessage(anyMessage);
        replaceRoute('prechat-form');

        showMessagesWhenConversationExists();

        expect(currentRoute()).toBe('prechat-form');
    });
});

// Launcher do SDK vẽ trên trang khách không tự giữ chữ: iframe gửi nhãn theo ngôn ngữ widget.
describe('nhãn launcher gửi cho SDK', () => {
    const messagesToParent: Record<string, unknown>[] = [];

    beforeEach(() => {
        messagesToParent.length = 0;
        vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(true);
        vi.spyOn(window.parent, 'postMessage').mockImplementation((message: unknown) => {
            const decoded = decodeFrameMessage(message);
            if (decoded) messagesToParent.push(decoded);
        });
        vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ payload: [] })));
        widgetStore.clearConversations();
        widgetStore.setChannelConfig(
            { websiteName: 'Yona', websiteToken: 'website-token', enabledFeatures: [], workingHours: [] } as unknown as ChannelConfig,
            {},
            {} as WidgetContact,
        );
    });

    afterEach(() => vi.restoreAllMocks());

    const sentEvents = (eventName: string) => messagesToParent.filter(message => message.event === eventName);

    it('tin loaded đã mang nhãn mở/đóng để SDK gắn ngay lúc dựng bong bóng', () => {
        render(<App />);

        const [loaded] = sentEvents('loaded');
        expect((loaded.config as { launcherLabels: unknown }).launcherLabels).toStrictEqual({
            label: 'Chat with us',
            openLabel: 'Open chat',
            closeLabel: 'Minimize chat',
        });
    });

    it('SDK gửi config-set thì iframe gửi lại setBubbleLabel kèm nhãn mở và đóng', () => {
        render(<App />);
        messagesToParent.length = 0;

        act(() => {
            window.dispatchEvent(
                new MessageEvent('message', { data: encodeFrameMessage({ event: 'config-set' }), source: window.parent }),
            );
        });

        const [labels] = sentEvents('setBubbleLabel');
        expect(labels).toMatchObject({ openLabel: 'Open chat', closeLabel: 'Minimize chat' });
    });
});
