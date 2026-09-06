import { useEffect, useSyncExternalStore } from 'react';

import { getJson } from 'dashboard/helper/apiClient';
import type { OverviewAgent } from '../components/overview/AgentTable';
import type { OverviewTeam } from '../components/overview/TeamTable';

// Thay `agents/get`, `teams/get`, `inboxes/get` của vuex: một ô nhớ cấp module
// dùng chung cho mọi màn báo cáo, chỉ gọi API một lần cho mỗi tài khoản.

export interface OverviewInbox {
    id: number;
    name: string;
}

export interface OverviewLabel {
    id: number;
    title: string;
}

interface DirectoryState {
    agents: OverviewAgent[];
    teams: OverviewTeam[];
    inboxes: OverviewInbox[];
    labels: OverviewLabel[];
}

const EMPTY: DirectoryState = { agents: [], teams: [], inboxes: [], labels: [] };

let directory: DirectoryState = EMPTY;
const listeners = new Set<() => void>();
const loaded = new Set<string>();

function notify(): void {
    listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export type DirectoryScope = 'agents' | 'teams' | 'inboxes' | 'labels';

function fetchScope(accountId: number, scope: DirectoryScope): void {
    const key = `${accountId}:${scope}`;
    if (loaded.has(key)) return;
    loaded.add(key);

    const url = `/api/v1/accounts/${accountId}/${scope}`;
    void getJson<unknown>(url)
        .then(response => {
            const payload = (response as { payload?: unknown[] })?.payload ?? response;
            directory = { ...directory, [scope]: Array.isArray(payload) ? payload : [] };
            notify();
        })
        .catch(() => {
            loaded.delete(key);
        });
}

export function useAccountDirectory(accountId: number, scopes: DirectoryScope[]): DirectoryState {
    const scopeKey = scopes.join(',');
    useEffect(() => {
        scopeKey.split(',').forEach(scope => fetchScope(accountId, scope as DirectoryScope));
    }, [accountId, scopeKey]);

    return useSyncExternalStore(
        subscribe,
        () => directory,
        () => directory,
    );
}

// Chỉ dùng cho test.
export function resetAccountDirectory(): void {
    directory = EMPTY;
    loaded.clear();
    notify();
}
