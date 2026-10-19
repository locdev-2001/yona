import { useSyncExternalStore } from 'react';

import {
    searchArticles,
    searchContacts,
    searchConversations,
    searchFiles,
    searchMessages,
    type SearchParams,
} from './api';
import type { SearchArticle, SearchContact, SearchConversation, SearchFile, SearchMessage } from './types';

// Port từ dashboard/store/modules/conversationSearch.js — module vuex đổi thành
// một ô nhớ cấp module + useSyncExternalStore (cùng lối reports/store.ts).

export const PER_PAGE = 15;

// Mọi loại kết quả, theo đúng thứ tự hiển thị. Thêm một loại mới chỉ sửa store.
export const SEARCH_RECORD_KINDS = ['conversations', 'messages', 'contacts', 'files', 'articles'] as const;

export type SearchRecordKind = (typeof SEARCH_RECORD_KINDS)[number];

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
    file: KindFlags;
    article: KindFlags;
}

interface SearchState {
    contactRecords: SearchContact[];
    conversationRecords: SearchConversation[];
    messageRecords: SearchMessage[];
    fileRecords: SearchFile[];
    articleRecords: SearchArticle[];
    uiFlags: SearchUiFlags;
}

const FLAG_KEY = {
    contacts: 'contact',
    conversations: 'conversation',
    messages: 'message',
    files: 'file',
    articles: 'article',
} as const satisfies Record<SearchRecordKind, keyof SearchUiFlags>;

const RECORD_KEY = {
    contacts: 'contactRecords',
    conversations: 'conversationRecords',
    messages: 'messageRecords',
    files: 'fileRecords',
    articles: 'articleRecords',
} as const satisfies Record<SearchRecordKind, keyof SearchState>;

const FETCHER = {
    contacts: searchContacts,
    conversations: searchConversations,
    messages: searchMessages,
    files: searchFiles,
    articles: searchArticles,
} as const satisfies Record<SearchRecordKind, (accountId: number, params: SearchParams) => Promise<{ id: number }[]>>;

type RecordsState = Pick<SearchState, (typeof RECORD_KEY)[SearchRecordKind]>;

const emptyRecords = (): RecordsState => ({
    contactRecords: [],
    conversationRecords: [],
    messageRecords: [],
    fileRecords: [],
    articleRecords: [],
});

const initialState = (): SearchState => ({
    ...emptyRecords(),
    uiFlags: {
        isFetching: false,
        isSearchCompleted: false,
        contact: { isFetching: false },
        conversation: { isFetching: false },
        message: { isFetching: false },
        file: { isFetching: false },
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

export function clearSearchResults(): void {
    setState(emptyRecords());
}

export function searchRecordsOf(searchState: SearchState, kind: SearchRecordKind): { id: number }[] {
    return searchState[RECORD_KEY[kind]];
}

export function searchFlagsOf(searchState: SearchState, kind: SearchRecordKind): KindFlags {
    return searchState.uiFlags[FLAG_KEY[kind]];
}

// Một đường duy nhất cho mọi loại kết quả, trả false khi lỗi để caller lùi lại
// bộ đếm trang.
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
        await Promise.all(SEARCH_RECORD_KINDS.map(kind => searchByKind(kind, accountId, params)));
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
