import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Message from './Message';
import type { ConversationMessage } from 'dashboard/conversation/types';
import { emphasizeMentions, readGroupMentions, readGroupSender } from './helpers/groupSender';

const BASE_TIME = 1756707112;

function incoming(contentAttributes: Record<string, unknown>, content = 'Chào cả nhà'): ConversationMessage {
    return {
        id: 9,
        content,
        inbox_id: 58,
        conversation_id: 2,
        message_type: 0,
        content_type: 'text',
        status: 'sent',
        content_attributes: contentAttributes,
        created_at: BASE_TIME,
        private: false,
        source_id: null,
        sender: { id: 5, name: 'Nhóm Zalo', type: 'contact', thumbnail: '' },
        sender_id: 5,
        sender_type: 'Contact',
    };
}

const renderMessage = (payload: ConversationMessage) =>
    render(<Message message={payload} channelType="Channel::Zalo" />).container;

describe('tin nhóm hiện người gửi trên bong bóng', () => {
    const sender = { external_id: '555000111', name: 'Bình', avatar: '/binh.png' };

    it('hiện tên người gửi khi tin mang content_attributes.sender', () => {
        const container = renderMessage(incoming({ sender }));

        expect(container.textContent).toContain('Bình');
    });

    it('tên có dấu chồng vẫn cắt một dòng nhưng dòng đủ cao để không xén phần dấu', () => {
        const container = renderMessage(incoming({ sender: { ...sender, name: 'Đỗ Ngọc Ẫn' } }));
        const name = container.querySelector('[data-testid="group-sender-name"]');

        expect(name?.textContent).toBe('Đỗ Ngọc Ẫn');
        expect(name).toHaveClass('truncate', 'leading-5');
        expect(name).not.toHaveClass('leading-none');
    });

    it('dùng avatar người gửi', () => {
        const container = renderMessage(incoming({ sender }));

        expect(container.querySelector('img')?.getAttribute('src')).toBe('/binh.png');
    });

    it('tin không có sender thì bong bóng giữ nguyên như cũ', () => {
        const container = renderMessage(incoming({}));

        expect(container.textContent).toContain('Chào cả nhà');
        expect(container.querySelector('img')).toBeNull();
    });

    it('không gắn tên người gửi lên tin của chính mình (bên phải)', () => {
        const outgoing: ConversationMessage = {
            ...incoming({ sender }),
            message_type: 1,
            sender: { id: 3, name: 'Lộc', type: 'user', thumbnail: '' },
            sender_id: 3,
            sender_type: 'User',
        };
        const container = renderMessage(outgoing);

        expect(container.textContent).not.toContain('Bình');
    });
});

describe('đọc sender/mentions chuẩn hoá', () => {
    it('bỏ qua sender thiếu tên', () => {
        expect(readGroupSender({ sender: { external_id: '1' } })).toBeNull();
        expect(readGroupSender({})).toBeNull();
    });

    it('bỏ mục mention không có tên', () => {
        expect(readGroupMentions({ mentions: [{ offset: 0, length: 3 }, { name: 'An', offset: 0, length: 3 }] }))
            .toHaveLength(1);
    });
});

describe('tô đậm nhắc tên', () => {
    it('dùng offset/length do kênh cấp', () => {
        expect(emphasizeMentions('@An ơi xem giúp', [{ name: 'An', offset: 0, length: 3 }])).toBe(
            '**@An** ơi xem giúp',
        );
    });

    it('lùi về tìm chuỗi khi offset không khớp', () => {
        expect(emphasizeMentions('gửi @An nhé', [{ name: 'An', offset: 99, length: 3 }])).toBe('gửi **@An** nhé');
    });

    it('không đổi nội dung khi tin không có mention', () => {
        expect(emphasizeMentions('không nhắc ai', [])).toBe('không nhắc ai');
    });
});

describe('tin agent gửi có nhắc tên thành viên', () => {
    it('bong bóng bên phải tô đậm @Tên từ content_attributes.mentions', () => {
        const outgoing: ConversationMessage = {
            ...incoming(
                { mentions: [{ external_id: '555', name: 'Bình', offset: 0, length: 5 }] },
                '@Bình kiểm tra giúp đơn 123',
            ),
            message_type: 1,
            sender: { id: 3, name: 'Lộc', type: 'user', thumbnail: '' },
            sender_id: 3,
            sender_type: 'User',
        };
        const container = renderMessage(outgoing);

        expect(container.querySelector('strong')?.textContent).toBe('@Bình');
    });
});
