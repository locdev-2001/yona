import { fetchMessages } from './api';
import type { ConversationMessage } from './types';

// Mở hội thoại tại đúng một tin (liên kết `?messageId=` từ tìm kiếm, Media của
// liên hệ, báo cáo; hoặc bấm vào tin được trích dẫn). Tin đích có thể nằm ngoài
// trang đang tải: nạp nốt khoảng từ tin đích tới tin cũ nhất đang có bằng chính
// API danh sách tin, để cuộn lên xuống vẫn liền mạch.

export const FOCUS_MESSAGE_PARAM = 'messageId';

// Bằng giới hạn một lần trả của khoảng `after..before` phía máy chủ.
export const MESSAGES_BETWEEN_LIMIT = 1000;

// Quá 5000 tin giữa tin đích và phần đang tải thì chấp nhận hở một khoảng
// (vẫn tới được tin đích): hội thoại dài vậy hiếm, nạp hết thì quá nặng.
export const FOCUS_WINDOW_MAX_PAGES = 5;

export type MessagesRangeFetcher = (before: number, after: number) => Promise<ConversationMessage[]>;

export interface FocusWindow {
    messages: ConversationMessage[];
    found: boolean;
}

export function readFocusMessageId(search: string): number | null {
    const raw = new URLSearchParams(search).get(FOCUS_MESSAGE_PARAM);
    if (raw === null || !/^\d+$/.test(raw)) return null;

    const id = Number(raw);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function messagesRangeOf(accountId: number, conversationId: number): MessagesRangeFetcher {
    return (before, after) => fetchMessages(accountId, conversationId, before, after).then(response => response.payload);
}

// Đúng một tin theo id nếu nó thuộc hội thoại này (khoảng [id, id + 1)).
export async function fetchSingleMessage(fetchRange: MessagesRangeFetcher, messageId: number): Promise<ConversationMessage | null> {
    const page = await fetchRange(messageId + 1, messageId);

    return page.find(message => message.id === messageId) ?? null;
}

export function mergeMessagesChronologically(
    current: ConversationMessage[],
    incoming: ConversationMessage[],
): ConversationMessage[] {
    const byId = new Map<number, ConversationMessage>();
    [...current, ...incoming].forEach(message => {
        if (!byId.has(message.id)) byId.set(message.id, message);
    });

    return [...byId.values()].sort((a, b) => a.created_at - b.created_at || a.id - b.id);
}

export async function loadFocusWindow(
    loaded: ConversationMessage[],
    targetId: number,
    fetchRange: MessagesRangeFetcher,
): Promise<FocusWindow> {
    if (loaded.some(message => message.id === targetId)) {
        return { messages: loaded, found: true };
    }

    const persistedIds = loaded.map(message => message.id).filter(id => id > 0);
    const oldestLoadedId = persistedIds.length ? Math.min(...persistedIds) : Number.POSITIVE_INFINITY;
    const fetched: ConversationMessage[] = [];

    if (Number.isFinite(oldestLoadedId) && targetId < oldestLoadedId) {
        let cursor = targetId;
        for (let page = 0; page < FOCUS_WINDOW_MAX_PAGES; page++) {
            const batch = await fetchRange(oldestLoadedId, cursor);
            fetched.push(...batch);
            if (batch.length < MESSAGES_BETWEEN_LIMIT) break;
            cursor = Math.max(...batch.map(message => message.id)) + 1;
        }
    } else {
        // Id lớn hơn tin cũ nhất mà không có trong trang: tin nhập về sau (lịch
        // sử kéo từ kênh) mang id mới nhưng thời điểm cũ — chỉ lấy đúng tin đó.
        // Chưa có tin nào thì cũng chỉ còn cách tra đúng tin đích.
        const single = await fetchSingleMessage(fetchRange, targetId);
        if (single) fetched.push(single);
    }

    const messages = mergeMessagesChronologically(loaded, fetched);

    return { messages, found: messages.some(message => message.id === targetId) };
}
