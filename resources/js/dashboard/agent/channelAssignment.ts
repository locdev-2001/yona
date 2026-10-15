import type { AiAgent, AiAgentInbox } from './types';

// Đổi AI của một kênh cần hỏi gì trước khi lưu. Một chỗ quyết định cho cả bảng
// "AI của từng kênh" lẫn ô chọn kênh trong ngăn tạo/sửa.
export type AssignmentConfirmation =
    | { kind: 'none' }
    | { kind: 'replace'; inbox: AiAgentInbox; current: AiAgent }
    | { kind: 'remove'; inbox: AiAgentInbox; current: AiAgent };

/**
 * Bảng kênh hỏi khi kênh đang có hội thoại tự động; ngăn tạo/sửa hỏi mọi lần lấy
 * kênh của AI khác (`requireOnTakeover`), vì người dùng có thể chưa biết kênh đã có AI.
 */
export function assignmentConfirmation(
    inbox: AiAgentInbox,
    nextAiAgentId: number | null,
    aiAgents: AiAgent[],
    { requireOnTakeover = false }: { requireOnTakeover?: boolean } = {},
): AssignmentConfirmation {
    const current = aiAgents.find(aiAgent => aiAgent.id === inbox.ai_agent_id);
    if (!current || current.id === nextAiAgentId) return { kind: 'none' };

    const hasAutoReplies = inbox.auto_reply_conversations_count > 0;

    if (nextAiAgentId === null) {
        return hasAutoReplies ? { kind: 'remove', inbox, current } : { kind: 'none' };
    }

    return hasAutoReplies || requireOnTakeover ? { kind: 'replace', inbox, current } : { kind: 'none' };
}

// Ghi nhận kết quả gắn kênh vào bản sao cục bộ: AI cũ mất kênh, AI mới có kênh.
export function applyInboxAssignment(
    aiAgents: AiAgent[],
    inboxes: AiAgentInbox[],
    inboxId: number,
    aiAgentId: number | null,
): { aiAgents: AiAgent[]; inboxes: AiAgentInbox[] } {
    return {
        inboxes: inboxes.map(inbox => (inbox.id === inboxId ? { ...inbox, ai_agent_id: aiAgentId } : inbox)),
        aiAgents: aiAgents.map(aiAgent => {
            const without = aiAgent.inbox_ids.filter(id => id !== inboxId);
            const inboxIds = aiAgent.id === aiAgentId ? [...without, inboxId].sort((a, b) => a - b) : without;

            return inboxIds.length === aiAgent.inbox_ids.length && inboxIds.every((id, index) => id === aiAgent.inbox_ids[index])
                ? aiAgent
                : { ...aiAgent, inbox_ids: inboxIds };
        }),
    };
}

// Sau khi lưu một AI: mọi kênh trong danh sách thuộc AI đó, kênh bị bỏ về trống.
export function applySavedAiAgent(
    aiAgents: AiAgent[],
    inboxes: AiAgentInbox[],
    saved: AiAgent,
): { aiAgents: AiAgent[]; inboxes: AiAgentInbox[] } {
    const owned = new Set(saved.inbox_ids);
    const exists = aiAgents.some(aiAgent => aiAgent.id === saved.id);

    return {
        inboxes: inboxes.map(inbox => {
            if (owned.has(inbox.id)) return { ...inbox, ai_agent_id: saved.id };
            return inbox.ai_agent_id === saved.id ? { ...inbox, ai_agent_id: null } : inbox;
        }),
        aiAgents: [
            ...aiAgents.map(aiAgent =>
                aiAgent.id === saved.id ? saved : { ...aiAgent, inbox_ids: aiAgent.inbox_ids.filter(id => !owned.has(id)) },
            ),
            ...(exists ? [] : [saved]),
        ],
    };
}
