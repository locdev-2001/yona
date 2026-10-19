import { useEffect, useSyncExternalStore } from 'react';

import { deleteJson, getJson, patchJson, postJson } from 'dashboard/helper/apiClient';
import type { ConversationFilterPayload } from 'dashboard/components-next/filter/helper/filterQuery';

// Port từ store/modules/customViews.js + api/customViews.js.
// Store vuex → cache module-level + useSyncExternalStore (khuôn useLabelsList):
// sidebar (Folders + Segments), ChatList và trang Contacts đọc chung một danh sách.
// Khác gốc: bỏ refreshConversationUnreadCounts (cờ `unread_count_for_filters`
// chưa port) và `activeConversationFolder` (folder đang mở suy ra từ id trên route).

export type CustomViewType = 'conversation' | 'contact';

export interface CustomViewQuery {
    payload: ConversationFilterPayload[];
}

export interface CustomView {
    id: number;
    name: string;
    filter_type: CustomViewType;
    query: CustomViewQuery;
}

// FILTER_KEYS của gốc: chuẩn hoá 0/1 và chuỗi về cùng một khoá.
export const customViewTypeOf = (filterType: CustomViewType | 0 | 1): CustomViewType =>
    filterType === 0 || filterType === 'conversation' ? 'conversation' : 'contact';

export const customViewFilterTypeId = (type: CustomViewType): 0 | 1 => (type === 'conversation' ? 0 : 1);

const EMPTY_VIEWS: CustomView[] = [];

const records: Record<CustomViewType, CustomView[]> = { conversation: EMPTY_VIEWS, contact: EMPTY_VIEWS };
const loadedAccountId: Record<CustomViewType, number> = { conversation: 0, contact: 0 };
const pendingAccountId: Record<CustomViewType, number> = { conversation: 0, contact: 0 };
const listeners = new Set<() => void>();

function notify(): void {
    listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function endpoint(accountId: number, id?: number): string {
    const base = `/api/v1/accounts/${accountId}/custom_filters`;
    return id ? `${base}/${id}` : base;
}

export function fetchCustomViews(accountId: number, type: CustomViewType, { force = false } = {}): void {
    if (!accountId) return;
    if (pendingAccountId[type] === accountId) return;
    if (!force && loadedAccountId[type] === accountId) return;

    pendingAccountId[type] = accountId;

    getJson<CustomView[]>(`${endpoint(accountId)}?filter_type=${type}`)
        .then(response => {
            records[type] = Array.isArray(response) ? response : EMPTY_VIEWS;
            loadedAccountId[type] = accountId;
            notify();
        })
        .catch(() => undefined)
        .finally(() => {
            pendingAccountId[type] = 0;
        });
}

export async function createCustomView(
    accountId: number,
    payload: { name: string; filter_type: 0 | 1; query: CustomViewQuery },
): Promise<CustomView> {
    // Controller đọc `custom_filter` (strong params của Rails).
    const created = await postJson<CustomView>(endpoint(accountId), { custom_filter: payload });
    const type = customViewTypeOf(payload.filter_type);
    records[type] = [...records[type], created];
    notify();

    return created;
}

export async function updateCustomView(
    accountId: number,
    id: number,
    payload: { name: string; filter_type: 0 | 1; query: CustomViewQuery },
): Promise<CustomView> {
    const updated = await patchJson<CustomView>(endpoint(accountId, id), { custom_filter: payload });
    const type = customViewTypeOf(payload.filter_type);
    records[type] = records[type].map(view => (view.id === id ? updated : view));
    notify();

    return updated;
}

export async function deleteCustomView(accountId: number, id: number, type: CustomViewType): Promise<void> {
    await deleteJson(`${endpoint(accountId, id)}?filter_type=${type}`);
    records[type] = records[type].filter(view => view.id !== id);
    notify();
}

export function useCustomViews(accountId: number, type: CustomViewType): CustomView[] {
    useEffect(() => fetchCustomViews(accountId, type), [accountId, type]);

    return useSyncExternalStore(subscribe, () => records[type]);
}

// Chỉ dùng trong test.
export function resetCustomViewsStore(): void {
    records.conversation = EMPTY_VIEWS;
    records.contact = EMPTY_VIEWS;
    loadedAccountId.conversation = 0;
    loadedAccountId.contact = 0;
    pendingAccountId.conversation = 0;
    pendingAccountId.contact = 0;
    notify();
}
