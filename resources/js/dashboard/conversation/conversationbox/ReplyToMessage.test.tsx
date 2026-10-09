import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ConversationMessage } from '../types';
import ReplyToMessage from './ReplyToMessage';

function message(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id: 7,
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
        ...overrides,
    };
}

describe('ReplyToMessage', () => {
    it('hiện "Đang trả lời:" kèm nội dung tin gốc', () => {
        const { container } = render(<ReplyToMessage message={message()} onDismiss={vi.fn()} />);

        expect(container.textContent).toContain('Replying to:');
        expect(container.textContent).toContain('Chào shop, còn hàng không?');
    });

    it('tin gốc chỉ có ảnh thì hiện nhãn loại đính kèm', () => {
        const { container } = render(
            <ReplyToMessage message={message({ content: null, attachments: [{ file_type: 'image' }] })} onDismiss={vi.fn()} />,
        );

        expect(container.textContent).toContain('Picture message');
    });

    it('đang trả lời một ảnh thì hiện ảnh thu nhỏ', () => {
        const { container } = render(
            <ReplyToMessage
                message={message({ content: null, attachments: [{ id: 1, file_type: 'image', data_url: 'https://cdn.test/a.jpg' }] })}
                onDismiss={vi.fn()}
            />,
        );

        expect(container.querySelector('[data-testid="quoted-media-image"]')?.getAttribute('src')).toBe('https://cdn.test/a.jpg');
    });

    it('đang trả lời một tệp thì hiện tên tệp thay cho nhãn chung', () => {
        const { container } = render(
            <ReplyToMessage
                message={message({ content: null, attachments: [{ id: 1, file_type: 'file', data_url: 'https://cdn.test/f', filename: 'bao-gia.pdf', file_size: 20480 }] })}
                onDismiss={vi.fn()}
            />,
        );

        expect(container.querySelector('[data-testid="quoted-file"]')?.textContent).toContain('bao-gia.pdf');
    });

    it('bấm X thì gọi onDismiss', () => {
        const onDismiss = vi.fn();
        render(<ReplyToMessage message={message()} onDismiss={onDismiss} />);

        fireEvent.click(screen.getByRole('button', { name: 'Dismiss reply' }));

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});
