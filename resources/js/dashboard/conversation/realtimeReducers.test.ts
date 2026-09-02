import { describe, expect, it } from 'vitest';

import { getTypingUsersText } from '../helper/conversationHelper';
import {
    applyConversationUpdate,
    applyIncomingMessage,
    matchesConversationView,
    mergeFetchedConversations,
    selectVisibleConversations,
    shouldAddConversationToList,
} from './realtimeReducers';
import type { Conversation, ConversationMessage } from './types';

function buildMessage(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id: 1,
        content: 'hi',
        inbox_id: 1,
        conversation_id: 4,
        message_type: 0,
        content_type: 'text',
        status: 'sent',
        content_attributes: {},
        created_at: 100,
        private: false,
        source_id: null,
        ...overrides,
    };
}

function buildConversation(overrides: Partial<Conversation> = {}): Conversation {
    return {
        id: 4,
        uuid: 'u',
        account_id: 2,
        inbox_id: 1,
        meta: { sender: { id: 3, name: 'Contact' }, channel: 'Channel::Api' },
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
        last_activity_at: 100,
        timestamp: 100,
        waiting_since: 0,
        created_at: 50,
        updated_at: 100,
        sla_policy_id: null,
        ...overrides,
    };
}

describe('applyIncomingMessage', () => {
    it('không nhân đôi tin đã có cùng id', () => {
        const existing = buildMessage({ id: 10 });
        const result = applyIncomingMessage([existing], buildMessage({ id: 10, content: 'updated' }));

        expect(result.appended).toBe(false);
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].content).toBe('updated');
    });

    it('thay tin pending có cùng echo_id bằng bản server', () => {
        const pending = buildMessage({ id: -1, echo_id: 'echo-1', status: 'progress' });
        const fromServer = buildMessage({ id: 42, echo_id: 'echo-1', status: 'sent' });

        const result = applyIncomingMessage([pending], fromServer);

        expect(result.appended).toBe(false);
        expect(result.messages).toEqual([fromServer]);
    });

    it('nối tin mới vào cuối', () => {
        const result = applyIncomingMessage([buildMessage({ id: 1 })], buildMessage({ id: 2 }));

        expect(result.appended).toBe(true);
        expect(result.messages.map((m) => m.id)).toEqual([1, 2]);
    });
});

describe('applyConversationUpdate', () => {
    it('giữ messages đang có và bỏ qua event cũ hơn', () => {
        const current = buildConversation({ updated_at: 200, messages: [buildMessage()], status: 'open' });

        const stale = applyConversationUpdate([current], buildConversation({ updated_at: 150, status: 'resolved' }));
        expect(stale[0].status).toBe('open');

        const fresh = applyConversationUpdate(
            [current],
            buildConversation({ updated_at: 300, status: 'resolved', messages: [] }),
        );
        expect(fresh[0].status).toBe('resolved');
        expect(fresh[0].messages).toHaveLength(1);
    });

    it('thêm conversation chưa có trong list', () => {
        expect(applyConversationUpdate([], buildConversation({ id: 9 }))).toHaveLength(1);
    });
});

describe('shouldAddConversationToList / matchesConversationView', () => {
    it('đang xem inbox khác thì không thêm', () => {
        expect(shouldAddConversationToList(buildConversation({ inbox_id: 1 }), 2)).toBe(false);
        expect(shouldAddConversationToList(buildConversation({ inbox_id: 1 }), 1)).toBe(true);
        expect(shouldAddConversationToList(buildConversation({ inbox_id: 1 }), 0)).toBe(true);
    });

    it('conversation không khớp tab/status không hiện trong list', () => {
        const unassignedOpen = buildConversation({ id: 1 });
        const mineResolved = buildConversation({
            id: 2,
            status: 'resolved',
            meta: { sender: { id: 3, name: null }, channel: null, assignee: { id: 7, name: 'Me' } },
        });
        const mineOpen = buildConversation({
            id: 3,
            meta: { sender: { id: 3, name: null }, channel: null, assignee: { id: 7, name: 'Me' } },
        });

        const filters = { assigneeTab: 'me' as const, status: 'open', inboxId: 0, teamId: 0, currentUserId: 7 };
        expect(matchesConversationView(unassignedOpen, filters)).toBe(false);
        expect(matchesConversationView(mineResolved, filters)).toBe(false);
        expect(matchesConversationView(mineOpen, filters)).toBe(true);

        const visible = selectVisibleConversations([unassignedOpen, mineResolved, mineOpen], filters, 'last_activity_at_desc');
        expect(visible.map((c) => c.id)).toEqual([3]);
    });

    it('sort theo last_activity_at desc', () => {
        const older = buildConversation({ id: 1, last_activity_at: 10 });
        const newer = buildConversation({ id: 2, last_activity_at: 20 });
        const filters = { assigneeTab: 'all' as const, status: 'all', inboxId: 0, teamId: 0, currentUserId: 7 };

        expect(selectVisibleConversations([older, newer], filters, 'last_activity_at_desc').map((c) => c.id)).toEqual([2, 1]);
    });
});

describe('mergeFetchedConversations', () => {
    it('thay conversation cũ nhưng giữ messages của conversation đang mở', () => {
        const selected = buildConversation({ id: 4, messages: [buildMessage()], status: 'open' });
        const other = buildConversation({ id: 5, status: 'open' });
        const fetched = [
            buildConversation({ id: 4, status: 'resolved', messages: [] }),
            buildConversation({ id: 5, status: 'resolved' }),
            buildConversation({ id: 6 }),
        ];

        const merged = mergeFetchedConversations([selected, other], fetched, 4);

        expect(merged.map((c) => c.id)).toEqual([4, 5, 6]);
        expect(merged[0].status).toBe('resolved');
        expect(merged[0].messages).toHaveLength(1);
        expect(merged[1].status).toBe('resolved');
    });
});

describe('getTypingUsersText', () => {
    it('1 / 2 / nhiều người', () => {
        expect(getTypingUsersText([{ id: 1, name: 'A' }])).toEqual(['TYPING.ONE', { user: 'A' }]);
        expect(getTypingUsersText([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])).toEqual([
            'TYPING.TWO',
            { user: 'A', secondUser: 'B' },
        ]);
        expect(
            getTypingUsersText([
                { id: 1, name: 'A' },
                { id: 2, name: 'B' },
                { id: 3, name: 'C' },
            ]),
        ).toEqual(['TYPING.MULTIPLE', { user: 'A', count: 2 }]);
    });
});
