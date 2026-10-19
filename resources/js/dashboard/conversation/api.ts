import { deleteJson, getJson, patchJson, postForm, postJson } from 'dashboard/helper/apiClient';
import type { OutgoingMention } from 'dashboard/components/widgets/WootWriter/groupMemberMentions';
import type { ChatListTab, Conversation, ConversationListMeta, ConversationMessage, GroupMemberPerson, GroupRole } from './types';

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
    mentions?: OutgoingMention[];
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

export function sendMessage(chatId: number, { content, echoId, inReplyTo, mentions }: SendMessagePayload): Promise<ConversationMessage> {
    return postJson<ConversationMessage>(`${CHATS}/${chatId}/messages`, {
        content,
        echo_id: echoId,
        ...(inReplyTo ? { in_reply_to: inReplyTo } : {}),
        ...(mentions?.length ? { mentions } : {}),
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

export function createGroup({ title, userIds, avatar }: { title: string; userIds: number[]; avatar?: File | null }): Promise<Conversation> {
    const form = new FormData();
    form.set('title', title);
    userIds.forEach(id => form.append('user_ids[]', String(id)));
    if (avatar) form.set('avatar', avatar);
    return postForm<Conversation>(`${CHATS}/groups`, form);
}

export function updateGroup(chatId: number, changes: { title?: string; avatar?: File | null; removeAvatar?: boolean }): Promise<Conversation> {
    const form = new FormData();
    if (changes.title !== undefined) form.set('title', changes.title);
    if (changes.avatar) form.set('avatar', changes.avatar);
    if (changes.removeAvatar) form.set('remove_avatar', '1');
    return postForm<Conversation>(`${CHATS}/${chatId}/group`, form);
}

export function fetchGroupMembers(chatId: number): Promise<{ payload: GroupMemberPerson[] }> {
    return getJson<{ payload: GroupMemberPerson[] }>(`${CHATS}/${chatId}/members`);
}

export function addGroupMembers(chatId: number, userIds: number[]): Promise<{ skipped_count: number }> {
    return postJson<{ skipped_count: number }>(`${CHATS}/${chatId}/members`, { user_ids: userIds });
}

export function removeGroupMember(chatId: number, userId: number): Promise<void> {
    return deleteJson<void>(`${CHATS}/${chatId}/members/${userId}`);
}

export function changeGroupRole(chatId: number, userId: number, role: GroupRole): Promise<void> {
    return patchJson<void>(`${CHATS}/${chatId}/members/${userId}`, { role });
}

export function dissolveGroup(chatId: number): Promise<void> {
    return postJson<void>(`${CHATS}/${chatId}/dissolve`, {});
}

export function fetchInviteLink(chatId: number): Promise<{ url: string | null }> {
    return getJson<{ url: string | null }>(`${CHATS}/${chatId}/invite_link`);
}

export function rotateInviteLink(chatId: number): Promise<{ url: string }> {
    return postJson<{ url: string }>(`${CHATS}/${chatId}/invite_link`, {});
}

export function revokeInviteLink(chatId: number): Promise<void> {
    return deleteJson<void>(`${CHATS}/${chatId}/invite_link`);
}
