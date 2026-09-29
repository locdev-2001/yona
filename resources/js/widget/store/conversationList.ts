import { useSyncExternalStore } from 'react';

import * as api from '../api/widget';
import type { ConversationListItem } from '../api/widget';
import { MESSAGE_TYPE } from '../helpers/constants';
import type { WidgetMessage } from '../types';

// Tab Tin nhắn: danh sách hội thoại của khách. Store riêng, nhỏ, tách khỏi
// widgetStore (vốn giữ tin của hội thoại đang mở).

export interface ConversationListState {
    items: ConversationListItem[];
    loaded: boolean;
    loading: boolean;
    hasMore: boolean;
    page: number;
    failed: boolean;
}

const initial: ConversationListState = { items: [], loaded: false, loading: false, hasMore: false, page: 0, failed: false };

let state = initial;
const listeners = new Set<() => void>();

function setState(patch: Partial<ConversationListState>): void {
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
}

const byActivity = (a: ConversationListItem, b: ConversationListItem) => (b.last_activity_at ?? 0) - (a.last_activity_at ?? 0);

export const conversationList = {
    getState: (): ConversationListState => state,

    subscribe(listener: () => void): () => void {
        listeners.add(listener);

        return () => listeners.delete(listener);
    },

    /** Trang đầu (làm mới) hoặc trang kế tiếp. */
    async load({ more = false }: { more?: boolean } = {}): Promise<void> {
        if (state.loading || (more && !state.hasMore)) return;

        const page = more ? state.page + 1 : 1;
        setState({ loading: true, failed: false });

        try {
            const { payload, meta } = await api.fetchConversationList(page);
            const items = more ? [...state.items, ...payload.filter(item => !state.items.some(known => known.id === item.id))] : payload;
            setState({ items, loaded: true, loading: false, hasMore: meta.has_more, page });
        } catch {
            setState({ loading: false, failed: true, loaded: true });
        }
    },

    /**
     * Tin mới qua realtime: đưa hội thoại lên đầu, cập nhật dòng xem trước; tin của
     * shop ở hội thoại khách đang KHÔNG mở thì tăng số chưa đọc.
     */
    applyMessage(message: WidgetMessage, { isOpen }: { isOpen: boolean }): void {
        const id = Number(message.conversation_id);
        const current = state.items.find(item => item.id === id);
        if (!current) return;

        // Máy chủ gửi sẵn dòng xem trước khi content không tự nói lên tin (sticker, tin có cấu trúc).
        const preview = message.preview_text || message.content;
        const fromShop = message.message_type === MESSAGE_TYPE.OUTGOING || message.message_type === MESSAGE_TYPE.TEMPLATE;
        const updated: ConversationListItem = {
            ...current,
            last_activity_at: message.created_at,
            unread_count: fromShop && !isOpen ? current.unread_count + 1 : current.unread_count,
            last_message: preview
                ? { id: Number(message.id), preview, message_type: message.message_type, created_at: message.created_at }
                : current.last_message,
        };

        setState({ items: [updated, ...state.items.filter(item => item.id !== id)].sort(byActivity) });
    },

    markRead(id: number): void {
        if (!state.items.some(item => item.id === id && item.unread_count > 0)) return;
        setState({ items: state.items.map(item => (item.id === id ? { ...item, unread_count: 0 } : item)) });
    },

    /** Tổng tin chưa đọc ở các hội thoại — badge tab Tin nhắn. */
    unreadTotal: (): number => state.items.reduce((sum, item) => sum + item.unread_count, 0),

    reset(): void {
        setState(initial);
    },
};

export function useConversationList(): ConversationListState {
    return useSyncExternalStore(conversationList.subscribe, conversationList.getState, conversationList.getState);
}
