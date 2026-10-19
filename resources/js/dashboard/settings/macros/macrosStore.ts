import { useEffect, useSyncExternalStore } from 'react';

import { deleteJson, getJson, postJson, putJson } from 'dashboard/helper/apiClient';
import type { Macro } from './types';
import type { MacroPayload } from './macroHelper';

// Port từ store/modules/macros.js + api/macros.js. Store vuex toàn cục → cache
// module-level + useSyncExternalStore, cùng khuôn với composables/useCannedResponses.ts:
// màn Settings, accordion Macros trong hội thoại và command bar đọc chung một
// danh sách, `macros/get` chỉ chạy một lần cho mỗi account.
const EMPTY_RECORDS: Macro[] = [];

let records: Macro[] = EMPTY_RECORDS;
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
    const base = `/api/v1/accounts/${accountId}/macros`;
    return id ? `${base}/${id}` : base;
}

// jbuilder gói mọi phản hồi macro trong `payload`.
interface MacroEnvelope<T> {
    payload: T;
}

const unwrap = <T,>(response: T | MacroEnvelope<T>): T =>
    response && typeof response === 'object' && 'payload' in (response as object)
        ? (response as MacroEnvelope<T>).payload
        : (response as T);

export function fetchMacros(accountId: number, { force = false } = {}): void {
    if (!accountId) return;
    if (pendingAccountId === accountId) return;
    if (!force && loadedAccountId === accountId) return;

    pendingAccountId = accountId;
    isFetchingList = true;
    notify();

    getJson<MacroEnvelope<Macro[]>>(endpoint(accountId))
        .then(response => {
            const payload = unwrap(response);
            records = Array.isArray(payload) ? payload : EMPTY_RECORDS;
            loadedAccountId = accountId;
        })
        .catch(() => undefined)
        .finally(() => {
            pendingAccountId = 0;
            isFetchingList = false;
            notify();
        });
}

export async function fetchMacro(accountId: number, id: number): Promise<Macro> {
    const macro = unwrap(await getJson<MacroEnvelope<Macro>>(endpoint(accountId, id)));
    records = records.some(record => record.id === macro.id)
        ? records.map(record => (record.id === macro.id ? macro : record))
        : [...records, macro];
    notify();
    return macro;
}

export async function createMacro(accountId: number, payload: MacroPayload): Promise<Macro> {
    const created = unwrap(await postJson<MacroEnvelope<Macro>>(endpoint(accountId), { ...payload }));
    records = [...records, created];
    notify();
    return created;
}

export async function updateMacro(accountId: number, id: number, payload: MacroPayload): Promise<Macro> {
    const updated = unwrap(await putJson<MacroEnvelope<Macro>>(endpoint(accountId, id), { ...payload }));
    records = records.map(record => (record.id === updated.id ? updated : record));
    notify();
    return updated;
}

export async function deleteMacro(accountId: number, id: number): Promise<void> {
    await deleteJson(endpoint(accountId, id));
    records = records.filter(record => record.id !== id);
    notify();
}

export async function executeMacro(accountId: number, id: number, conversationIds: number[]): Promise<void> {
    await postJson(`${endpoint(accountId, id)}/execute`, { conversation_ids: conversationIds });
}

export interface MacrosSnapshot {
    records: Macro[];
    isFetching: boolean;
}

// useSyncExternalStore đòi snapshot ổn định giữa hai lần notify.
let snapshot: MacrosSnapshot = { records: EMPTY_RECORDS, isFetching: false };

function macrosSnapshot(): MacrosSnapshot {
    if (snapshot.records !== records || snapshot.isFetching !== isFetchingList) {
        snapshot = { records, isFetching: isFetchingList };
    }
    return snapshot;
}

export function useMacros(accountId: number): MacrosSnapshot {
    useEffect(() => fetchMacros(accountId), [accountId]);

    return useSyncExternalStore(subscribe, macrosSnapshot, macrosSnapshot);
}

// Chỉ đọc danh sách đang có, không tự nạp — dùng cho command bar (gốc watch
// isMacrosAvailable rồi mới dispatch).
export function useMacrosSnapshot(): MacrosSnapshot {
    return useSyncExternalStore(subscribe, macrosSnapshot, macrosSnapshot);
}
