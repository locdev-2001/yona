import { getJson, postJson } from '../helper/apiClient';
import type { Conversation, ConversationListMeta, ConversationMessage, ContactMeta } from './types';

// Endpoint dashboard API của Chatwoot (web_api session) — xem ConversationsController.

interface ConversationListResponse {
    data: {
        meta: ConversationListMeta;
        payload: Conversation[];
    };
}

interface MessagesResponse {
    meta: {
        labels: string[];
        additional_attributes: Record<string, unknown>;
        contact: ContactMeta;
        agent_last_seen_at: string | null;
        assignee_last_seen_at: string | null;
    };
    payload: ConversationMessage[];
}

export interface FetchConversationsParams {
    accountId: number;
    assigneeType: string;
    status: string;
    page: number;
    sortBy: string;
    inboxId?: number;
    teamId?: number;
    updatedWithin?: number;
}

export function fetchConversations(params: FetchConversationsParams): Promise<ConversationListResponse> {
    const query = new URLSearchParams({
        assignee_type: params.assigneeType,
        status: params.status,
        page: String(params.page),
        sort_by: params.sortBy,
    });
    if (params.inboxId) {
        query.set('inbox_id', String(params.inboxId));
    }
    if (params.teamId) {
        query.set('team_id', String(params.teamId));
    }
    if (params.updatedWithin) {
        query.set('updated_within', String(params.updatedWithin));
    }

    return getJson(`/api/v1/accounts/${params.accountId}/conversations?${query.toString()}`);
}

export function fetchConversationMeta(
    params: Omit<FetchConversationsParams, 'page'>,
): Promise<{ meta: ConversationListMeta }> {
    const query = new URLSearchParams({
        assignee_type: params.assigneeType,
        status: params.status,
        sort_by: params.sortBy,
    });
    if (params.inboxId) {
        query.set('inbox_id', String(params.inboxId));
    }
    if (params.teamId) {
        query.set('team_id', String(params.teamId));
    }

    return getJson(`/api/v1/accounts/${params.accountId}/conversations/meta?${query.toString()}`);
}

export function fetchConversation(accountId: number, conversationId: number): Promise<Conversation> {
    return getJson(`/api/v1/accounts/${accountId}/conversations/${conversationId}`);
}

// getPreviousMessages gốc: `after` chỉ gửi khi khác `before`.
export function fetchMessages(
    accountId: number,
    conversationId: number,
    before?: number,
    after?: number,
): Promise<MessagesResponse> {
    const query = new URLSearchParams();
    if (before) {
        query.set('before', String(before));
    }
    if (after && Number(after) !== Number(before)) {
        query.set('after', String(after));
    }
    const suffix = query.size ? `?${query.toString()}` : '';
    return getJson(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages${suffix}`);
}

export function toggleTyping(
    accountId: number,
    conversationId: number,
    status: 'on' | 'off',
    isPrivate: boolean,
): Promise<unknown> {
    return postJson(`/api/v1/accounts/${accountId}/conversations/${conversationId}/toggle_typing_status`, {
        typing_status: status,
        is_private: isPrivate,
    });
}

export interface SendMessagePayload {
    content: string;
    private: boolean;
    echo_id?: string;
    content_attributes?: Record<string, unknown>;
}

export function sendMessage(
    accountId: number,
    conversationId: number,
    payload: SendMessagePayload,
): Promise<ConversationMessage> {
    return postJson(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
        ...payload,
    });
}
