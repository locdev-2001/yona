import { logoutKeepingPushSubscription } from 'dashboard/helper/logout';
import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';
import BaseActionCableConnector from './BaseActionCableConnector';
import { realtimeStore, typingUserKey } from './store';
import type { RealtimeIdentity, TypingUser } from './types';

// Port từ dashboard/helper/actionCable.js. Không có Vuex nên handler chỉ ghi vào
// realtimeStore (presence/typing) rồi phát lại đúng tên event nghiệp vụ qua emitter —
// page (ConversationContext, notifications…) tự useRealtimeEvent(<event>) xử lý.
// Bỏ voice_call.* / copilot.* / account.enrichment_completed (EE).
const TYPING_TIMEOUT = 30000;

export const FETCH_CONVERSATION_STATS_EVENT = 'fetch_conversation_stats';

export const REALTIME_EVENTS = [
    'chat.message.created',
    'chat.message.updated',
    'chat.updated',
    'chat.read',
    'chat.typing',
    'message.created',
    'message.updated',
    'conversation.created',
    'conversation.status_changed',
    'user:logout',
    'page:reload',
    'assignee.changed',
    'conversation.typing_on',
    'conversation.typing_off',
    'conversation.contact_changed',
    'presence.update',
    'contact.deleted',
    'contact.updated',
    'conversation.mentioned',
    'notification.created',
    'notification.deleted',
    'notification.updated',
    'conversation.read',
    'conversation.updated',
    'conversation.unread_count_changed',
    'account.cache_invalidated',
] as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[number];

interface TypingPayload {
    conversation: { id: number };
    user: TypingUser;
}

interface ChatTypingPayload {
    chat_id: number;
    user: TypingUser;
    typing: boolean;
}

class ActionCableConnector extends BaseActionCableConnector {
    // Một hẹn giờ cho mỗi người gõ: trong nhóm nhiều thành viên gõ cùng lúc trên một hội thoại.
    private cancelTyping: Record<string, ReturnType<typeof setTimeout> | null> = {};

    constructor(identity: RealtimeIdentity) {
        super(identity);
        this.events = {
            'chat.message.created': this.forward('chat.message.created'),
            'chat.message.updated': this.forward('chat.message.updated'),
            'chat.updated': this.forward('chat.updated'),
            'chat.read': this.forward('chat.read'),
            'chat.typing': this.onChatTyping,
            'user:logout': this.onLogout,
            'page:reload': this.onReload,
        };
    }

    onReconnect = () => {
        realtimeStore.setConnected(true);
        emitter.emit(BUS_EVENTS.WEBSOCKET_RECONNECT);
    };

    onDisconnected = () => {
        realtimeStore.setConnected(false);
        emitter.emit(BUS_EVENTS.WEBSOCKET_DISCONNECT);
    };

    onConnected = () => {
        realtimeStore.setConnected(true);
    };

    private forward = (eventName: RealtimeEventName) => (data: unknown) => {
        emitter.emit(eventName, data);
    };


    onLogout = () => logoutKeepingPushSubscription();

    onReload = () => window.location.reload();

    onChatTyping = ({ chat_id: chatId, user, typing }: ChatTypingPayload) => {
        if (typing) {
            this.onTypingOn({ conversation: { id: chatId }, user });
        } else {
            this.onTypingOff({ conversation: { id: chatId }, user });
        }
    };

    onTypingOn = ({ conversation, user }: TypingPayload) => {
        const timerKey = this.typingTimerKey(conversation.id, user);
        this.clearTimer(timerKey);
        realtimeStore.addTyping(conversation.id, user);
        // Tự tắt sau 30s nếu không nhận typing_off.
        this.cancelTyping[timerKey] = setTimeout(() => {
            this.onTypingOff({ conversation, user });
        }, TYPING_TIMEOUT);
    };

    onTypingOff = ({ conversation, user }: Pick<TypingPayload, 'conversation' | 'user'>) => {
        this.clearTimer(this.typingTimerKey(conversation.id, user));
        realtimeStore.removeTyping(conversation.id, user);
    };

    private typingTimerKey = (conversationId: number, user: TypingUser) => `${conversationId}:${typingUserKey(user)}`;

    private clearTimer = (timerKey: string) => {
        const timer = this.cancelTyping[timerKey];
        if (timer) {
            clearTimeout(timer);
            this.cancelTyping[timerKey] = null;
        }
    };

    disconnect() {
        Object.keys(this.cancelTyping).forEach(this.clearTimer);
        super.disconnect();
    }
}

export default ActionCableConnector;
