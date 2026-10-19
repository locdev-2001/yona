import { useEffect, useState } from 'react';

import { deleteJson, getJson, patchJson, postJson } from 'dashboard/helper/apiClient';

// Port từ store/modules/webhooks.js + api/webhooks.js. Chỉ màn Settings >
// Integrations > Webhooks đọc danh sách này nên giữ state ngay trong hook.

export interface Webhook {
    id: number;
    name: string | null;
    url: string;
    account_id: number;
    subscriptions: string[];
    secret?: string;
    inbox?: { id: number; name: string } | null;
}

export interface WebhookPayload {
    url: string;
    name: string;
    subscriptions: string[];
}

function endpoint(accountId: number, id?: number): string {
    const base = `/api/v1/accounts/${accountId}/webhooks`;
    return id ? `${base}/${id}` : base;
}

export async function createWebhook(accountId: number, webhook: WebhookPayload): Promise<Webhook> {
    const response = await postJson<{ payload: { webhook: Webhook } }>(endpoint(accountId), { webhook });
    return response.payload.webhook;
}

export async function updateWebhook(
    accountId: number,
    id: number,
    webhook: WebhookPayload,
): Promise<Webhook> {
    const response = await patchJson<{ payload: { webhook: Webhook } }>(endpoint(accountId, id), { webhook });
    return response.payload.webhook;
}

export async function deleteWebhook(accountId: number, id: number): Promise<void> {
    await deleteJson(endpoint(accountId, id));
}

export function useWebhooks(accountId: number): {
    webhooks: Webhook[];
    isFetching: boolean;
    reload: () => void;
} {
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [isFetching, setFetching] = useState(true);
    const [reloadToken, setReloadToken] = useState(0);

    useEffect(() => {
        setFetching(true);
        void getJson<{ payload: { webhooks: Webhook[] } }>(endpoint(accountId))
            // getWebhooks của store gốc sắp xếp theo id tăng dần.
            .then(response => setWebhooks([...(response?.payload?.webhooks ?? [])].sort((a, b) => a.id - b.id)))
            .catch(() => undefined)
            .finally(() => setFetching(false));
    }, [accountId, reloadToken]);

    return { webhooks, isFetching, reload: () => setReloadToken(token => token + 1) };
}
