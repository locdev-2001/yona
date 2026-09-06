import { describe, expect, it } from 'vitest';

import type { Conversation } from '../../types';
import { filterPreviousConversations, shouldShowInboxName } from './previousConversations';

const conversations = [{ id: 4 }, { id: 7 }, { id: 9 }] as unknown as Conversation[];

describe('previousConversations', () => {
    it('bỏ chính hội thoại đang mở khỏi danh sách', () => {
        expect(filterPreviousConversations(conversations, 7).map(item => item.id)).toEqual([4, 9]);
    });

    it('so sánh theo số nên id dạng chuỗi từ route vẫn khớp', () => {
        expect(filterPreviousConversations(conversations, '4').map(item => item.id)).toEqual([7, 9]);
    });

    it('giữ nguyên danh sách khi hội thoại đang mở không thuộc contact', () => {
        expect(filterPreviousConversations(conversations, 99)).toHaveLength(3);
    });

    it('chỉ hiện tên inbox khi đang ở màn tổng và account có nhiều inbox', () => {
        expect(shouldShowInboxName(0, 2)).toBe(true);
        expect(shouldShowInboxName(0, 1)).toBe(false);
        expect(shouldShowInboxName(1, 3)).toBe(true);
        expect(shouldShowInboxName(1, 1)).toBe(false);
    });
});
