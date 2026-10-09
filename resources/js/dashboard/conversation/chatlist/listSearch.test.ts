import { describe, expect, it } from 'vitest';

import type { ConversationMessage } from '../types';
import {
    appendSearchPage,
    matchedMessagePreview,
    readListSearchQuery,
    withFocusMessage,
    withListSearchQuery,
} from './listSearch';

describe('listSearch', () => {
    it('đọc từ khoá từ query string, bỏ khoảng trắng thừa', () => {
        expect(readListSearchQuery('?q=%20Lan%20Nguy%E1%BB%85n%20&messageId=5')).toBe('Lan Nguyễn');
        expect(readListSearchQuery('')).toBe('');
    });

    it('ghi hoặc gỡ từ khoá mà giữ nguyên các tham số khác của URL', () => {
        expect(withListSearchQuery('/app/accounts/1/conversations/7?messageId=5', 'đơn hàng')).toBe(
            '/app/accounts/1/conversations/7?messageId=5&q=%C4%91%C6%A1n+h%C3%A0ng',
        );
        expect(withListSearchQuery('/app/accounts/1/dashboard?q=lan&messageId=5', '  ')).toBe(
            '/app/accounts/1/dashboard?messageId=5',
        );
        expect(withListSearchQuery('/app/accounts/1/dashboard', '')).toBe('/app/accounts/1/dashboard');
    });

    it('dòng xem trước của tin khớp là đoạn cắt quanh chỗ khớp, bỏ tóm tắt thay chữ', () => {
        const message = {
            id: 7,
            content: 'Chào chị, bên em gửi lại thông tin chuyển khoản để chị nhận hàng nhé',
            preview_text: 'Thư: Đơn hàng',
            content_attributes: { email: { subject: 'Đơn hàng' } },
        } as unknown as ConversationMessage;

        const preview = matchedMessagePreview(message, 'nhan hang');

        expect(preview.content).toBe('…khoản để chị nhận hàng nhé');
        expect(preview.preview_text).toBeNull();
        expect(preview.content_attributes).toEqual({});
        expect(matchedMessagePreview({ ...message, content: '' }, 'nhan')).toEqual({ ...message, content: '' });
    });

    it('liên kết mở hội thoại tại tin khớp giữ các tham số khác', () => {
        expect(withFocusMessage('/app/accounts/1/conversations/7?q=lan', 42)).toBe(
            '/app/accounts/1/conversations/7?q=lan&messageId=42',
        );
    });

    it('nối trang sau không lặp hội thoại đã hiện', () => {
        expect(appendSearchPage([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }])).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });
});
