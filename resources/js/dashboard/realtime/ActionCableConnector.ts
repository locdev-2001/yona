import { logoutKeepingPushSubscription } from 'dashboard/helper/logout';
import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';
import BaseActionCableConnector from './BaseActionCableConnector';
import { realtimeStore, typingUserKey } from './store';
import type { PresenceUpdatePayload, RealtimeIdentity, TypingUser } from './types';

// Port từ dashboard/helper/actionCable.js. Không có Vuex nên handler chỉ ghi vào
// realtimeStore (presence/typing) rồi phát lại đúng tên event nghiệp vụ qua emitter —
// page (ConversationContext, notifications…) tự useRealtimeEvent(<event>) xử lý.
// Bỏ voice_call.* / copilot.* / account.enrichment_completed (EE).
const TYPING_TIMEOUT = 30000;

export const FETCH_CONVERSATION_STATS_EVENT = 'fetch_conversation_stats';

export const REALTIME_EVENTS = [
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
    'voice_room.updated',
    'direct_call.updated',
] as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[number];

interface TypingPayload {
    account_id: number;
    conversation: { id: number };
    user: TypingUser;
}

interface AccountScopedPayload {
    account_id?: number;
}

class ActionCableConnector extends BaseActionCableConnector {
    // Một hẹn giờ cho mỗi người gõ: trong nhóm nhiều thành viên gõ cùng lúc trên một hội thoại.
    private cancelTyping: Record<string, ReturnType<typeof setTimeout> | null> = {};

    constructor(identity: RealtimeIdentity, presenceInterval?: number) {
        super(identity, presenceInterval);
        this.events = {
            'message.created': this.forward('message.created'),
            'message.updated': this.forward('message.updated'),
            'conversation.created': this.forwardThenFetchStats('conversation.created'),
            'conversation.status_changed': this.forwardThenFetchStats('conversation.status_changed'),
            'user:logout': this.onLogout,
            'page:reload': this.onReload,
            'assignee.changed': this.forwardThenFetchStats('assignee.changed'),
            'conversation.typing_on': this.onTypingOn,
            'conversation.typing_off': this.onTypingOff,
            'conversation.contact_changed': this.forward('conversation.contact_changed'),
            'presence.update': this.onPresenceUpdate,
            'contact.deleted': this.forwardThenFetchStats('contact.deleted'),
            'contact.updated': this.forward('contact.updated'),
            'conversation.mentioned': this.forward('conversation.mentioned'),
            'notification.created': this.forward('notification.created'),
            'notification.deleted': this.forward('notification.deleted'),
            'notification.updated': this.forward('notification.updated'),
            'conversation.read': this.forward('conversation.read'),
            'conversation.updated': this.forwardThenFetchStats('conversation.updated'),
            'conversation.unread_count_changed': this.forward('conversation.unread_count_changed'),
            'account.cache_invalidated': this.forward('account.cache_invalidated'),
            'voice_room.updated': this.forward('voice_room.updated'),
            'direct_call.updated': this.forward('direct_call.updated'),
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

    isAValidEvent = (data: unknown): boolean =>
        (data as AccountScopedPayload | null)?.account_id === this.identity.accountId;

    private forward = (eventName: RealtimeEventName) => (data: unknown) => {
        emitter.emit(eventName, data);
    };

    private forwardThenFetchStats = (eventName: RealtimeEventName) => (data: unknown) => {
        emitter.emit(eventName, data);
        this.fetchConversationStats();
    };

    fetchConversationStats = () => {
        emitter.emit(FETCH_CONVERSATION_STATS_EVENT);
    };

    onLogout = () => logoutKeepingPushSubscription();

    onReload = () => window.location.reload();

    onPresenceUpdate = (data: PresenceUpdatePayload) => {
        realtimeStore.updateContactsPresence(data.contacts);
        realtimeStore.updateAgentsPresence(data.users);
        realtimeStore.applyCurrentUserAvailability(data.users, this.identity.userId);
        emitter.emit('presence.update', data);
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
