import { describe, expect, it, vi } from 'vitest';

import {
    FOCUS_CONTEXT_BEFORE,
    FOCUS_WINDOW_MAX_PAGES,
    loadFocusWindow,
    mergeMessagesChronologically,
    MESSAGES_BETWEEN_LIMIT,
    readFocusMessageId,
    type MessagesRangeFetcher,
} from './messageFocus';
import type { ConversationMessage } from './types';

function message(id: number, createdAt = id): ConversationMessage {
    return {
        id,
        content: `tin ${id}`,
        inbox_id: 1,
        conversation_id: 12,
        message_type: 0,
        content_type: 'text',
        status: 'sent',
        content_attributes: {},
        created_at: createdAt,
        private: false,
        source_id: null,
    };
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_unused, index) => message(from + index));

describe('readFocusMessageId', () => {
    it('đọc id tin dương từ query string', () => {
        expect(readFocusMessageId('?messageId=5')).toBe(5);
        expect(readFocusMessageId('?q=a&messageId=5012')).toBe(5012);
    });

    it('bỏ qua giá trị không phải số nguyên dương', () => {
        expect(readFocusMessageId('?messageId=abc')).toBeNull();
        expect(readFocusMessageId('?messageId=0')).toBeNull();
        expect(readFocusMessageId('?messageId=-3')).toBeNull();
        expect(readFocusMessageId('?messageId=1.5')).toBeNull();
        expect(readFocusMessageId('')).toBeNull();
    });
});

describe('mergeMessagesChronologically', () => {
    it('khử trùng theo id và xếp theo thời điểm rồi theo id', () => {
        const merged = mergeMessagesChronologically(
            [message(50, 500), message(51, 510)],
            [message(40, 400), message(50, 500), message(45, 510)],
        );

        expect(merged.map(item => item.id)).toEqual([40, 50, 45, 51]);
    });
});

describe('loadFocusWindow', () => {
    it('không gọi mạng khi tin đích đã có đủ tin ngữ cảnh phía trên', async () => {
        const fetchRange = vi.fn<MessagesRangeFetcher>();
        const loaded = range(80, 99);

        const result = await loadFocusWindow(loaded, 80 + FOCUS_CONTEXT_BEFORE, fetchRange);

        expect(fetchRange).not.toHaveBeenCalled();
        expect(result).toEqual({ messages: loaded, found: true });
    });

    it('nạp thêm một trang tin cũ hơn khi tin đích đã có nhưng nằm sát đầu trang', async () => {
        const fetchRange = vi.fn<MessagesRangeFetcher>().mockResolvedValue(range(60, 79));

        const result = await loadFocusWindow(range(80, 99), 82, fetchRange);

        expect(fetchRange).toHaveBeenCalledExactlyOnceWith(80);
        expect(result.found).toBe(true);
        expect(result.messages.map(item => item.id)).toEqual(range(60, 99).map(item => item.id));
    });

    it('vẫn mở tại tin đích khi nạp trang ngữ cảnh hỏng', async () => {
        const fetchRange = vi.fn<MessagesRangeFetcher>().mockImplementation(async (_before, after) => {
            if (after === undefined) throw new Error('mạng chập chờn');
            return range(60, 79);
        });

        const loadedTarget = await loadFocusWindow(range(80, 99), 82, fetchRange);
        const olderTarget = await loadFocusWindow(range(80, 99), 60, fetchRange);

        expect(loadedTarget).toEqual({ messages: range(80, 99), found: true });
        expect(olderTarget.found).toBe(true);
        expect(olderTarget.messages.map(item => item.id)).toEqual(range(60, 99).map(item => item.id));
    });

    it('không nạp thêm khi các tin đang có chưa đủ một trang, tức là đã hết hội thoại', async () => {
        const fetchRange = vi.fn<MessagesRangeFetcher>();
        const loaded = range(80, 90);

        const result = await loadFocusWindow(loaded, 81, fetchRange);

        expect(fetchRange).not.toHaveBeenCalled();
        expect(result).toEqual({ messages: loaded, found: true });
    });

    it('nạp khoảng từ tin đích tới tin cũ nhất đang có cùng một trang tin ngay trước tin đích', async () => {
        const fetchRange = vi.fn<MessagesRangeFetcher>().mockImplementation(async (_before, after) =>
            after === undefined ? range(40, 59) : range(60, 79),
        );

        const result = await loadFocusWindow(range(80, 99), 60, fetchRange);

        expect(fetchRange.mock.calls).toEqual([[80, 60], [60]]);
        expect(result.found).toBe(true);
        expect(result.messages.map(item => item.id)).toEqual(range(40, 99).map(item => item.id));
        expect(result.messages.findIndex(item => item.id === 60)).toBeGreaterThanOrEqual(FOCUS_CONTEXT_BEFORE);
    });

    it('bỏ trang ngữ cảnh khi tin đích cũ hơn mà không thuộc hội thoại', async () => {
        const fetchRange = vi.fn<MessagesRangeFetcher>().mockImplementation(async (_before, after) =>
            after === undefined ? range(30, 49) : range(60, 79),
        );

        const result = await loadFocusWindow(range(80, 99), 50, fetchRange);

        expect(result.found).toBe(false);
        expect(result.messages.map(item => item.id)).toEqual(range(60, 99).map(item => item.id));
    });

    it('nạp tiếp khi trang đầy và dừng sau số trang tối đa', async () => {
        let nextId = 1;
        const fetchRange = vi.fn<MessagesRangeFetcher>().mockImplementation(async (_before, after) => {
            if (after === undefined) return [];
            const page = range(nextId, nextId + MESSAGES_BETWEEN_LIMIT - 1);
            nextId += MESSAGES_BETWEEN_LIMIT;
            return page;
        });

        const result = await loadFocusWindow(range(90000, 90019), 1, fetchRange);

        expect(fetchRange.mock.calls.filter(([, after]) => after !== undefined)).toEqual([
            [90000, 1],
            [90000, 1001],
            [90000, 2001],
            [90000, 3001],
            [90000, 4001],
        ]);
        expect(fetchRange.mock.calls.filter(([, after]) => after !== undefined)).toHaveLength(FOCUS_WINDOW_MAX_PAGES);
        expect(result.found).toBe(true);
    });

    it('chỉ tra đúng tin đích khi id của nó mới hơn tin cũ nhất mà chưa có trong trang', async () => {
        const imported = message(120, 5);
        const fetchRange = vi.fn<MessagesRangeFetcher>().mockResolvedValue([imported]);

        const result = await loadFocusWindow(range(80, 99), 120, fetchRange);

        expect(fetchRange).toHaveBeenCalledExactlyOnceWith(121, 120);
        expect(result.found).toBe(true);
        expect(result.messages[0].id).toBe(120);
    });

    it('báo không thấy khi tin đích không thuộc hội thoại', async () => {
        const fetchRange = vi.fn<MessagesRangeFetcher>().mockResolvedValue([]);

        const result = await loadFocusWindow(range(80, 99), 999999999, fetchRange);

        expect(fetchRange).toHaveBeenCalledExactlyOnceWith(1000000000, 999999999);
        expect(result.found).toBe(false);
        expect(result.messages.map(item => item.id)).toEqual(range(80, 99).map(item => item.id));
    });

    it('tra đúng tin đích khi chưa có tin nào', async () => {
        const fetchRange = vi.fn<MessagesRangeFetcher>().mockResolvedValue([]);

        const result = await loadFocusWindow([], 7, fetchRange);

        expect(fetchRange).toHaveBeenCalledExactlyOnceWith(8, 7);
        expect(result.found).toBe(false);
    });
});
