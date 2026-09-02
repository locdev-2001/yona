import { differenceInSeconds } from 'date-fns';

import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';

// Port từ dashboard/helper/ReconnectService.js. Không có store/router toàn cục nên
// phần "route-specific fetch" do page đăng ký qua registerReconnectHandlers;
// service await các handler rồi mới phát WEBSOCKET_RECONNECT_COMPLETED.
const MAX_DISCONNECT_SECONDS = 10800;

// Bù trễ phát hiện mất kết nối (websocket cần tới ~3s) khi tính updated_within.
export const DISCONNECT_DELAY_THRESHOLD = 15;

export interface ReconnectHandlers {
    fetchConversationsOnReconnect?: () => Promise<void> | void;
    fetchConversationMessagesOnReconnect?: () => Promise<void> | void;
    fetchNotificationsOnReconnect?: () => Promise<void> | void;
    revalidateCaches?: () => Promise<void> | void;
    setConversationLastMessageId?: () => Promise<void> | void;
}

const registeredHandlers = new Set<ReconnectHandlers>();

export function registerReconnectHandlers(handlers: ReconnectHandlers): () => void {
    registeredHandlers.add(handlers);
    return () => registeredHandlers.delete(handlers);
}

let disconnectTime: Date | null = null;

export const getSecondsSinceDisconnect = (): number =>
    disconnectTime ? Math.max(differenceInSeconds(new Date(), disconnectTime), 0) : 0;

async function runHandlers(step: keyof ReconnectHandlers): Promise<void> {
    for (const handlers of registeredHandlers) {
        try {
            await handlers[step]?.();
        } catch {
            // Bỏ qua lỗi để luồng reconnect tiếp tục (gốc: fetchFilteredOrSavedConversations).
        }
    }
}

class ReconnectService {
    constructor() {
        this.setupEventListeners();
    }

    disconnect = () => this.removeEventListeners();

    setupEventListeners = () => {
        window.addEventListener('online', this.handleOnlineEvent);
        emitter.on(BUS_EVENTS.WEBSOCKET_RECONNECT, this.onReconnect);
        emitter.on(BUS_EVENTS.WEBSOCKET_DISCONNECT, this.onDisconnect);
    };

    removeEventListeners = () => {
        window.removeEventListener('online', this.handleOnlineEvent);
        emitter.off(BUS_EVENTS.WEBSOCKET_RECONNECT, this.onReconnect);
        emitter.off(BUS_EVENTS.WEBSOCKET_DISCONNECT, this.onDisconnect);
    };

    getSecondsSinceDisconnect = getSecondsSinceDisconnect;

    // Mất kết nối quá 3 giờ → reload hẳn khi có mạng lại.
    handleOnlineEvent = () => {
        if (getSecondsSinceDisconnect() >= MAX_DISCONNECT_SECONDS) {
            window.location.reload();
        }
    };

    onDisconnect = () => {
        disconnectTime = new Date();
        void runHandlers('setConversationLastMessageId');
    };

    onReconnect = async () => {
        await runHandlers('fetchConversationsOnReconnect');
        await runHandlers('fetchConversationMessagesOnReconnect');
        await runHandlers('fetchNotificationsOnReconnect');
        await runHandlers('revalidateCaches');
        emitter.emit(BUS_EVENTS.WEBSOCKET_RECONNECT_COMPLETED);
    };
}

export default ReconnectService;
