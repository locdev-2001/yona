import { fetchMessages } from './api';
import { compareBySentAt } from './messageTime';
import type { ConversationMessage } from './types';

// Mở hội thoại tại đúng một tin (liên kết `?messageId=` từ tìm kiếm, Media của
// liên hệ, báo cáo; hoặc bấm vào tin được trích dẫn). Tin đích có thể nằm ngoài
// trang đang tải: nạp nốt khoảng từ tin đích tới tin cũ nhất đang có bằng chính
// API danh sách tin, để cuộn lên xuống vẫn liền mạch. Kèm một trang tin ngay trước
// tin đích để có ngữ cảnh phía trên và cuộn được tin đích vào giữa khung.

export const FOCUS_MESSAGE_PARAM = 'messageId';

// Bằng giới hạn một lần trả của khoảng `after..before` phía máy chủ.
export const MESSAGES_BETWEEN_LIMIT = 1000;

// Quá 5000 tin giữa tin đích và phần đang tải thì chấp nhận hở một khoảng
// (vẫn tới được tin đích): hội thoại dài vậy hiếm, nạp hết thì quá nặng.
export const FOCUS_WINDOW_MAX_PAGES = 5;

// Bằng một trang tin phía máy chủ (trang mới nhất, trang `before`).
export const MESSAGES_PAGE_SIZE = 20;

// Ít hơn chừng này tin phía trên tin đích thì nạp thêm một trang tin cũ hơn.
export const FOCUS_CONTEXT_BEFORE = 10;

// Không có `after`: một trang tin ngay trước `before`.
export type MessagesRangeFetcher = (before: number, after?: number) => Promise<ConversationMessage[]>;

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

    return [...byId.values()].sort(compareBySentAt);
}

async function fetchRangeUpTo(
    fetchRange: MessagesRangeFetcher,
    oldestLoadedId: number,
    targetId: number,
): Promise<ConversationMessage[]> {
    const fetched: ConversationMessage[] = [];
    let cursor = targetId;

    for (let page = 0; page < FOCUS_WINDOW_MAX_PAGES; page++) {
        const batch = await fetchRange(oldestLoadedId, cursor);
        fetched.push(...batch);
        if (batch.length < MESSAGES_BETWEEN_LIMIT) break;
        cursor = Math.max(...batch.map(message => message.id)) + 1;
    }

    return fetched;
}

// Ngữ cảnh chỉ để đọc cho dễ: nạp hỏng thì vẫn mở tại tin đích như thường.
function fetchContextBefore(fetchRange: MessagesRangeFetcher, beforeId: number): Promise<ConversationMessage[]> {
    return fetchRange(beforeId).catch(() => []);
}

function focusWindowOf(messages: ConversationMessage[], targetId: number): FocusWindow {
    return { messages, found: messages.some(message => message.id === targetId) };
}

export async function loadFocusWindow(
    loaded: ConversationMessage[],
    targetId: number,
    fetchRange: MessagesRangeFetcher,
): Promise<FocusWindow> {
    const persistedIds = loaded.map(message => message.id).filter(id => id > 0);
    const oldestLoadedId = persistedIds.length ? Math.min(...persistedIds) : Number.POSITIVE_INFINITY;
    const targetIndex = loaded.findIndex(message => message.id === targetId);

    if (targetIndex !== -1) {
        // Chưa tới một trang thì đã là toàn bộ hội thoại, không còn gì cũ hơn để nạp.
        if (targetIndex >= FOCUS_CONTEXT_BEFORE || persistedIds.length < MESSAGES_PAGE_SIZE) {
            return { messages: loaded, found: true };
        }

        return focusWindowOf(mergeMessagesChronologically(loaded, await fetchContextBefore(fetchRange, oldestLoadedId)), targetId);
    }

    if (Number.isFinite(oldestLoadedId) && targetId < oldestLoadedId) {
        const [range, context] = await Promise.all([
            fetchRangeUpTo(fetchRange, oldestLoadedId, targetId),
            fetchContextBefore(fetchRange, targetId),
        ]);
        const focus = focusWindowOf(mergeMessagesChronologically(loaded, range), targetId);

        // Tin đích không thuộc hội thoại thì trang "trước tin đích" cũng chẳng là ngữ cảnh của gì.
        return focus.found ? focusWindowOf(mergeMessagesChronologically(focus.messages, context), targetId) : focus;
    }

    // Id lớn hơn tin cũ nhất mà không có trong trang: tin nhập về sau (lịch sử kéo
    // từ kênh) mang id mới nhưng thời điểm cũ — chỉ lấy đúng tin đó. Chưa có tin nào
    // thì cũng chỉ còn cách tra đúng tin đích.
    const single = await fetchSingleMessage(fetchRange, targetId);

    return focusWindowOf(mergeMessagesChronologically(loaded, single ? [single] : []), targetId);
}
