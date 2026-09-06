// Port từ dashboard/api/search.js.
import { getJson } from 'dashboard/helper/apiClient';
import { camelizeKeys } from 'dashboard/helper/transformKeys';
import type { SearchArticle, SearchContact, SearchConversation, SearchMessage } from './types';

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
    articles?: unknown[];
}

const searchUrl = (accountId: number) => `/api/v1/accounts/${accountId}/search`;

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

async function fetchPayload(url: string): Promise<SearchPayload> {
    const response = await getJson<{ payload: SearchPayload }>(url);

    return camelizeKeys<SearchPayload>(response.payload, [
        'additional_attributes',
        'content_attributes',
        // Chip đính kèm của Yona đọc khoá snake_case (MessageAttachment) — giữ nguyên.
        'attachments',
    ]);
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

export async function searchArticles(accountId: number, params: SearchParams): Promise<SearchArticle[]> {
    const payload = await fetchPayload(`${searchUrl(accountId)}/articles?${queryString(params)}`);

    return (payload.articles ?? []) as SearchArticle[];
}
