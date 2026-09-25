import type Echo from 'laravel-echo';

import { apiPost, buildSearch } from '../api/client';
import { IFrameHelper, shouldTriggerMessageUpdateEvent } from '../helpers/iframe';
import { notifyAgentMessageReceived, widgetStore } from '../store/widgetStore';
import { createWidgetEcho } from './echo';
import { SDK_EVENTS } from '../../sdk/constants/sdkEvents';
import type { ConversationAttributes, WidgetMessage } from '../types';

// Port từ widget/helpers/actionCable.js + shared/helpers/BaseActionCableConnector.js.
// Khác bản gốc (đúng như B4 đã chốt cho dashboard): ActionCable → Echo/Reverb,
// perform('update_presence') → POST /api/v1/widget/presence.
const WIDGET_PRESENCE_INTERVAL = 60000;
const RECONNECT_INTERVAL = 1000;
const PUSHER_CONNECTED_STATE = 'connected';
const PUSHER_LOST_STATES = ['unavailable', 'disconnected', 'failed'];

interface PusherConnection {
    state: string;
    bind(event: string, handler: (change?: { previous: string; current: string }) => void): void;
    unbind(event: string, handler?: (change?: { previous: string; current: string }) => void): void;
}

// listenToAll trả tên có tiền tố "." cho event ngoài namespace (`.message.created`).
export const normalizeEchoEventName = (eventName: string): string =>
    eventName.startsWith('.') ? eventName.slice(1) : eventName;

export class WidgetConnector {
    private echo: Echo<'reverb'>;
    private pubsubToken: string;
    private events: Record<string, (data: never) => void>;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private presenceTimer: ReturnType<typeof setTimeout> | null = null;
    private hasBeenConnected = false;
    private isDisconnected = false;

    constructor(pubsubToken: string) {
        this.pubsubToken = pubsubToken;
        this.echo = createWidgetEcho();
        this.events = {
            'message.created': this.onMessageCreated as (data: never) => void,
            'message.updated': this.onMessageUpdated as (data: never) => void,
            'conversation.typing_on': this.onTypingOn as (data: never) => void,
            'conversation.typing_off': this.onTypingOff as (data: never) => void,
            'conversation.status_changed': this.onStatusChange as (data: never) => void,
            'conversation.updated': this.onConversationUpdated as (data: never) => void,
            'conversation.created': this.onConversationCreated as (data: never) => void,
            'presence.update': this.onPresenceUpdate as (data: never) => void,
            'contact.merged': this.onContactMerge as (data: never) => void,
        };

        this.echo.private(pubsubToken).listenToAll((eventName: string, data: unknown) => {
            const handler = this.events[normalizeEchoEventName(eventName)];
            if (typeof handler === 'function') handler(data as never);
        });

        this.connection.bind('state_change', this.onConnectionStateChange);
        this.triggerPresenceInterval();
    }

    private get connection(): PusherConnection {
        return this.echo.connector.pusher.connection as unknown as PusherConnection;
    }

    private onConnectionStateChange = (change?: { previous: string; current: string }) => {
        const current = change?.current ?? this.connection.state;
        if (current === PUSHER_CONNECTED_STATE) {
            if (!this.hasBeenConnected) {
                this.hasBeenConnected = true;
                void this.updatePresence();
            }
            return;
        }
        if (this.hasBeenConnected && PUSHER_LOST_STATES.includes(current)) {
            this.isDisconnected = true;
            widgetStore.setLastMessageId();
            this.initReconnectTimer();
        }
    };

    private updatePresence = async (): Promise<void> => {
        try {
            await apiPost(`/api/v1/widget/presence${buildSearch()}`);
        } catch {
            // Heartbeat lỗi — lần sau thử lại, giống perform() gốc không await.
        }
    };

    private triggerPresenceInterval = () => {
        this.presenceTimer = setTimeout(() => {
            void this.updatePresence();
            this.triggerPresenceInterval();
        }, WIDGET_PRESENCE_INTERVAL);
    };

    private checkConnection = () => {
        if (this.isDisconnected && this.connection.state === PUSHER_CONNECTED_STATE) {
            this.clearReconnectTimer();
            this.isDisconnected = false;
            void widgetStore.syncLatestMessages();
            void widgetStore.getConversationAttributes();
            return;
        }
        this.initReconnectTimer();
    };

    private clearReconnectTimer = () => {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    };

    private initReconnectTimer = () => {
        this.clearReconnectTimer();
        this.reconnectTimer = setTimeout(this.checkConnection, RECONNECT_INTERVAL);
    };

    // actionCable.js#isMessageInActiveConversation — bỏ tin của hội thoại khác.
    private isMessageInAnotherConversation = (message: WidgetMessage) => {
        const activeConversationId = widgetStore.getState().conversationAttributes.id;
        return Boolean(activeConversationId) && message.conversation_id !== activeConversationId;
    };

    private onMessageCreated = (data: WidgetMessage & { sender_type?: string }) => {
        if (this.isMessageInAnotherConversation(data)) return;

        widgetStore.addOrUpdateMessage(data);
        notifyAgentMessageReceived();

        IFrameHelper.sendMessage({ event: 'onEvent', eventIdentifier: SDK_EVENTS.ON_MESSAGE, data });

        // WidgetAudioNotificationHelper: âm báo do SDK phát ở trang chủ.
        if (data.sender_type === 'User') {
            IFrameHelper.sendMessage({ event: 'playAudio' });
        }
    };

    private onMessageUpdated = (data: WidgetMessage & { previous_changes?: Record<string, unknown[]> }) => {
        if (this.isMessageInAnotherConversation(data)) return;

        if (shouldTriggerMessageUpdateEvent(data)) {
            IFrameHelper.sendMessage({ event: 'onEvent', eventIdentifier: SDK_EVENTS.ON_MESSAGE, data });
        }
        widgetStore.addOrUpdateMessage(data);
    };

    private onConversationCreated = () => {
        void widgetStore.getConversationAttributes();
    };

    private onStatusChange = (data: ConversationAttributes) => {
        widgetStore.updateConversationAttributes(data);
    };

    // Đổi người phụ trách, trạng thái…: tải lại bản tóm tắt dành cho widget thay vì
    // đọc payload của dashboard, để widget chỉ thấy đúng những trường được phép.
    private onConversationUpdated = (data: { id?: number | string }) => {
        if (data.id !== widgetStore.getState().conversationAttributes.id) return;
        void widgetStore.getConversationAttributes();
    };

    private onPresenceUpdate = (data: { users?: Record<string, string> }) => {
        widgetStore.updateAgentsPresence(data.users);
    };

    private onTypingOn = (data: { conversation?: { id: number }; is_private?: boolean }) => {
        const activeConversationId = widgetStore.getState().conversationAttributes.id;
        const isTypingOnAnotherConversation = data.conversation && data.conversation.id !== activeConversationId;
        if (isTypingOnAnotherConversation || data.is_private) return;

        widgetStore.toggleAgentTyping('on');
    };

    private onTypingOff = () => {
        widgetStore.toggleAgentTyping('off');
    };

    // contact.merged: hồ sơ khách bị gộp → nối lại kênh theo pubsub_token mới.
    private onContactMerge = (data: { pubsub_token?: string }) => {
        if (!data.pubsub_token || data.pubsub_token === this.pubsubToken) return;
        this.disconnect();
        widgetConnector.connect(data.pubsub_token);
    };

    disconnect(): void {
        this.clearReconnectTimer();
        if (this.presenceTimer) {
            clearTimeout(this.presenceTimer);
            this.presenceTimer = null;
        }
        this.connection.unbind('state_change', this.onConnectionStateChange);
        this.echo.disconnect();
    }
}

// Singleton module-level: kết nối sống độc lập với vòng đời React.
export const widgetConnector = {
    instance: null as WidgetConnector | null,

    connect(pubsubToken: string): WidgetConnector {
        widgetConnector.instance?.disconnect();
        widgetConnector.instance = new WidgetConnector(pubsubToken);
        return widgetConnector.instance;
    },

    disconnect(): void {
        widgetConnector.instance?.disconnect();
        widgetConnector.instance = null;
    },
};
