import type { Conversation } from '../types';

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

// Tập id hội thoại khớp từ khoá do máy chủ trả về, gộp theo từng trang đã nạp.
// Không tìm thì không giới hạn (null).
export function nextSearchMatches(
    previous: ReadonlySet<number> | null,
    payload: Pick<Conversation, 'id'>[],
    query: string | undefined,
    append: boolean,
): ReadonlySet<number> | null {
    if (!query) return null;

    return new Set([...(append && previous ? previous : []), ...payload.map(conversation => conversation.id)]);
}

// Hội thoại nạp qua đường khác (realtime, hội thoại đang mở) chưa chắc khớp từ khoá —
// khi đang tìm, danh sách chỉ hiện đúng những hội thoại máy chủ đã trả cho từ khoá.
export function keepSearchMatches<T extends Pick<Conversation, 'id'>>(
    conversations: T[],
    matches: ReadonlySet<number> | null,
): T[] {
    return matches ? conversations.filter(conversation => matches.has(conversation.id)) : conversations;
}
