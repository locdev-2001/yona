import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Message from './Message';
import type { ConversationMessage } from 'dashboard/conversation/types';
import { canRetryMessage, hasOneDayPassed, readExternalError } from './helpers/retry';

// Bundle i18n của test chạy ở locale mặc định (en) — chuỗi kiểm tra lấy bản en.
const RETRY_LABEL = 'Retry sending';

const NOW = Math.floor(Date.now() / 1000);

function failedMessage(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id: 42,
        content: 'Alo',
        inbox_id: 58,
        conversation_id: 2,
        message_type: 1,
        content_type: 'text',
        status: 'failed',
        content_attributes: { external_error: { code: 'zalo_rejected', message: 'Zalo từ chối tin này' } },
        created_at: NOW,
        private: false,
        source_id: null,
        ...overrides,
    };
}

const renderMessage = (payload: ConversationMessage, onRetry?: () => void) =>
    render(<Message message={payload} channelType="Channel::Zalo" onRetry={onRetry} />).container;

describe('lý do lỗi và nút Thử lại trên tin thất bại', () => {
    it('hiện nút Thử lại và gọi lại đúng tin', () => {
        const onRetry = vi.fn();
        renderMessage(failedMessage(), onRetry);

        fireEvent.click(screen.getByRole('button', { name: RETRY_LABEL }));

        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('hiện lý do lỗi kênh trả về', () => {
        const container = renderMessage(failedMessage(), vi.fn());

        expect(container.textContent).toContain('Zalo từ chối tin này');
    });

    it('thêm gợi ý hành động theo mã lỗi có cấu trúc', () => {
        const container = renderMessage(
            failedMessage({
                content_attributes: { external_error: { code: 'session_lost', message: 'Mất phiên Zalo' } },
            }),
            vi.fn(),
        );

        expect(container.textContent).toContain('Reconnect the inbox');
    });

    it('không hiện nút Thử lại khi lỗi là sai cấu hình khoá gửi', () => {
        renderMessage(
            failedMessage({
                content_attributes: { external_error: { code: 'secret_mismatch', message: 'Sai khoá gửi' } },
            }),
            vi.fn(),
        );

        expect(screen.queryByRole('button', { name: RETRY_LABEL })).toBeNull();
    });

    it('không hiện gì khi tin không có external_error', () => {
        const container = renderMessage(failedMessage({ content_attributes: {} }), vi.fn());

        expect(container.textContent).not.toContain('Failed to send');
    });
});

describe('đọc external_error hai hình dạng', () => {
    it('nhận chuỗi thô của kênh cũ', () => {
        expect(readExternalError('400, chat not found')).toEqual({ message: '400, chat not found' });
    });

    it('nhận object {code, message} của kênh khai outbound_retry', () => {
        expect(readExternalError({ code: 'circuit_open', message: 'Đang tạm dừng' })).toEqual({
            code: 'circuit_open',
            message: 'Đang tạm dừng',
        });
    });

    it('bỏ qua giá trị rỗng', () => {
        expect(readExternalError('   ')).toBeNull();
        expect(readExternalError(null)).toBeNull();
    });
});

describe('điều kiện thử lại', () => {
    const base = { status: 'failed', createdAt: NOW, hasContent: true, hasAttachments: false };

    it('chỉ cho thử lại khi tin đang failed', () => {
        expect(canRetryMessage(base)).toBe(true);
        expect(canRetryMessage({ ...base, status: 'sent' })).toBe(false);
    });

    it('khoá thử lại sau 24 giờ như bản gốc', () => {
        expect(hasOneDayPassed(NOW - 25 * 3600)).toBe(true);
        expect(canRetryMessage({ ...base, createdAt: NOW - 25 * 3600 })).toBe(false);
    });

    it('tin rỗng cả nội dung lẫn đính kèm thì không thử lại được', () => {
        expect(canRetryMessage({ ...base, hasContent: false })).toBe(false);
        expect(canRetryMessage({ ...base, hasContent: false, hasAttachments: true })).toBe(true);
    });
});
