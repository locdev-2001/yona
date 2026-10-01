import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import LegacyMessagePreview from 'dashboard/components/widgets/conversation/MessagePreview';
import type { ConversationMessage } from 'dashboard/conversation/types';
import { t } from '../../../../i18n';
import MessagePreview from './MessagePreview';

function sticker(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id: 1,
        content: null,
        inbox_id: 1,
        conversation_id: 4,
        message_type: 0,
        content_type: 'sticker',
        status: 'sent',
        content_attributes: {},
        created_at: 1756707112,
        private: false,
        source_id: null,
        attachments: [{ id: 9, file_type: 'image', data_url: 'https://cdn.zalo.test/98930.webp' }],
        ...overrides,
    };
}

describe('ô xem trước tin sticker', () => {
    const label = t('CHAT_LIST.ATTACHMENTS.sticker.CONTENT');

    it.each([
        ['sticker có ảnh đính kèm, không nội dung', sticker()],
        ['sticker dạng markdown trong nội dung', sticker({ content: '![sticker-1](https://cdn/s.png)', attachments: [] })],
    ])('thẻ hội thoại ghi "Sticker" — %s', (_case, message) => {
        const container = render(<MessagePreview message={message} />).container;

        expect(container.textContent).toContain(label);
        expect(container.textContent).not.toContain(t('CHAT_LIST.ATTACHMENTS.image.CONTENT'));
        expect(container.querySelector('.i-lucide-sticker')).not.toBeNull();
    });

    it('khối "Đang trả lời" cũng ghi "Sticker"', () => {
        const container = render(<LegacyMessagePreview message={sticker()} />).container;

        expect(container.textContent).toContain(label);
        expect(container.querySelector('.i-lucide-sticker')).not.toBeNull();
    });
});
