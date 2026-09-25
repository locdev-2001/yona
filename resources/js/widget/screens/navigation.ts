import { IFrameHelper } from '../helpers/iframe';
import { pushRoute, WIDGET_ROUTES } from '../router';
import { conversationList } from '../store/conversationList';
import { widgetStore } from '../store/widgetStore';
import { SDK_EVENTS } from '../../sdk/constants/sdkEvents';

// Hành động điều hướng dùng chung của các màn (Home, Tin nhắn, Trợ giúp…).

/** Hộp thư bắt điền form trước hội thoại ĐẦU TIÊN (có ít nhất một ô đang bật). */
export function needsPreChatForm(): boolean {
    const { channelConfig } = widgetStore.getState();
    const fields = (channelConfig?.preChatFormOptions?.pre_chat_fields ?? []).filter(field => field.enabled);

    return Boolean(channelConfig?.preChatFormEnabled) && fields.length > 0 && conversationList.getState().items.length === 0;
}

export function openConversationScreen(conversationId: number): void {
    conversationList.markRead(conversationId);
    void widgetStore.openConversation(conversationId);
    pushRoute(WIDGET_ROUTES.MESSAGES);
}

/** "Gửi tin nhắn mới": hội thoại mới trống, tin đầu tiên tạo nó; lần đầu thì qua form trước chat. */
export function startNewConversation(): void {
    IFrameHelper.sendMessage({
        event: 'onEvent',
        eventIdentifier: SDK_EVENTS.ON_START_CONVERSATION,
        data: { hasConversation: conversationList.getState().items.length > 0 },
    });

    if (needsPreChatForm()) {
        pushRoute(WIDGET_ROUTES.PRECHAT_FORM);

        return;
    }

    void widgetStore.openConversation('new');
    pushRoute(WIDGET_ROUTES.MESSAGES);
}
