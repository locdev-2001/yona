import type Echo from 'laravel-echo';

import { createEcho } from './echo';
import type { RealtimeIdentity } from './types';

// Mỗi người dùng nghe một kênh private của Reverb mang tên pubsub_token của mình;
// mọi sự kiện nhắn tin của người đó đi qua kênh này.
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
// ngoài namespace (`.message.created`) — cắt về đúng tên event nghiệp vụ.
export function normalizeEchoEventName(eventName: string): string {
    return eventName.startsWith('.') ? eventName.slice(1) : eventName;
}

class BaseActionCableConnector {
    static isDisconnected = false;

    protected echo: Echo<'reverb'>;
    protected identity: RealtimeIdentity;
    protected events: Record<string, EventHandler> = {};
    protected isAValidEvent: (data: unknown) => boolean = () => true;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private hasBeenConnected = false;

    constructor(identity: RealtimeIdentity) {
        this.identity = identity;
        this.echo = createEcho();

        this.echo.private(identity.pubsubToken).listenToAll((eventName: string, data: unknown) => {
            this.onReceived({ event: normalizeEchoEventName(eventName), data });
        });

        this.connection.bind('state_change', this.onConnectionStateChange);
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
            this.hasBeenConnected = true;
            this.onConnected();
            return;
        }
        if (this.hasBeenConnected && PUSHER_LOST_STATES.includes(current)) {
            BaseActionCableConnector.isDisconnected = true;
            this.onDisconnected();
            this.initReconnectTimer();
        }
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
