import type { Conversation, ConversationPriority, ConversationStatus } from './types';

// Mutation vòng đời conversation của store gốc (CHANGE_CONVERSATION_STATUS /
// ASSIGN_PRIORITY / MUTE_CONVERSATION / UNMUTE_CONVERSATION) dưới dạng thuần.

function patchConversation(
    conversations: Conversation[],
    conversationId: number,
    patch: Partial<Conversation>,
): Conversation[] {
    return conversations.map(item => (item.id === conversationId ? { ...item, ...patch } : item));
}

export function applyConversationStatus(
    conversations: Conversation[],
    conversationId: number,
    status: ConversationStatus,
    snoozedUntil: string | null,
): Conversation[] {
    return patchConversation(conversations, conversationId, { status, snoozed_until: snoozedUntil });
}

export function snoozedUntilForStatus(status: ConversationStatus, snoozedUntil: number | null): string | null {
    if (status !== 'snoozed' || snoozedUntil === null) return null;

    return new Date(snoozedUntil * 1000).toISOString();
}

export function applyConversationPriority(
    conversations: Conversation[],
    conversationId: number,
    priority: ConversationPriority | null,
): Conversation[] {
    return patchConversation(conversations, conversationId, { priority });
}

export function applyConversationMuted(
    conversations: Conversation[],
    conversationId: number,
    muted: boolean,
): Conversation[] {
    return patchConversation(conversations, conversationId, { muted });
}

export function applyConversationPinned(
    conversations: Conversation[],
    conversationId: number,
    pinned: boolean,
): Conversation[] {
    return patchConversation(conversations, conversationId, { pinned });
}
