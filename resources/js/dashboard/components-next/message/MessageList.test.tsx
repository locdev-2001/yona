import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MessageList from './MessageList';
import type { ConversationMessage } from 'dashboard/conversation/types';

// Kịch bản pixel-diff B3 (display 4): note riêng tư nằm trong cụm tin outgoing
// cùng agent, cùng phút. Màu amber + khóa phải theo `private` của CHÍNH tin đó;
// meta (giờ + khóa) ẩn khi tin còn gộp với tin kế — giống Base.vue gốc
// (`shouldShowMeta = !shouldGroupWithNext`).
const AGENT = { id: 1, name: 'John', type: 'user' as const, thumbnail: '' };
const CONTACT = { id: 3, name: 'Trang Nguyen', type: 'contact' as const, thumbnail: '' };
const BASE_TIME = 1756707112; // 06:11:52

function message(id: number, overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id,
        content: `message ${id}`,
        inbox_id: 1,
        conversation_id: 4,
        message_type: 1,
        content_type: 'text',
        status: 'sent',
        content_attributes: {},
        created_at: BASE_TIME,
        private: false,
        source_id: null,
        sender: AGENT,
        sender_type: 'User',
        sender_id: AGENT.id,
        ...overrides,
    };
}

const renderList = (messages: ConversationMessage[]) =>
    render(<MessageList messages={messages} channelType="Channel::Api" firstUnreadId={null} />).container;

const amberBubble = (container: HTMLElement, id: number) => container.querySelector(`#message${id} .bg-n-solid-amber`);
const lockIcon = (container: HTMLElement, id: number) => container.querySelector(`#message${id} .i-lucide-lock-keyhole`);

describe('MessageList private note inside a grouped outgoing run', () => {
    it('colors only the private note amber, regardless of its neighbours', () => {
        const container = renderList([
            message(5, { content: 'Chào Trang' }),
            message(6, { content: 'Khách VIP', private: true }),
            message(7, { content: 'Test hotkey' }),
        ]);

        expect(amberBubble(container, 6)).not.toBeNull();
        expect(amberBubble(container, 5)).toBeNull();
        expect(amberBubble(container, 7)).toBeNull();

        // Cùng sender + cùng phút → 2 tin đầu gộp với tin kế (meta ẩn như gốc), tin cuối không.
        expect(container.querySelector('#message5')).toHaveClass('group-with-next');
        expect(container.querySelector('#message6')).toHaveClass('group-with-next');
        expect(container.querySelector('#message7')).not.toHaveClass('group-with-next');
        expect(lockIcon(container, 6)).toBeNull();
        expect(lockIcon(container, 7)).toBeNull();
    });

    it('shows the lock on the private note when it closes its group', () => {
        const container = renderList([
            message(5, { content: 'Chào Trang' }),
            message(6, { content: 'Khách VIP', private: true }),
            message(8, {
                content: 'Tin khách',
                message_type: 0,
                sender: CONTACT,
                sender_type: 'Contact',
                sender_id: CONTACT.id,
            }),
        ]);

        expect(container.querySelector('#message6')).not.toHaveClass('group-with-next');
        expect(amberBubble(container, 6)).not.toBeNull();
        expect(lockIcon(container, 6)).not.toBeNull();
        expect(lockIcon(container, 5)).toBeNull();
        expect(lockIcon(container, 8)).toBeNull();
    });
});

// getInReplyToMessage của MessageList.vue gốc — khối trích dẫn lấy nội dung tin
// được trả lời từ chính danh sách đang hiển thị.
describe('MessageList in_reply_to', () => {
    it('renders the quoted message preview above the bubble', () => {
        const container = renderList([
            message(10, { content: 'Gói Team 299k/tháng' }),
            message(11, { content: 'Cho anh xin link nhé', content_attributes: { in_reply_to: 10 } }),
        ]);

        const quote = container.querySelector('#message11 .line-clamp-2');

        expect(quote?.textContent).toContain('Gói Team 299k/tháng');
    });

    it('renders no quote block when in_reply_to points outside the list', () => {
        const container = renderList([message(12, { content_attributes: { in_reply_to: 999 } })]);

        expect(container.querySelector('#message12 .line-clamp-2')).toBeNull();
    });
});
