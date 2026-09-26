import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MessagePreview from 'dashboard/components-next/Conversation/ConversationCard/MessagePreview';
import type { ConversationMessage } from 'dashboard/conversation/types';
import MessageList from './MessageList';

// Tin có cấu trúc trong hộp thư: kit của widget ở chế độ chỉ xem, ghi chú mức hạ cấp
// do DeliveryPlanner ghi, nhãn "Trả lời cho" trên tin khách gõ số.
const AGENT = { id: 1, name: 'Linh', type: 'user' as const, thumbnail: '' };
const CONTACT = { id: 3, name: 'Chị Hoa', type: 'contact' as const, thumbnail: '' };

function message(id: number, overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id,
        content: null,
        inbox_id: 1,
        conversation_id: 4,
        message_type: 1,
        content_type: 'text',
        status: 'sent',
        content_attributes: {},
        created_at: 1790359000 + id,
        private: false,
        source_id: null,
        sender: AGENT,
        sender_type: 'User',
        sender_id: AGENT.id,
        ...overrides,
    };
}

const question = message(10, {
    content: 'Bạn muốn nhận hàng khi nào?',
    content_type: 'input_select',
    content_attributes: {
        items: [
            { title: 'Giờ hành chính', value: 'office' },
            { title: 'Buổi tối', value: 'evening' },
        ],
        delivery: 'text_numbered',
    },
});

describe('tin có cấu trúc trong hộp thư', () => {
    it('vẽ lựa chọn bằng kit nhưng không bấm được, và ghi chú khách thật sự nhận gì', () => {
        render(<MessageList messages={[question]} channelType="Channel::Zalo" firstUnreadId={null} />);

        const chip = screen.getByRole('button', { name: 'Buổi tối' });
        expect(chip).toHaveProperty('disabled', true);
        expect(screen.getByText('Bạn muốn nhận hàng khi nào?')).toBeTruthy();
        expect(screen.getByText(/numbered list/)).toBeTruthy();
    });

    it('tin khách gõ "2" có nhãn "Trả lời cho" và bấm thì cuộn tới câu hỏi', () => {
        const onJump = vi.fn();
        const reply = message(11, {
            content: '2',
            message_type: 0,
            sender: CONTACT,
            sender_type: 'Contact',
            sender_id: CONTACT.id,
            content_attributes: { choice_of: 10 },
        });
        render(<MessageList messages={[question, reply]} channelType="Channel::Zalo" firstUnreadId={null} onJumpToMessage={onJump} />);

        fireEvent.click(screen.getByRole('button', { name: /Reply to: Bạn muốn nhận hàng khi nào\?/ }));
        expect(onJump).toHaveBeenCalledWith(10);
    });

    it('danh sách hội thoại dùng dòng xem trước của máy chủ khi tin không có content', () => {
        render(<MessagePreview message={message(12, { content_type: 'cards', preview_text: 'Bình men lam · 450.000đ' })} />);

        expect(screen.getByText('Bình men lam · 450.000đ')).toBeTruthy();
    });
});
