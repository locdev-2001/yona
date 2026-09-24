import { describe, expect, it } from 'vitest';

import type { ConversationMessage } from 'dashboard/conversation/types';
import { resolveReplyQuote } from './replyQuote';

function message(id: number, overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id,
        content: 'Chào shop, còn hàng không?',
        inbox_id: 1,
        conversation_id: 4,
        message_type: 0,
        content_type: 'text',
        status: 'sent',
        content_attributes: {},
        created_at: 1756707112,
        private: false,
        source_id: null,
        sender: { id: 3, name: 'Khách A', type: 'contact', thumbnail: '' },
        ...overrides,
    };
}

const PREVIEW = { content: 'Tin trước khi kết nối', sender_name: 'Chủ Shop' };

describe('resolveReplyQuote', () => {
    it('không trả lời tin nào thì không có khối', () => {
        expect(resolveReplyQuote({}, undefined)).toBeNull();
        expect(resolveReplyQuote({ in_reply_to: null }, null)).toBeNull();
    });

    it('có tin gốc dạng chữ → lấy nội dung và tên người gửi của tin gốc', () => {
        expect(resolveReplyQuote({ in_reply_to: 10 }, message(10))).toEqual({
            targetId: 10,
            senderName: 'Khách A',
            content: 'Chào shop, còn hàng không?',
            attachmentType: null,
            unavailable: false,
        });
    });

    it('tin gốc chỉ có ảnh → chỉ có loại đính kèm', () => {
        const target = message(10, { content: null, attachments: [{ file_type: 'image' }] });

        expect(resolveReplyQuote({ in_reply_to: 10 }, target)).toMatchObject({
            targetId: 10,
            content: null,
            attachmentType: 'image',
        });
    });

    it('tin gốc trong nhóm → tên lấy từ người gửi thật của tin', () => {
        const target = message(10, {
            sender: { id: 9, name: 'Nhóm Sỉ Hà Nội', type: 'contact', thumbnail: '' },
            content_attributes: { sender: { external_id: 'u1', name: 'Chị Lan' } },
        });

        expect(resolveReplyQuote({ in_reply_to: 10 }, target)?.senderName).toBe('Chị Lan');
    });

    it('chỉ có ảnh chụp của nền tảng → dùng ảnh chụp, không cuộn tới được', () => {
        expect(resolveReplyQuote({ in_reply_to_preview: PREVIEW }, undefined)).toEqual({
            targetId: null,
            senderName: 'Chủ Shop',
            content: 'Tin trước khi kết nối',
            attachmentType: null,
            unavailable: false,
        });
    });

    it('tin gốc đang tải mà có ảnh chụp → vẽ ngay bằng ảnh chụp', () => {
        expect(resolveReplyQuote({ in_reply_to: 10, in_reply_to_preview: PREVIEW }, undefined)).toMatchObject({
            targetId: 10,
            content: 'Tin trước khi kết nối',
        });
    });

    it('tra xong không có tin gốc → báo không tìm thấy', () => {
        expect(resolveReplyQuote({ in_reply_to: 10 }, null)).toEqual({
            targetId: null,
            senderName: null,
            content: null,
            attachmentType: null,
            unavailable: true,
        });
    });

    it('chưa biết tin gốc và không có ảnh chụp → chưa vẽ để khỏi nháy', () => {
        expect(resolveReplyQuote({ in_reply_to: 10 }, undefined)).toBeNull();
    });

    it('ảnh chụp rỗng coi như không có', () => {
        expect(resolveReplyQuote({ in_reply_to_preview: { content: '  ' } }, undefined)).toBeNull();
    });
});
