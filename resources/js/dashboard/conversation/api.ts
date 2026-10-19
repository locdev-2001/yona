import { deleteJson, getJson, postJson } from 'dashboard/helper/apiClient';
import type { ChatListTab, Conversation, ConversationListMeta, ConversationMessage } from './types';

// Một chỗ duy nhất gọi API nhắn tin (/api/v1/chats…). Giao diện không tự dựng URL.
const CHATS = '/api/v1/chats';

export interface ChatListResponse {
    payload: Conversation[];
    meta: ConversationListMeta;
}

export interface MessagePageResponse {
    payload: ConversationMessage[];
    meta: { has_more: boolean };
}

export interface SendMessagePayload {
    content: string;
    echoId: string;
    inReplyTo?: number | null;
}

export type AbuseReason = 'spam' | 'harassment' | 'inappropriate' | 'scam' | 'other';

export function fetchChats(tab: ChatListTab, before?: number): Promise<ChatListResponse> {
    const query = new URLSearchParams({ tab, ...(before ? { before: String(before) } : {}) });
    return getJson<ChatListResponse>(`${CHATS}?${query}`);
}

export function fetchChat(chatId: number): Promise<Conversation> {
    return getJson<Conversation>(`${CHATS}/${chatId}`);
}

export function openDirectChat(userId: number): Promise<Conversation> {
    return postJson<Conversation>(`${CHATS}/direct`, { user_id: userId });
}

export function fetchMessages(chatId: number, before?: number): Promise<MessagePageResponse> {
    return getJson<MessagePageResponse>(`${CHATS}/${chatId}/messages${before ? `?before=${before}` : ''}`);
}

export function sendMessage(chatId: number, { content, echoId, inReplyTo }: SendMessagePayload): Promise<ConversationMessage> {
    return postJson<ConversationMessage>(`${CHATS}/${chatId}/messages`, {
        content,
        echo_id: echoId,
        ...(inReplyTo ? { in_reply_to: inReplyTo } : {}),
    });
}

export function markChatRead(chatId: number, messageId?: number | null): Promise<void> {
    return postJson<void>(`${CHATS}/${chatId}/read`, messageId ? { message_id: messageId } : {});
}

export function toggleTyping(chatId: number, typing: boolean): Promise<void> {
    return postJson<void>(`${CHATS}/${chatId}/typing`, { typing });
}

export function acceptChat(chatId: number): Promise<Conversation> {
    return postJson<Conversation>(`${CHATS}/${chatId}/accept`, {});
}

export function removeChat(chatId: number): Promise<void> {
    return deleteJson<void>(`${CHATS}/${chatId}`);
}

export function blockUser(userId: number): Promise<void> {
    return postJson<void>('/api/v1/blocks', { user_id: userId });
}

export function unblockUser(userId: number): Promise<void> {
    return deleteJson<void>(`/api/v1/blocks/${userId}`);
}

export function reportAbuse(report: { type: 'user' | 'chat' | 'message'; id: number; reason: AbuseReason; note?: string }): Promise<void> {
    return postJson<void>('/api/v1/abuse_reports', report);
}
