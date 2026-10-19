import { deleteJson, getJson, patchJson, postJson } from 'dashboard/helper/apiClient';

import type { AgentMeta, ContactMeta, Conversation } from './types';

// Mặt tiền API cho panel contact bên phải — gom mọi endpoint mà ContactPanel
// dùng vào một chỗ (tương đương api/inbox/conversation.js + api/contactNotes.js
// + api/contacts.js + api/accountActions.js). Đính kèm của hội thoại
// nằm ở conversation/api.ts vì đó là dữ liệu mức hội thoại, không riêng panel.
const accountUrl = (accountId: number): string => `/api/v1/accounts/${accountId}`;

export interface ContactNote {
    id: number;
    content: string;
    created_at: number;
    updated_at?: number;
    user?: AgentMeta | null;
}

export function fetchParticipants(accountId: number, conversationId: number): Promise<AgentMeta[]> {
    return getJson<AgentMeta[]>(`${accountUrl(accountId)}/conversations/${conversationId}/participants`);
}

export function updateParticipants(
    accountId: number,
    conversationId: number,
    userIds: number[],
): Promise<AgentMeta[]> {
    return patchJson<AgentMeta[]>(`${accountUrl(accountId)}/conversations/${conversationId}/participants`, {
        user_ids: userIds,
    });
}

export function fetchContactConversations(accountId: number, contactId: number): Promise<Conversation[]> {
    return getJson<{ payload?: Conversation[] }>(
        `${accountUrl(accountId)}/contacts/${contactId}/conversations`,
    ).then(response => response.payload ?? []);
}

export function fetchContactNotes(accountId: number, contactId: number): Promise<ContactNote[]> {
    return getJson<ContactNote[]>(`${accountUrl(accountId)}/contacts/${contactId}/notes`);
}

export function createContactNote(accountId: number, contactId: number, content: string): Promise<ContactNote> {
    return postJson<ContactNote>(`${accountUrl(accountId)}/contacts/${contactId}/notes`, { content });
}

export function deleteContactNote(accountId: number, contactId: number, noteId: number): Promise<void> {
    return deleteJson<void>(`${accountUrl(accountId)}/contacts/${contactId}/notes/${noteId}`);
}

// POST /actions/contact_merge — base giữ lại, mergee bị gộp rồi xóa.
export function mergeContacts(
    accountId: number,
    baseContactId: number,
    mergeeContactId: number,
): Promise<ContactMeta> {
    return postJson<ContactMeta>(`${accountUrl(accountId)}/actions/contact_merge`, {
        base_contact_id: baseContactId,
        mergee_contact_id: mergeeContactId,
    });
}
