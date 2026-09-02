import type Echo from 'laravel-echo';

import { postJson } from 'dashboard/helper/apiClient';
import { createEcho } from './echo';
import type { RealtimeIdentity } from './types';

// Port từ shared/helpers/BaseActionCableConnector.js — RoomChannel (stream pubsub_token
// + account_{id}, perform('update_presence')) đổi thành 2 kênh private của Reverb +
// heartbeat POST /presence (server broadcast presence.update về kênh pubsub_token).
const PRESENCE_INTERVAL = 20000;
const RECONNECT_INTERVAL = 1000;

// pusher-js: state đi qua initialized → connecting → connected → (unavailable|disconnected|failed).
const PUSHER_CONNECTED_STATE = 'connected';
const PUSHER_LOST_STATES = ['unavailable', 'disconnected', 'failed'];

export interface ReceivedEvent<T = unknown> {
    event: string;
    data: T;
}

type EventHandler = (data: never) => void;

interface PusherConnection {
    state: string;
    bind(event: string, handler: (change?: { previous: string; current: string }) => void): void;
    unbind(event: string, handler?: (change?: { previous: string; current: string }) => void): void;
}

// listenToAll của laravel-echo trả tên có namespace hoặc tiền tố "." cho event
// ngoài namespace (`.message.created`) — cắt về đúng tên Chatwoot.
export function normalizeEchoEventName(eventName: string): string {
    return eventName.startsWith('.') ? eventName.slice(1) : eventName;
}

export const accountChannelName = (accountId: number) => `account_${accountId}`;

class BaseActionCableConnector {
    static isDisconnected = false;

    protected echo: Echo<'reverb'>;
    protected identity: RealtimeIdentity;
    protected events: Record<string, EventHandler> = {};
    protected isAValidEvent: (data: unknown) => boolean = () => true;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private presenceTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly presenceInterval: number;
    private hasBeenConnected = false;

    constructor(identity: RealtimeIdentity, presenceInterval = PRESENCE_INTERVAL) {
        this.identity = identity;
        this.presenceInterval = presenceInterval;
        this.echo = createEcho();

        [identity.pubsubToken, accountChannelName(identity.accountId)].forEach(channelName => {
            this.echo.private(channelName).listenToAll((eventName: string, data: unknown) => {
                this.onReceived({ event: normalizeEchoEventName(eventName), data });
            });
        });

        this.connection.bind('state_change', this.onConnectionStateChange);
        this.triggerPresenceInterval();
    }

    protected get connection(): PusherConnection {
        return this.echo.connector.pusher.connection as unknown as PusherConnection;
    }

    isConnectionOpen(): boolean {
        return this.connection.state === PUSHER_CONNECTED_STATE;
    }

    private onConnectionStateChange = (change?: { previous: string; current: string }) => {
        const current = change?.current ?? this.connection.state;
        if (current === PUSHER_CONNECTED_STATE) {
            // Lần connect đầu: bắn heartbeat ngay để nhận presence.update (RoomChannel#subscribed).
            if (!this.hasBeenConnected) {
                this.hasBeenConnected = true;
                void this.updatePresence();
            }
            this.onConnected();
            return;
        }
        if (this.hasBeenConnected && PUSHER_LOST_STATES.includes(current)) {
            BaseActionCableConnector.isDisconnected = true;
            this.onDisconnected();
            this.initReconnectTimer();
        }
    };

    updatePresence = async (): Promise<void> => {
        try {
            await postJson(`/api/v1/accounts/${this.identity.accountId}/presence`, {});
        } catch {
            // Heartbeat lỗi (mất mạng/401) — lần sau thử lại, giống perform() gốc không await.
        }
    };

    private triggerPresenceInterval = () => {
        this.presenceTimer = setTimeout(() => {
            void this.updatePresence();
            this.triggerPresenceInterval();
        }, this.presenceInterval);
    };

    checkConnection() {
        const isReconnected = BaseActionCableConnector.isDisconnected && this.isConnectionOpen();
        if (isReconnected) {
            this.clearReconnectTimer();
            this.onReconnect();
            BaseActionCableConnector.isDisconnected = false;
        } else {
            this.initReconnectTimer();
        }
    }

    clearReconnectTimer = () => {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    };

    initReconnectTimer = () => {
        this.clearReconnectTimer();
        this.reconnectTimer = setTimeout(() => this.checkConnection(), RECONNECT_INTERVAL);
    };

    onReconnect = () => {};

    onDisconnected = () => {};

    onConnected = () => {};

    disconnect() {
        this.clearReconnectTimer();
        if (this.presenceTimer) {
            clearTimeout(this.presenceTimer);
            this.presenceTimer = null;
        }
        this.connection.unbind('state_change', this.onConnectionStateChange);
        this.echo.disconnect();
    }

    onReceived = ({ event, data }: ReceivedEvent) => {
        if (!this.isAValidEvent(data)) return;
        const handler = this.events[event];
        if (typeof handler === 'function') {
            handler(data as never);
        }
    };
}

export default BaseActionCableConnector;
