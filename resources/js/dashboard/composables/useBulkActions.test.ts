import { describe, expect, it } from 'vitest';

import {
    EMPTY_SELECTION,
    addToSelection,
    everySelectedHasStatus,
    isEveryConversationSelected,
    removeFromSelection,
    selectionOfAll,
    uniqueInboxIds,
} from './useBulkActions';
import type { Conversation, ConversationStatus } from 'dashboard/conversation/types';

function buildConversation(id: number, inboxId = 1, status: ConversationStatus = 'open'): Conversation {
    return {
        id,
        uuid: `u${id}`,
        account_id: 2,
        inbox_id: inboxId,
        meta: { sender: { id: 3, name: 'Trang' }, channel: null },
        messages: [],
        status,
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
    };
}

describe('addToSelection / removeFromSelection', () => {
    it('chọn thêm không làm trùng id nhưng vẫn thêm một phần tử inbox', () => {
        const first = addToSelection(EMPTY_SELECTION, 4, 1);
        const second = addToSelection(first, 5, 1);
        const again = addToSelection(second, 5, 1);

        expect(again.ids).toEqual([4, 5]);
        expect(again.inboxIds).toEqual([1, 1, 1]);
    });

    it('bỏ chọn chỉ gỡ MỘT phần tử inbox (conversation khác cùng inbox vẫn giữ)', () => {
        const selection = addToSelection(addToSelection(EMPTY_SELECTION, 4, 1), 5, 1);
        const result = removeFromSelection(selection, 4, 1);

        expect(result.ids).toEqual([5]);
        expect(result.inboxIds).toEqual([1]);
    });

    it('bỏ chọn inbox không có trong danh sách thì giữ nguyên inboxIds', () => {
        const selection = addToSelection(EMPTY_SELECTION, 4, 1);
        const result = removeFromSelection(selection, 4, 9);

        expect(result.ids).toEqual([]);
        expect(result.inboxIds).toEqual([1]);
    });
});

describe('selectionOfAll', () => {
    it('lấy id + inbox_id của toàn bộ danh sách đang hiển thị', () => {
        const conversations = [buildConversation(4, 1), buildConversation(5, 2)];

        expect(selectionOfAll(conversations)).toEqual({ ids: [4, 5], inboxIds: [1, 2] });
    });
});

describe('isEveryConversationSelected', () => {
    it('chỉ đúng khi số lượng bằng nhau và mọi id đều được chọn', () => {
        const conversations = [buildConversation(4), buildConversation(5)];

        expect(isEveryConversationSelected(conversations, [4, 5])).toBe(true);
        expect(isEveryConversationSelected(conversations, [4])).toBe(false);
        expect(isEveryConversationSelected(conversations, [4, 9])).toBe(false);
    });
});

describe('uniqueInboxIds', () => {
    it('gộp inbox trùng (tập inbox gửi lên assignable_agents)', () => {
        expect(uniqueInboxIds([1, 1, 2])).toEqual([1, 2]);
    });
});

describe('everySelectedHasStatus', () => {
    it('rỗng thì false; mọi conversation đã chọn cùng trạng thái thì true', () => {
        const conversations = [buildConversation(4, 1, 'open'), buildConversation(5, 1, 'resolved')];

        expect(everySelectedHasStatus(conversations, [], 'open')).toBe(false);
        expect(everySelectedHasStatus(conversations, [4], 'open')).toBe(true);
        expect(everySelectedHasStatus(conversations, [4, 5], 'open')).toBe(false);
    });
});
