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

    return getJson(`/api/v1/accounts/${params.accountId}/conversations?${query.toString()}`);
}

export function fetchConversation(accountId: number, conversationId: number): Promise<Conversation> {
    return getJson(`/api/v1/accounts/${accountId}/conversations/${conversationId}`);
}

export function fetchMessages(
    accountId: number,
    conversationId: number,
    before?: number,
): Promise<MessagesResponse> {
    const query = before ? `?before=${before}` : '';
    return getJson(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages${query}`);
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
