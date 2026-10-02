import { describe, expect, it } from 'vitest';

import {
    applyUnreadCount,
    unreadCountToShow,
    unreadSnapshotOf,
    firstUnreadMessageId,
    getMetaDebounceKey,
    unreadMessageLabelParts,
    unreadMessages,
} from './unreadHelpers';
import type { Conversation, ConversationMessage } from './types';

function conversation(overrides: Partial<Conversation>): Conversation {
    return {
        id: 1,
        agent_last_seen_at: 0,
        unread_count: 0,
        ...overrides,
    } as Conversation;
}

function message(id: number, createdAt: number): ConversationMessage {
    return { id, created_at: createdAt } as ConversationMessage;
}

describe('applyUnreadCount', () => {
    it('ghi agent_last_seen_at + unread_count đúng hội thoại, giữ nguyên hội thoại khác', () => {
        const list = [
            conversation({ id: 1, unread_count: 3, agent_last_seen_at: 10 }),
            conversation({ id: 2, unread_count: 5, agent_last_seen_at: 20 }),
        ];

        const next = applyUnreadCount(list, 1, 99);

        expect(next[0]).toMatchObject({ agent_last_seen_at: 99, unread_count: 0 });
        expect(next[1]).toBe(list[1]);
    });

    it('đánh dấu chưa đọc trả lại unread_count từ server', () => {
        const list = [conversation({ id: 1, unread_count: 0, agent_last_seen_at: 100 })];

        expect(applyUnreadCount(list, 1, 40, 2)[0]).toMatchObject({
            agent_last_seen_at: 40,
            unread_count: 2,
        });
    });

    it('bỏ qua khi không có hội thoại khớp', () => {
        const list = [conversation({ id: 1 })];
        expect(applyUnreadCount(list, 9, 5)).toEqual(list);
    });
});

describe('unreadMessages / firstUnreadMessageId', () => {
    const messages = [message(1, 100), message(2, 200), message(3, 300)];

    it('chỉ lấy tin sau mốc agent_last_seen_at (mốc bằng nhau = đã đọc)', () => {
        expect(unreadMessages(messages, 200).map((item) => item.id)).toEqual([3]);
    });

    it('pill neo vào tin chưa đọc đầu tiên', () => {
        expect(firstUnreadMessageId(messages, 100, 2)).toBe(2);
    });

    it('unread_count = 0 thì không hiện pill dù còn tin sau mốc (tin gửi đi)', () => {
        expect(firstUnreadMessageId(messages, 100, 0)).toBeNull();
    });

    it('không còn tin nào sau mốc thì cũng không hiện pill', () => {
        expect(firstUnreadMessageId(messages, 300, 4)).toBeNull();
    });
});

describe('unreadMessageLabelParts', () => {
    it('số ít dùng khóa UNREAD_MESSAGE', () => {
        expect(unreadMessageLabelParts(1)).toEqual({ count: '1', i18nKey: 'CONVERSATION.UNREAD_MESSAGE' });
    });

    it('số nhiều dùng khóa UNREAD_MESSAGES', () => {
        expect(unreadMessageLabelParts(2)).toEqual({ count: '2', i18nKey: 'CONVERSATION.UNREAD_MESSAGES' });
    });

    it('trên 9 rút gọn thành 9+', () => {
        expect(unreadMessageLabelParts(10).count).toBe('9+');
        expect(unreadMessageLabelParts(9).count).toBe('9');
    });
});

describe('getMetaDebounceKey', () => {
    it('chưa có meta (0) coi như account lớn', () => {
        expect(getMetaDebounceKey(0)).toBe('superLong');
    });

    it('phân nhịp theo ngưỡng 100 / 2000', () => {
        expect(getMetaDebounceKey(100)).toBe('default');
        expect(getMetaDebounceKey(101)).toBe('long');
        expect(getMetaDebounceKey(2000)).toBe('long');
        expect(getMetaDebounceKey(2001)).toBe('superLong');
    });
});

describe('unreadSnapshotOf', () => {
    it('giữ số chưa đọc và mốc đã xem lúc mở, không đổi theo bản ghi sau đó', () => {
        const conversation = { id: 7, unread_count: 4, agent_last_seen_at: 120 };
        const snapshot = unreadSnapshotOf(conversation, 500);
        conversation.unread_count = 0;

        expect(snapshot).toEqual({ conversationId: 7, count: 4, lastSeenAt: 120, openedAt: 500 });
    });
});

describe('unreadCountToShow', () => {
    const snapshot = { conversationId: 7, count: 1, lastSeenAt: 120, openedAt: 500 };
    const message = (messageType: number, createdAt: number) =>
        ({ id: createdAt, message_type: messageType, created_at: createdAt }) as ConversationMessage;

    it('giữ dải chưa đọc khi chưa trả lời, kể cả có tin khách mới tới', () => {
        expect(unreadCountToShow(snapshot, [message(0, 130), message(1, 400), message(0, 510)])).toBe(1);
    });

    it('ẩn dải khi đã gửi tin trả lời sau lúc mở hội thoại', () => {
        expect(unreadCountToShow(snapshot, [message(0, 130), message(1, 520)])).toBe(0);
    });
});
