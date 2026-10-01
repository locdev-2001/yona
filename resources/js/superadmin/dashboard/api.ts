import { xsrfToken } from 'dashboard/helper/apiClient';

import type { LayoutItem, RangePreset, WidgetResponse } from './types';

export class DashboardRequestError extends Error {
    constructor(public status: number) {
        super(`Request failed: ${status}`);
    }
}

// Console chạy trên guard `super_admin`: không đi qua apiClient của dashboard vì
// nó hồi phiên bằng API của agent.
async function send<T>(url: string, method: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    const response = await fetch(url, {
        method,
        signal,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': xsrfToken(),
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
        throw new DashboardRequestError(response.status);
    }

    return (await response.json()) as T;
}

export function fetchWidget<T>(
    endpoint: string,
    key: string,
    range: RangePreset,
    { signal, fresh = false }: { signal?: AbortSignal; fresh?: boolean } = {},
) {
    const query = new URLSearchParams({ range, ...(fresh ? { fresh: '1' } : {}) });

    return send<WidgetResponse<T>>(`${endpoint}/${encodeURIComponent(key)}?${query}`, 'GET', undefined, signal);
}

export async function saveLayout(endpoint: string, layout: LayoutItem[]): Promise<LayoutItem[]> {
    return (await send<{ layout: LayoutItem[] }>(endpoint, 'PUT', { layout })).layout;
}

export async function resetLayout(endpoint: string): Promise<LayoutItem[]> {
    return (await send<{ layout: LayoutItem[] }>(endpoint, 'DELETE')).layout;
}
