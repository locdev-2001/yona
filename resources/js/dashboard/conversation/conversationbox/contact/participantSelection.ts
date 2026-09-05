import type { AgentMeta } from '../../types';

const MAX_THUMBNAIL_COUNT = 4;

// Phần thuần của ConversationParticipant.vue: bật/tắt một agent trong danh sách,
// đếm phần dư sau 4 avatar đầu.
export function toggleParticipant(participants: AgentMeta[], agent: AgentMeta): AgentMeta[] {
    const isSelected = participants.some(participant => participant.id === agent.id);
    if (isSelected) return participants.filter(participant => participant.id !== agent.id);

    return [...participants, agent];
}

export function thumbnailParticipants(participants: AgentMeta[]): AgentMeta[] {
    return participants.slice(0, MAX_THUMBNAIL_COUNT);
}

export function remainingParticipantCount(participants: AgentMeta[]): number {
    return participants.length - MAX_THUMBNAIL_COUNT;
}

export function isParticipating(participants: AgentMeta[], userId: number): boolean {
    return participants.some(participant => participant.id === userId);
}
