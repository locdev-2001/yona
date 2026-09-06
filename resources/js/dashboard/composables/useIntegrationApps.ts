import { useEffect, useSyncExternalStore } from 'react';

import { getJson } from 'dashboard/helper/apiClient';

// Port từ store/modules/integrations.js + api/integrations.js (phần danh mục app).
// Ba màn đọc chung danh sách: Settings > Integrations, trang chi tiết một app và
// header của Webhooks — nên cache ở module thay vì fetch lại mỗi màn.

export interface IntegrationHook {
    id: number;
    app_id: string;
    status: boolean;
    inbox?: { id: number; name: string } | null;
    account_id: number;
    hook_type: string;
    settings?: Record<string, string | number | boolean>;
    reference_id?: string | null;
}

export interface IntegrationFormField {
    label: string;
    name: string;
    type: string;
    help?: string;
    default?: string;
    validation?: string;
    options?: { label: string; value: string }[];
}

export interface IntegrationApp {
    id: string;
    name: string;
    description: string;
    short_description: string | null;
    enabled: boolean;
    logo?: string;
    action?: string | null;
    hook_type?: string;
    allow_multiple_hooks?: boolean;
    visible_properties?: string[];
    settings_form_schema?: IntegrationFormField[];
    hooks: IntegrationHook[];
}

const EMPTY_APPS: IntegrationApp[] = [];

let records: IntegrationApp[] = EMPTY_APPS;
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

function endpoint(accountId: number): string {
    return `/api/v1/accounts/${accountId}/integrations/apps`;
}

export function fetchIntegrationApps(accountId: number, { force = false } = {}): void {
    if (!accountId) return;
    if (pendingAccountId === accountId) return;
    if (!force && loadedAccountId === accountId) return;

    pendingAccountId = accountId;
    isFetching = true;
    notify();

    getJson<{ payload: IntegrationApp[] }>(endpoint(accountId))
        .then(response => {
            records = response?.payload ?? EMPTY_APPS;
            loadedAccountId = accountId;
        })
        .catch(() => undefined)
        .finally(() => {
            pendingAccountId = 0;
            isFetching = false;
            notify();
        });
}

// getters['integrations/getIntegration'] của store gốc.
export function findIntegrationApp(items: IntegrationApp[], appId: string): IntegrationApp | null {
    return items.find(item => item.id === appId) ?? null;
}

let snapshot: { apps: IntegrationApp[]; isFetching: boolean } = { apps: EMPTY_APPS, isFetching: false };

function appsSnapshot(): { apps: IntegrationApp[]; isFetching: boolean } {
    if (snapshot.apps !== records || snapshot.isFetching !== isFetching) {
        snapshot = { apps: records, isFetching };
    }
    return snapshot;
}

export function useIntegrationApps(accountId: number): { apps: IntegrationApp[]; isFetching: boolean } {
    useEffect(() => fetchIntegrationApps(accountId), [accountId]);

    return useSyncExternalStore(subscribe, appsSnapshot, appsSnapshot);
}
