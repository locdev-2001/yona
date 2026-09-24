// Hình dạng chuẩn của `content_attributes.reactions` (reports/zalo-lo4-notes.md §2.4):
// `{ emoji, by, at }`, `by` = `agent:<user_id>` / `agent:self` khi phía tenant thả,
// `external_id` của khách với phần còn lại. Bản ghi cũ là mảng emoji phẳng —
// backend nâng cấp lúc đọc, FE vẫn đọc phòng thủ cả hai.

import type { ConversationMessage } from 'dashboard/conversation/types';
import { MESSAGE_TYPES } from '../constants';
import { readGroupSender } from './groupSender';

export interface MessageReaction {
    emoji: string;
    by: string;
}

export interface ReactionGroup {
    emoji: string;
    count: number;
    /** Phía tenant (agent Yona hoặc chính tài khoản kênh của tenant) đã thả emoji này. */
    reactedBySelf: boolean;
    /** Giá trị `by` của từng lượt thả, theo thứ tự. */
    reactedBy: string[];
}

export interface ReactionSummary {
    /** Tối đa ba emoji nhiều lượt nhất, hiện trên viên cảm xúc. */
    topEmojis: string[];
    total: number;
}

const AGENT_PREFIX = 'agent';
const UNKNOWN_REACTOR = 'unknown';
export const REACTION_SUMMARY_MAX_EMOJIS = 3;

export function isAgentReaction(by: string): boolean {
    return by === AGENT_PREFIX || by.startsWith(`${AGENT_PREFIX}:`);
}

export function readReactions(contentAttributes: Record<string, unknown>): MessageReaction[] {
    const raw = contentAttributes.reactions;
    if (!Array.isArray(raw)) return [];

    return raw.flatMap(item => {
        if (typeof item === 'string') return item ? [{ emoji: item, by: UNKNOWN_REACTOR }] : [];
        if (!item || typeof item !== 'object') return [];

        const { emoji, by } = item as Record<string, unknown>;
        if (typeof emoji !== 'string' || !emoji) return [];

        return [{ emoji, by: typeof by === 'string' && by ? by : UNKNOWN_REACTOR }];
    });
}

/** Gom theo emoji + đếm, giữ thứ tự xuất hiện đầu tiên như Zalo/Messenger. */
export function groupReactions(reactions: MessageReaction[]): ReactionGroup[] {
    const groups = new Map<string, ReactionGroup>();

    reactions.forEach(({ emoji, by }) => {
        const group = groups.get(emoji) ?? { emoji, count: 0, reactedBySelf: false, reactedBy: [] };
        group.count += 1;
        group.reactedBySelf = group.reactedBySelf || isAgentReaction(by);
        group.reactedBy.push(by);
        groups.set(emoji, group);
    });

    return [...groups.values()];
}

/** Viên cảm xúc: emoji nhiều lượt nhất đứng trước, hoà thì giữ thứ tự xuất hiện. */
export function summarizeReactions(groups: ReactionGroup[]): ReactionSummary {
    const topEmojis = groups
        .map((group, order) => ({ group, order }))
        .sort((left, right) => right.group.count - left.group.count || left.order - right.order)
        .slice(0, REACTION_SUMMARY_MAX_EMOJIS)
        .map(({ group }) => group.emoji);

    return { topEmojis, total: groups.reduce((sum, group) => sum + group.count, 0) };
}

/**
 * Tên người thả cảm xúc phía khách: tin nhóm mang người gửi thật (`external_id`
 * trùng với `by`); hội thoại một-một chỉ có một người phía khách nên lấy tên
 * liên hệ. Không đoán được thì trả null — danh sách chỉ hiện emoji và số.
 */
export function createReactorNameResolver(messages: readonly ConversationMessage[]): (by: string) => string | null {
    const groupMemberNames = new Map<string, string>();
    let contactName: string | null = null;

    messages.forEach(message => {
        const groupSender = readGroupSender(message.content_attributes ?? {});
        if (groupSender?.externalId) {
            groupMemberNames.set(groupSender.externalId, groupSender.name);
        } else if (message.message_type === MESSAGE_TYPES.INCOMING && message.sender?.name) {
            contactName ??= message.sender.name;
        }
    });

    return by => {
        if (by === UNKNOWN_REACTOR || isAgentReaction(by)) return null;
        if (groupMemberNames.size > 0) return groupMemberNames.get(by) ?? null;

        return contactName;
    };
}

/** Bộ chọn nhanh giống Zalo; "một người giữ đúng một emoji" nên bấm lại là gỡ. */
export const QUICK_REACTIONS = ['❤️', '👍', '😆', '😮', '😢', '😡'] as const;
