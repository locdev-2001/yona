import { getJson, postJson } from '../helper/apiClient';
import type { Label } from 'dashboard/settings/labels/types';

// Port từ dashboard/api/labels.js + api/conversations.js#getLabels/updateLabels.
// Contract backend: plans/260831-rewrite-chatwoot-laravel/reports/b7-notes-be.md.

// Payload nhãn chỉ khai báo một chỗ (màn Settings → Labels dựng theo jbuilder gốc);
// đổi tên ở đây để call-site không lẫn với component chip `Label`.
export type AccountLabel = Label;

export function fetchAccountLabels(accountId: number): Promise<AccountLabel[]> {
    return getJson<{ payload: AccountLabel[] }>(`/api/v1/accounts/${accountId}/labels`).then(
        response => response.payload || [],
    );
}

export function fetchConversationLabels(accountId: number, conversationId: number): Promise<string[]> {
    return getJson<{ payload: string[] }>(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`,
    ).then(response => response.payload || []);
}

// POST thay TOÀN BỘ danh sách nhãn của hội thoại (update_labels gốc), trả danh sách sau khi lưu.
export function updateConversationLabels(
    accountId: number,
    conversationId: number,
    labels: string[],
): Promise<string[]> {
    return postJson<{ payload: string[] }>(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`,
        { labels },
    ).then(response => response.payload || []);
}
