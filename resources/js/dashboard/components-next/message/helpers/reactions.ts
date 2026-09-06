// Hình dạng chuẩn của `content_attributes.reactions` (reports/zalo-lo4-notes.md §2.4):
// `{ emoji, by, at }`, `by` = `agent:<user_id>` / `agent:self` khi phía tenant thả,
// `external_id` của khách với phần còn lại. Bản ghi cũ là mảng emoji phẳng —
// backend nâng cấp lúc đọc, FE vẫn đọc phòng thủ cả hai.

export interface MessageReaction {
    emoji: string;
    by: string;
}

export interface ReactionGroup {
    emoji: string;
    count: number;
    /** Phía tenant (agent Yona hoặc chính tài khoản kênh của tenant) đã thả emoji này. */
    reactedBySelf: boolean;
}

const AGENT_PREFIX = 'agent';

function isAgentReaction(by: string): boolean {
    return by === AGENT_PREFIX || by.startsWith(`${AGENT_PREFIX}:`);
}

export function readReactions(contentAttributes: Record<string, unknown>): MessageReaction[] {
    const raw = contentAttributes.reactions;
    if (!Array.isArray(raw)) return [];

    return raw.flatMap(item => {
        if (typeof item === 'string') return item ? [{ emoji: item, by: 'unknown' }] : [];
        if (!item || typeof item !== 'object') return [];

        const { emoji, by } = item as Record<string, unknown>;
        if (typeof emoji !== 'string' || !emoji) return [];

        return [{ emoji, by: typeof by === 'string' ? by : 'unknown' }];
    });
}

/** Gom theo emoji + đếm, giữ thứ tự xuất hiện đầu tiên như Zalo/Messenger. */
export function groupReactions(reactions: MessageReaction[]): ReactionGroup[] {
    const groups = new Map<string, ReactionGroup>();

    reactions.forEach(({ emoji, by }) => {
        const group = groups.get(emoji) ?? { emoji, count: 0, reactedBySelf: false };
        group.count += 1;
        group.reactedBySelf = group.reactedBySelf || isAgentReaction(by);
        groups.set(emoji, group);
    });

    return [...groups.values()];
}

/** Bộ chọn nhanh giống Zalo; "một người giữ đúng một emoji" nên bấm lại là gỡ. */
export const QUICK_REACTIONS = ['❤️', '👍', '😆', '😮', '😢', '😡'] as const;
