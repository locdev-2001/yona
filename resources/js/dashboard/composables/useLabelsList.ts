import { useEffect, useSyncExternalStore } from 'react';

import { fetchAccountLabels } from '../conversation/labelApi';
import type { AccountLabel } from '../conversation/labelApi';
import { sortLabelsByTitle } from '../conversation/labelHelpers';

// Port từ store/modules/labels.js (state `records` + action `get` + getter `getLabels`).
// Store vuex toàn cục → cache module-level + useSyncExternalStore, cùng khuôn với
// composables/useAgentsList.ts: sidebar, thẻ hội thoại, LabelBox và thanh bulk
// đọc chung một danh sách, `labels/get` chỉ chạy một lần cho mỗi account.

const EMPTY_LABELS: AccountLabel[] = [];

let labelRecords: AccountLabel[] = EMPTY_LABELS;
let loadedAccountId = 0;
let pendingAccountId = 0;
const recordListeners = new Set<() => void>();

function notifyRecordListeners(): void {
    recordListeners.forEach(listener => listener());
}

function subscribeToRecords(listener: () => void): () => void {
    recordListeners.add(listener);
    return () => recordListeners.delete(listener);
}

export function fetchLabels(accountId: number, { force = false } = {}): void {
    if (!accountId) return;
    if (pendingAccountId === accountId) return;
    if (!force && loadedAccountId === accountId) return;

    pendingAccountId = accountId;

    fetchAccountLabels(accountId)
        .then(labels => {
            labelRecords = sortLabelsByTitle(labels);
            loadedAccountId = accountId;
            notifyRecordListeners();
        })
        .catch(() => undefined)
        .finally(() => {
            pendingAccountId = 0;
        });
}

// Dùng sau khi màn Settings → Labels tạo/sửa/xóa nhãn: buộc nạp lại danh sách chung.
export function invalidateLabels(accountId: number): void {
    loadedAccountId = 0;
    fetchLabels(accountId);
}

export function useLabelsList(accountId: number): AccountLabel[] {
    useEffect(() => fetchLabels(accountId), [accountId]);

    return useSyncExternalStore(subscribeToRecords, () => labelRecords);
}
