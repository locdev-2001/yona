import { getJson, postJson } from 'dashboard/helper/apiClient';

import type { ConversationMessage } from './types';

// Hợp đồng của GET …/messages/{id}/forward_targets và POST …/messages/{id}/forward.
// `forwardable`/`reason` do máy chủ quyết cho từng đích; FE chỉ hiển thị.

export interface ForwardTarget {
    id: number;
    status: string;
    last_activity_at: number | null;
    // channel_type chỉ dùng để chọn icon kênh.
    inbox: { id: number; channel_id?: number; name: string; channel_type: string };
    contact: { id?: number; name?: string | null; thumbnail?: string; phone_number?: string | null };
    forwardable: boolean;
    code: string | null;
    reason: string | null;
    missing_capabilities: string[];
}

export interface ForwardTargetsResponse {
    max_targets: number;
    payload: ForwardTarget[];
}

export interface ForwardResult {
    conversation_id: number;
    ok: boolean;
    message?: ConversationMessage;
    code?: string;
    error?: string;
}

function forwardUrl(accountId: number, conversationId: number, messageId: number, action: string): string {
    return `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}/${action}`;
}

export function fetchForwardTargets(
    accountId: number,
    conversationId: number,
    messageId: number,
    q: string,
): Promise<ForwardTargetsResponse> {
    const query = q.trim();
    const suffix = query ? `?${new URLSearchParams({ q: query }).toString()}` : '';

    return getJson<ForwardTargetsResponse>(`${forwardUrl(accountId, conversationId, messageId, 'forward_targets')}${suffix}`);
}

export async function forwardMessage(
    accountId: number,
    conversationId: number,
    messageId: number,
    conversationIds: number[],
): Promise<ForwardResult[]> {
    const response = await postJson<{ payload: ForwardResult[] }>(forwardUrl(accountId, conversationId, messageId, 'forward'), {
        conversation_ids: conversationIds,
    });

    return Array.isArray(response?.payload) ? response.payload : [];
}
