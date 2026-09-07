import { beforeEach, describe, expect, it } from 'vitest';

import { showMessagesWhenConversationExists } from './App';
import { widgetStore } from './store/widgetStore';
import type { WidgetMessage } from './types';

const anyMessage = { id: 1, content: 'hello', message_type: 0, created_at: 1 } as unknown as WidgetMessage;

const goHome = () => {
    window.location.hash = '#/';
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

        expect(window.location.hash).toBe('#/messages');
    });

    it('stays on the home view while the widget is closed', () => {
        widgetStore.addOrUpdateMessage(anyMessage);

        showMessagesWhenConversationExists();

        expect(window.location.hash).toBe('#/');
    });

    it('stays on the home view when the visitor has no message yet', () => {
        widgetStore.patchAppConfig({ isWidgetOpen: true });

        showMessagesWhenConversationExists();

        expect(window.location.hash).toBe('#/');
    });

    it('leaves a view other than home untouched', () => {
        widgetStore.patchAppConfig({ isWidgetOpen: true });
        widgetStore.addOrUpdateMessage(anyMessage);
        window.location.hash = '#/prechat-form';

        showMessagesWhenConversationExists();

        expect(window.location.hash).toBe('#/prechat-form');
    });
});
