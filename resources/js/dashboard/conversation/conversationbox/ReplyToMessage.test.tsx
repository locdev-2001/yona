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

    it('bấm X thì gọi onDismiss', () => {
        const onDismiss = vi.fn();
        render(<ReplyToMessage message={message()} onDismiss={onDismiss} />);

        fireEvent.click(screen.getByRole('button', { name: 'Dismiss reply' }));

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});
