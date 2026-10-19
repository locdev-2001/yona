import { useEffect, useSyncExternalStore } from 'react';

import { getJson } from 'dashboard/helper/apiClient';
import type { DashboardApp } from 'dashboard/settings/integrations/DashboardApps/types';

// Port từ store/modules/dashboardApps.js + api/dashboardApps.js. Khung hội thoại
// nạp danh sách này mỗi lần mở, nên cache ở module thay vì fetch lại từng lần
// (cùng khuôn với useIntegrationApps).

const EMPTY_APPS: DashboardApp[] = [];

let records: DashboardApp[] = EMPTY_APPS;
let isFetching = false;
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

export function fetchDashboardApps(accountId: number, { force = false } = {}): void {
    if (!accountId) return;
    if (pendingAccountId === accountId) return;
    if (!force && loadedAccountId === accountId) return;

    pendingAccountId = accountId;
    isFetching = true;
    notify();

    getJson<DashboardApp[]>(`/api/v1/accounts/${accountId}/dashboard_apps`)
        .then(response => {
            records = Array.isArray(response) ? response : EMPTY_APPS;
            loadedAccountId = accountId;
        })
        .catch(() => undefined)
        .finally(() => {
            pendingAccountId = 0;
            isFetching = false;
            notify();
        });
}

let snapshot: { apps: DashboardApp[]; isFetching: boolean } = { apps: EMPTY_APPS, isFetching: false };

function appsSnapshot(): { apps: DashboardApp[]; isFetching: boolean } {
    if (snapshot.apps !== records || snapshot.isFetching !== isFetching) {
        snapshot = { apps: records, isFetching };
    }
    return snapshot;
}

// ConversationBox.vue gọi `dashboardApps/get` mỗi lần mount nên bản port cũng nạp
// lại khi mount (cache chỉ chặn hai lượt nạp chồng nhau trong cùng một lần).
export function useDashboardApps(accountId: number): { apps: DashboardApp[]; isFetching: boolean } {
    useEffect(() => fetchDashboardApps(accountId, { force: true }), [accountId]);

    return useSyncExternalStore(subscribe, appsSnapshot, appsSnapshot);
}
