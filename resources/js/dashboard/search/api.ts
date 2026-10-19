// Port từ dashboard/api/search.js.
import { getJson } from 'dashboard/helper/apiClient';
import { camelizeKeys } from 'dashboard/helper/transformKeys';
import type { SearchArticle, SearchContact, SearchConversation, SearchFile, SearchMessage } from './types';

export interface SearchParams {
    q: string;
    page?: number;
    since?: number | null;
    until?: number | null;
    from?: string | null;
    inboxId?: number | null;
}

interface SearchPayload {
    contacts?: unknown[];
    conversations?: unknown[];
    messages?: unknown[];
    files?: unknown[];
    articles?: unknown[];
}

const searchUrl = (accountId: number) => `/api/v1/accounts/${accountId}/search`;

// Nơi duy nhất quyết định loại kết quả nào nhận bộ lọc theo tin (người gửi,
// hộp thư): chỉ tin nhắn và tệp. Người gọi luôn truyền đủ bộ lọc đang chọn.
function queryString({ q, page = 1, since, until, from, inboxId }: SearchParams, withMessageFilters = false): string {
    const params = new URLSearchParams({ q, page: String(page) });
    if (since) params.set('since', String(since));
    if (until) params.set('until', String(until));
    if (withMessageFilters) {
        if (from) params.set('from', from);
        if (inboxId) params.set('inbox_id', String(inboxId));
    }

    return params.toString();
}

// Giữ nguyên khoá snake_case bên trong các cụm này: thuộc tính tuỳ biến, khoá chuẩn
// của tin (sender, in_reply_to…) và chip đính kèm đều đọc snake_case. Đường dẫn
// tính từ gốc payload, phần tử mảng giữ đường dẫn của mảng.
const RAW_KEY_PATHS = [
    'contacts.additional_attributes',
    'conversations.additional_attributes',
    'messages.content_attributes',
    'messages.attachments',
    'files.message.content_attributes',
    'files.message.attachments',
];

async function fetchPayload(url: string): Promise<SearchPayload> {
    const response = await getJson<{ payload: SearchPayload }>(url);

    return camelizeKeys<SearchPayload>(response.payload, RAW_KEY_PATHS);
}

export async function searchContacts(accountId: number, params: SearchParams): Promise<SearchContact[]> {
    const payload = await fetchPayload(`${searchUrl(accountId)}/contacts?${queryString(params)}`);

    return (payload.contacts ?? []) as SearchContact[];
}

export async function searchConversations(accountId: number, params: SearchParams): Promise<SearchConversation[]> {
    const payload = await fetchPayload(`${searchUrl(accountId)}/conversations?${queryString(params)}`);

    return (payload.conversations ?? []) as SearchConversation[];
}

export async function searchMessages(accountId: number, params: SearchParams): Promise<SearchMessage[]> {
    const payload = await fetchPayload(`${searchUrl(accountId)}/messages?${queryString(params, true)}`);

    return (payload.messages ?? []) as SearchMessage[];
}

export async function searchFiles(accountId: number, params: SearchParams): Promise<SearchFile[]> {
    const payload = await fetchPayload(`${searchUrl(accountId)}/files?${queryString(params, true)}`);

    return (payload.files ?? []) as SearchFile[];
}

export async function searchArticles(accountId: number, params: SearchParams): Promise<SearchArticle[]> {
    const payload = await fetchPayload(`${searchUrl(accountId)}/articles?${queryString(params)}`);

    return (payload.articles ?? []) as SearchArticle[];
}
