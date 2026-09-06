import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Message from './Message';
import MessagePreview from 'dashboard/components-next/Conversation/ConversationCard/MessagePreview';
import type { ConversationMessage } from 'dashboard/conversation/types';

const BASE_TIME = 1756707112;

// Nhánh `externalEcho` của Message.vue: tin chủ hộp thư gửi thẳng từ điện thoại
// rồi kênh dội lại. Không có sender nội bộ nên trước lô 2b nó rơi vào nhánh
// isBot và hiện thành bong bóng "Bot" tím.
function outgoingEcho(contentAttributes: Record<string, unknown> = {}): ConversationMessage {
    return {
        id: 11,
        content: 'Chị gửi báo giá nhé',
        inbox_id: 58,
        conversation_id: 2,
        message_type: 1,
        content_type: 'text',
        status: 'sent',
        content_attributes: { external_echo: true, ...contentAttributes },
        created_at: BASE_TIME,
        private: false,
        source_id: 'msg-zalo-echo-1',
        sender: undefined,
        sender_id: null,
        sender_type: null,
    };
}

const renderMessage = (payload: ConversationMessage) =>
    render(<Message message={payload} channelType="Channel::Zalo" />).container;

describe('tin chủ shop gửi từ điện thoại', () => {
    it('mang bong bóng của agent, không phải bong bóng Bot', () => {
        const container = renderMessage(outgoingEcho());
        const bubble = container.querySelector('.right-bubble');

        expect(bubble?.className).toContain('bg-n-solid-blue');
        expect(bubble?.className).not.toContain('bg-n-solid-iris');
    });

    it('có nhãn nhỏ "từ điện thoại" kèm giải thích', () => {
        const container = renderMessage(outgoingEcho());
        const label = container.querySelector('[data-testid="external-echo-label"]');

        expect(label?.textContent).toBe('from phone');
        expect(label?.getAttribute('title')).toContain('native app');
    });

    it('không đề tên Bot ở avatar', () => {
        const container = renderMessage(outgoingEcho());

        expect(container.textContent).not.toContain('Bot');
    });

    it('tin đi bình thường (không echo) giữ nguyên hành vi cũ', () => {
        const plainBot = { ...outgoingEcho(), content_attributes: {} };
        const container = renderMessage(plainBot);

        expect(container.querySelector('[data-testid="external-echo-label"]')).toBeNull();
        expect(container.querySelector('.right-bubble')?.className).toContain('bg-n-solid-iris');
    });

    it('tin thất bại vẫn ưu tiên bong bóng lỗi', () => {
        const failed = { ...outgoingEcho(), status: 'failed' } as ConversationMessage;
        const container = renderMessage(failed);

        expect(container.querySelector('.right-bubble')?.className).toContain('bg-n-ruby-4');
    });
});

describe('lời mời kết bạn', () => {
    const friendRequest = (message?: string): ConversationMessage => ({
        id: 12,
        content: message ?? '[Friend request]',
        inbox_id: 58,
        conversation_id: 2,
        message_type: 0,
        content_type: 'text',
        status: 'sent',
        content_attributes: { friend_request: { external_id: '5550001234', message } },
        created_at: BASE_TIME,
        private: false,
        source_id: 'zalo-personal-friend-request-1',
        sender: { id: 5, name: 'Trần Thị B', type: 'contact', thumbnail: '' },
        sender_id: 5,
        sender_type: 'Contact',
    });

    it('hiện bong bóng riêng với tiêu đề Lời mời kết bạn', () => {
        const container = renderMessage(friendRequest('Chào shop'));

        expect(container.textContent).toContain('Friend request');
        expect(container.textContent).toContain('Chào shop');
    });

    it('không có lời nhắn vẫn hiện bong bóng', () => {
        const container = renderMessage(friendRequest());

        expect(container.textContent).toContain('Friend request');
    });

    it('thẻ hội thoại hiện nhãn thay cho nội dung tin', () => {
        const container = render(<MessagePreview message={friendRequest('Chào shop')} />).container;

        expect(container.textContent).toContain('[Friend request]');
        expect(container.textContent).not.toContain('Chào shop');
    });
});
