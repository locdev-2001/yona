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

// Ghim mới đứng đầu nhóm ghim, khớp cách máy chủ cấp vị trí.
export function applyConversationPinned(
    conversations: Conversation[],
    conversationId: number,
    pinned: boolean,
): Conversation[] {
    const pinPosition = pinned ? topPinPosition(conversations) : null;

    return patchConversation(conversations, conversationId, { pinned, pin_position: pinPosition });
}

export function applyPinState(
    conversations: Conversation[],
    conversationId: number,
    pinState: Pick<Conversation, 'pinned' | 'pin_position'>,
): Conversation[] {
    return patchConversation(conversations, conversationId, pinState);
}

function topPinPosition(conversations: Conversation[]): number {
    const positions = conversations.flatMap(item => (item.pinned && typeof item.pin_position === 'number' ? [item.pin_position] : []));

    return positions.length ? Math.min(...positions) - 1 : -1;
}

/**
 * Vị trí mới khi các hội thoại ghim cho sẵn xếp lại theo `orderedIds`: chúng đổi
 * chỗ trong đúng những ô đang chiếm (như máy chủ), nên ghim không hiện ở danh sách
 * này giữ nguyên chỗ.
 */
export function pinPositionsForOrder(conversations: Conversation[], orderedIds: number[]): Map<number, number> {
    const positionsById = new Map(conversations.map(item => [item.id, item.pin_position]));
    const slots = orderedIds.map(id => positionsById.get(id));
    const sortedSlots = slots.every((slot): slot is number => typeof slot === 'number')
        ? [...slots].sort((a, b) => a - b)
        : orderedIds.map((_, index) => index);

    return new Map(orderedIds.map((id, index) => [id, sortedSlots[index]]));
}

export function applyPinPositions(conversations: Conversation[], positions: Map<number, number | null>): Conversation[] {
    return conversations.map(item =>
        positions.has(item.id) ? { ...item, pin_position: positions.get(item.id) ?? null } : item,
    );
}

/** Đổi chỗ một hội thoại trong danh sách mã theo thứ tự hiện tại; vị trí đích kẹp trong biên. */
export function moveId(orderedIds: number[], movedId: number, targetIndex: number): number[] {
    const fromIndex = orderedIds.indexOf(movedId);
    if (fromIndex === -1) return orderedIds;

    const clampedTarget = Math.max(0, Math.min(orderedIds.length - 1, targetIndex));
    const next = orderedIds.filter(id => id !== movedId);
    next.splice(clampedTarget, 0, movedId);

    return next;
}
