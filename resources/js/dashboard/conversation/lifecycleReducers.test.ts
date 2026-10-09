import { describe, expect, it } from 'vitest';

import {
    applyConversationMuted,
    applyConversationPinned,
    applyConversationPriority,
    applyPinPositions,
    moveId,
    pinPositionsForOrder,
    applyConversationStatus,
    snoozedUntilForStatus,
} from './lifecycleReducers';
import type { Conversation } from './types';

function buildConversation(overrides: Partial<Conversation> = {}): Conversation {
    return {
        id: 4,
        uuid: 'u',
        account_id: 2,
        inbox_id: 1,
        meta: { sender: { id: 3, name: 'Trang' }, channel: null },
        messages: [],
        status: 'open',
        priority: null,
        labels: [],
        muted: false,
        can_reply: true,
        snoozed_until: null,
        custom_attributes: {},
        additional_attributes: {},
        agent_last_seen_at: 0,
        assignee_last_seen_at: 0,
        contact_last_seen_at: 0,
        first_reply_created_at: 0,
        unread_count: 0,
        last_non_activity_message: null,
        last_activity_at: 0,
        timestamp: 0,
        waiting_since: 0,
        created_at: 0,
        updated_at: 0,
        sla_policy_id: null,
        ...overrides,
    };
}

describe('applyConversationStatus (CHANGE_CONVERSATION_STATUS)', () => {
    it('ghi status + snoozed_until từ payload lên đúng conversation', () => {
        const list = [buildConversation({ id: 4 }), buildConversation({ id: 5 })];
        const result = applyConversationStatus(list, 4, 'snoozed', '2026-09-03T02:00:00.000000Z');

        expect(result[0]).toMatchObject({ status: 'snoozed', snoozed_until: '2026-09-03T02:00:00.000000Z' });
        expect(result[1]).toBe(list[1]);
    });

    it('mở lại xóa snoozed_until', () => {
        const list = [buildConversation({ status: 'snoozed', snoozed_until: '2026-09-03T02:00:00Z' })];
        expect(applyConversationStatus(list, 4, 'open', null)[0]).toMatchObject({ status: 'open', snoozed_until: null });
    });

    it('không đụng conversation khác id', () => {
        const list = [buildConversation({ id: 9 })];
        expect(applyConversationStatus(list, 4, 'resolved', null)).toEqual(list);
    });
});

describe('snoozedUntilForStatus', () => {
    it('đổi epoch giây thành ISO để optimistic state vẽ header ngay', () => {
        expect(snoozedUntilForStatus('snoozed', 1788746400)).toBe('2026-09-07T02:00:00.000Z');
    });

    it('xóa mốc khi trạng thái không còn snoozed', () => {
        expect(snoozedUntilForStatus('open', 1788746400)).toBeNull();
        expect(snoozedUntilForStatus('snoozed', null)).toBeNull();
    });
});

describe('applyConversationPriority (ASSIGN_PRIORITY)', () => {
    it('gán priority và trả lại null khi revert', () => {
        const list = [buildConversation()];
        const assigned = applyConversationPriority(list, 4, 'urgent');
        expect(assigned[0].priority).toBe('urgent');
        expect(applyConversationPriority(assigned, 4, null)[0].priority).toBeNull();
    });
});

describe('applyConversationMuted (MUTE/UNMUTE_CONVERSATION)', () => {
    it('bật/tắt muted', () => {
        const list = [buildConversation()];
        const muted = applyConversationMuted(list, 4, true);
        expect(muted[0].muted).toBe(true);
        expect(applyConversationMuted(muted, 4, false)[0].muted).toBe(false);
    });
});

describe('applyConversationPinned', () => {
    it('chỉ đổi cờ ghim của đúng hội thoại', () => {
        const list = [buildConversation(), buildConversation({ id: 5 })];
        const pinned = applyConversationPinned(list, 4, true);

        expect(pinned.map(item => item.pinned)).toEqual([true, undefined]);
        expect(applyConversationPinned(pinned, 4, false)[0].pinned).toBe(false);
    });
});

describe('thứ tự nhóm ghim', () => {
    it('ghim mới đứng đầu nhóm ghim, bỏ ghim xoá vị trí', () => {
        const list = [buildConversation({ id: 4 }), buildConversation({ id: 5, pinned: true, pin_position: -3 })];
        const pinned = applyConversationPinned(list, 4, true);

        expect(pinned[0].pin_position).toBe(-4);
        expect(applyConversationPinned(pinned, 4, false)[0].pin_position).toBeNull();
    });

    it('xếp lại dùng đúng những ô đang chiếm, ghim không hiện giữ chỗ', () => {
        const list = [
            buildConversation({ id: 1, pinned: true, pin_position: 0 }),
            buildConversation({ id: 2, pinned: true, pin_position: 3 }),
            buildConversation({ id: 3, pinned: true, pin_position: 5 }),
        ];
        const positions = pinPositionsForOrder(list, [3, 1, 2]);

        expect([...positions]).toEqual([[3, 0], [1, 3], [2, 5]]);
        expect(applyPinPositions(list, positions).map(item => item.pin_position)).toEqual([3, 5, 0]);
    });

    it.each([
        { id: 3, target: 0, expected: [3, 1, 2] },
        { id: 1, target: 1, expected: [2, 1, 3] },
        { id: 1, target: 9, expected: [2, 3, 1] },
        { id: 7, target: 0, expected: [1, 2, 3] },
    ])('moveId($id → $target)', ({ id, target, expected }) => {
        expect(moveId([1, 2, 3], id, target)).toEqual(expected);
    });
});
