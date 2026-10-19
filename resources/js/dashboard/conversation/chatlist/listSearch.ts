import { getPlainText } from 'shared/helpers/MessageFormatter';
import { excerptAroundFirstMatch } from 'shared/helpers/searchFold';
import { FOCUS_MESSAGE_PARAM } from '../messageFocus';
import type { Conversation, ConversationMessage } from '../types';

// Ô tìm trong cột danh sách hội thoại: từ khoá sống trên query string để reload,
// mở hội thoại hay chia sẻ liên kết vẫn giữ đúng danh sách đang lọc.
export const LIST_SEARCH_PARAM = 'q';

export function readListSearchQuery(search: string): string {
    return (new URLSearchParams(search).get(LIST_SEARCH_PARAM) ?? '').trim();
}

// `pathAndSearch` là pathname + search hiện tại; các tham số khác giữ nguyên.
export function withListSearchQuery(pathAndSearch: string, query: string): string {
    const url = new URL(pathAndSearch, 'http://local');
    const trimmed = query.trim();

    if (trimmed) {
        url.searchParams.set(LIST_SEARCH_PARAM, trimmed);
    } else {
        url.searchParams.delete(LIST_SEARCH_PARAM);
    }

    return `${url.pathname}${url.search}`;
}

// Dòng xem trước của một hội thoại trong mục "Hội thoại": đoạn tin khớp cắt quanh
// chỗ khớp đầu tiên, thay cho dòng tóm tắt mà tin đó vẫn hiện ở danh sách thường
// (tiêu đề thư, chữ máy chủ dựng sẵn) — để thấy đúng lý do hội thoại khớp.
export function matchedMessagePreview(message: ConversationMessage, query: string): ConversationMessage {
    const plainContent = getPlainText(message.content).replace(/\s+/g, ' ').trim();

    if (!plainContent) return message;

    return {
        ...message,
        content: excerptAroundFirstMatch(plainContent, query),
        preview_text: null,
        content_attributes: {},
    };
}

// Liên kết mở hội thoại tại đúng tin khớp.
export function withFocusMessage(conversationPath: string, messageId: number): string {
    const url = new URL(conversationPath, 'http://local');
    url.searchParams.set(FOCUS_MESSAGE_PARAM, String(messageId));

    return `${url.pathname}${url.search}`;
}

// Nối trang sau vào danh sách đã có, bỏ hội thoại đã hiện (dữ liệu đổi giữa hai lượt tải).
export function appendSearchPage<T extends Pick<Conversation, 'id'>>(previous: T[], page: T[]): T[] {
    const known = new Set(previous.map(item => item.id));

    return [...previous, ...page.filter(item => !known.has(item.id))];
}
