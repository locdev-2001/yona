import { describe, expect, it } from 'vitest';

import { readForwardedFrom } from './forwardedFrom';

describe('readForwardedFrom', () => {
    it('chuyển tiếp trong Yona: đọc mã hội thoại nguồn, không có tên', () => {
        expect(
            readForwardedFrom({ forwarded_from: { origin: 'internal', message_id: 1234, conversation_id: 45 } }),
        ).toEqual({ origin: 'internal', senderName: null, sourceConversationId: 45 });
    });

    it('khách chuyển tiếp trên nền tảng: có hoặc không có tên người gửi gốc', () => {
        expect(readForwardedFrom({ forwarded_from: { origin: 'channel', sender_name: ' Nguyễn A ' } })).toEqual({
            origin: 'channel',
            senderName: 'Nguyễn A',
            sourceConversationId: null,
        });
        expect(readForwardedFrom({ forwarded_from: { origin: 'channel' } })).toEqual({
            origin: 'channel',
            senderName: null,
            sourceConversationId: null,
        });
    });

    it.each([
        ['không có khoá', {}],
        ['null', { forwarded_from: null }],
        ['mảng rỗng', { forwarded_from: [] }],
        ['chuỗi', { forwarded_from: 'yes' }],
        ['origin lạ', { forwarded_from: { origin: 'email' } }],
        ['thiếu origin', { forwarded_from: { sender_name: 'A' } }],
    ])('sai hình dạng → null: %s', (_label, contentAttributes) => {
        expect(readForwardedFrom(contentAttributes as Record<string, unknown>)).toBeNull();
    });
});
