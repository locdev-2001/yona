// Pub/sub tối giản kiểu mitt.
type Handler = (payload: unknown) => void;

const handlers = new Map<string, Set<Handler>>();

export const emitter = {
    on(event: string, handler: Handler): void {
        if (!handlers.has(event)) handlers.set(event, new Set());
        handlers.get(event)!.add(handler);
    },
    off(event: string, handler: Handler): void {
        handlers.get(event)?.delete(handler);
    },
    emit(event: string, payload?: unknown): void {
        handlers.get(event)?.forEach(handler => handler(payload));
    },
};

export const BUS_EVENTS = {
    SHOW_TOAST: 'SHOW_TOAST',
    WEBSOCKET_DISCONNECT: 'WEBSOCKET_DISCONNECT',
    WEBSOCKET_RECONNECT: 'WEBSOCKET_RECONNECT',
    WEBSOCKET_RECONNECT_COMPLETED: 'WEBSOCKET_RECONNECT_COMPLETED',
} as const;
