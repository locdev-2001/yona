// Tương đương mitt (shared/helpers/mitt.js bên Chatwoot) — pub/sub tối giản.
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
} as const;
