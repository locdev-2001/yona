import { useEffect, useSyncExternalStore } from 'react';
import { picoSearch } from '@ext/pico-search';

import { deleteJson, getJson, patchJson, postJson } from 'dashboard/helper/apiClient';

// Port từ store/modules/cannedResponse.js + api/cannedResponse.js.
// Store vuex → cache module-level + useSyncExternalStore, cùng khuôn với
// composables/useLabelsList.ts: màn Settings và popup `/` trong ReplyBox đọc
// chung một danh sách, `getCannedResponse` chỉ chạy một lần cho mỗi account.
// Khác gốc: bỏ lớp CacheEnabledApiClient (IndexedDB + validateCacheKey) — bản
// port chưa có hạ tầng cache phía client.

export interface CannedResponse {
    id: number;
    short_code: string;
    content: string;
    // Có thì câu trả lời mẫu mang một thẻ (Gửi thẻ) thay vì chỉ chữ thuần.
    content_type?: string | null;
    content_attributes?: Record<string, unknown> | null;
}

export interface CannedResponsePayload {
    short_code?: string;
    content?: string;
    content_type?: string;
    content_attributes?: Record<string, unknown>;
}

export type CannedSortOrder = 'asc' | 'desc';

// vuelidate: shortCode required + minLength(2) — dùng chung ở form Cài đặt lẫn
// nút "Lưu làm câu trả lời mẫu" trong hộp thoại Gửi thẻ.
export function isShortCodeInvalid(shortCode: string): boolean {
    return shortCode.trim().length < 2;
}

const EMPTY_RECORDS: CannedResponse[] = [];

let records: CannedResponse[] = EMPTY_RECORDS;
let isFetchingList = false;
let loadedAccountId = 0;
let pendingAccountId = 0;
const listeners = new Set<() => void>();

function notify(): void {
    listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function endpoint(accountId: number, id?: number): string {
    const base = `/api/v1/accounts/${accountId}/canned_responses`;
    return id ? `${base}/${id}` : base;
}

export function fetchCannedResponses(accountId: number, { force = false } = {}): void {
    if (!accountId) return;
    if (pendingAccountId === accountId) return;
    if (!force && loadedAccountId === accountId) return;

    pendingAccountId = accountId;
    isFetchingList = true;
    notify();

    getJson<CannedResponse[]>(endpoint(accountId))
        .then(response => {
            records = Array.isArray(response) ? response : EMPTY_RECORDS;
            loadedAccountId = accountId;
        })
        .catch(() => undefined)
        .finally(() => {
            pendingAccountId = 0;
            isFetchingList = false;
            notify();
        });
}

export async function createCannedResponse(
    accountId: number,
    payload: CannedResponsePayload,
): Promise<CannedResponse> {
    const created = await postJson<CannedResponse>(endpoint(accountId), payload as Record<string, unknown>);
    records = [...records, created];
    notify();
    return created;
}

export async function updateCannedResponse(
    accountId: number,
    id: number,
    payload: CannedResponsePayload,
): Promise<CannedResponse> {
    const updated = await patchJson<CannedResponse>(endpoint(accountId, id), payload as Record<string, unknown>);
    records = records.map(record => (record.id === updated.id ? updated : record));
    notify();
    return updated;
}

export async function deleteCannedResponse(accountId: number, id: number): Promise<void> {
    await deleteJson(endpoint(accountId, id));
    records = records.filter(record => record.id !== id);
    notify();
}

// Ghi một lượt dùng câu trả lời mẫu (thống kê sản phẩm). Không chờ, lỗi bỏ qua:
// không bao giờ được chặn việc chèn nội dung vào ô soạn.
export function markCannedResponseUsed(accountId: number, id: number): void {
    if (!accountId || !id) return;
    postJson(`${endpoint(accountId, id)}/usages`, {}).catch(() => undefined);
}

// getSortedCannedResponses của store gốc.
export function sortCannedResponses(items: CannedResponse[], sortOrder: CannedSortOrder): CannedResponse[] {
    return [...items].sort((a, b) =>
        sortOrder === 'asc' ? a.short_code.localeCompare(b.short_code) : b.short_code.localeCompare(a.short_code),
    );
}

// filteredRecords của routes/dashboard/settings/canned/Index.vue.
export function searchCannedResponses(items: CannedResponse[], searchQuery: string): CannedResponse[] {
    const query = searchQuery.trim();
    if (!query) return items;

    return picoSearch(items, query, [{ name: 'short_code', weight: 4 }, 'content']);
}

export function useCannedResponses(accountId: number): { records: CannedResponse[]; isFetching: boolean } {
    useEffect(() => fetchCannedResponses(accountId), [accountId]);

    return useSyncExternalStore(
        subscribe,
        () => cannedSnapshot(),
        () => cannedSnapshot(),
    );
}

// useSyncExternalStore đòi snapshot ổn định giữa hai lần notify.
let snapshot: { records: CannedResponse[]; isFetching: boolean } = { records: EMPTY_RECORDS, isFetching: false };

function cannedSnapshot(): { records: CannedResponse[]; isFetching: boolean } {
    if (snapshot.records !== records || snapshot.isFetching !== isFetchingList) {
        snapshot = { records, isFetching: isFetchingList };
    }
    return snapshot;
}
