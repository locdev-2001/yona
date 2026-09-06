import { useSyncExternalStore } from 'react';

import {
    searchArticles,
    searchContacts,
    searchConversations,
    searchMessages,
    type SearchParams,
} from './api';
import type { SearchArticle, SearchContact, SearchConversation, SearchMessage } from './types';

// Port từ dashboard/store/modules/conversationSearch.js — module vuex đổi thành
// một ô nhớ cấp module + useSyncExternalStore (cùng lối reports/store.ts).

export const PER_PAGE = 15;

export type SearchRecordKind = 'contacts' | 'conversations' | 'messages' | 'articles';

interface KindFlags {
    isFetching: boolean;
    hasMore?: boolean;
}

export interface SearchUiFlags {
    isFetching: boolean;
    isSearchCompleted: boolean;
    contact: KindFlags;
    conversation: KindFlags;
    message: KindFlags;
    article: KindFlags;
}

interface SearchState {
    contactRecords: SearchContact[];
    conversationRecords: SearchConversation[];
    messageRecords: SearchMessage[];
    articleRecords: SearchArticle[];
    uiFlags: SearchUiFlags;
}

const FLAG_KEY: Record<SearchRecordKind, keyof Pick<SearchUiFlags, 'contact' | 'conversation' | 'message' | 'article'>> =
    {
        contacts: 'contact',
        conversations: 'conversation',
        messages: 'message',
        articles: 'article',
    };

const initialState = (): SearchState => ({
    contactRecords: [],
    conversationRecords: [],
    messageRecords: [],
    articleRecords: [],
    uiFlags: {
        isFetching: false,
        isSearchCompleted: false,
        contact: { isFetching: false },
        conversation: { isFetching: false },
        message: { isFetching: false },
        article: { isFetching: false },
    },
});

let state: SearchState = initialState();
const listeners = new Set<() => void>();

function emit(): void {
    listeners.forEach(listener => listener());
}

function setState(next: Partial<SearchState>): void {
    state = { ...state, ...next };
    emit();
}

function setKindFlags(kind: SearchRecordKind, flags: Partial<KindFlags>): void {
    const key = FLAG_KEY[kind];
    setState({ uiFlags: { ...state.uiFlags, [key]: { ...state.uiFlags[key], ...flags } } });
}

// Trang kề nhau có thể chồng lấn (bản ghi mới làm dịch offset) — bỏ id đã có.
function appendUniqueRecords<T extends { id: number }>(existing: T[], incoming: T[]): T[] {
    const existingIds = new Set(existing.map(record => record.id));

    return [...existing, ...incoming.filter(record => !existingIds.has(record.id))];
}

const RECORD_KEY = {
    contacts: 'contactRecords',
    conversations: 'conversationRecords',
    messages: 'messageRecords',
    articles: 'articleRecords',
} as const;

const FETCHER = {
    contacts: searchContacts,
    conversations: searchConversations,
    messages: searchMessages,
    articles: searchArticles,
} as const;

export function clearSearchResults(): void {
    setState({ contactRecords: [], conversationRecords: [], messageRecords: [], articleRecords: [] });
}

// contactSearch/conversationSearch/messageSearch/articleSearch — một đường duy
// nhất, trả false khi lỗi để caller lùi lại bộ đếm trang.
export async function searchByKind(
    kind: SearchRecordKind,
    accountId: number,
    params: SearchParams,
): Promise<boolean> {
    setKindFlags(kind, { isFetching: true });
    try {
        const records = await FETCHER[kind](accountId, params);
        const key = RECORD_KEY[kind];
        setState({ [key]: appendUniqueRecords(state[key] as { id: number }[], records) } as Partial<SearchState>);
        // hasMore đọc từ kích thước trang thô: sau khi khử trùng số bản ghi lưu
        // lại có thể nhỏ hơn nên không dùng nó để biết còn trang hay không.
        setKindFlags(kind, { hasMore: records.length === PER_PAGE });

        return true;
    } catch {
        return false;
    } finally {
        setKindFlags(kind, { isFetching: false });
    }
}

export async function fullSearch(accountId: number, params: SearchParams): Promise<void> {
    setState({ uiFlags: { ...state.uiFlags, isFetching: true, isSearchCompleted: false } });
    try {
        await Promise.all(
            (Object.keys(RECORD_KEY) as SearchRecordKind[]).map(kind => searchByKind(kind, accountId, params)),
        );
    } finally {
        setState({ uiFlags: { ...state.uiFlags, isFetching: false, isSearchCompleted: true } });
    }
}

export function getSearchState(): SearchState {
    return state;
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

export function useSearchState(): SearchState {
    return useSyncExternalStore(
        subscribe,
        () => state,
        () => state,
    );
}
