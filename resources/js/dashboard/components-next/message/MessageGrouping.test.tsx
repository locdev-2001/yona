import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ConversationMessage } from 'dashboard/conversation/types';
import { setLocale } from '../../../i18n';
import MessageList from './MessageList';

const AGENT = { id: 1, name: 'John', type: 'user' as const, thumbnail: '' };
const CONTACT = { id: 3, name: 'Trang Nguyen', type: 'contact' as const, thumbnail: '' };
const T0 = 1756707112;
const RECEIPTS = ['event_delivered', 'event_seen', 'outbound_reaction'];

function outgoing(id: number, createdAt: number, overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id,
        content: `tin ${id}`,
        inbox_id: 1,
        conversation_id: 4,
        message_type: 1,
        content_type: 'text',
        status: 'read',
        content_attributes: {},
        created_at: createdAt,
        private: false,
        source_id: null,
        sender: AGENT,
        sender_type: 'User',
        sender_id: AGENT.id,
        ...overrides,
    };
}

const incoming = (id: number, createdAt: number, overrides: Partial<ConversationMessage> = {}) =>
    outgoing(id, createdAt, {
        message_type: 0,
        status: 'sent',
        sender: CONTACT,
        sender_type: 'Contact',
        sender_id: CONTACT.id,
        ...overrides,
    });

const renderList = (messages: ConversationMessage[], onToggleReaction = vi.fn()) =>
    render(
        <MessageList
            messages={messages}
            channelType="Channel::Zalo"
            inboxCapabilities={RECEIPTS}
            onToggleReaction={onToggleReaction}
        />,
    ).container;

const bubbleOf = (container: HTMLElement, id: number) => container.querySelector(`#message${id} [data-bubble-name]`);
const statusIcons = (container: HTMLElement, id: number) =>
    container.querySelectorAll(`#message${id} .i-lucide-check-check`).length;
const avatarOf = (container: HTMLElement, id: number) => container.querySelector(`#message${id} .\\[grid-area\\:avatar\\]`);

describe('gộp nhóm tin liên tiếp trong hộp thư', () => {
    it('ba tin của mình trong hai phút: bo góc đầu, giữa, cuối; trạng thái và avatar chỉ ở tin cuối', () => {
        const container = renderList([outgoing(1, T0), outgoing(2, T0 + 40), outgoing(3, T0 + 100)]);

        expect(bubbleOf(container, 1)?.className).toContain('ltr:rounded-br-md');
        expect(bubbleOf(container, 2)?.className).toContain('ltr:rounded-r-md');
        expect(bubbleOf(container, 3)?.className).toContain('ltr:rounded-tr-md');

        expect(statusIcons(container, 1)).toBe(0);
        expect(statusIcons(container, 2)).toBe(0);
        expect(statusIcons(container, 3)).toBe(1);

        expect(avatarOf(container, 1)).toBeNull();
        expect(avatarOf(container, 3)).not.toBeNull();
    });

    it('cách nhau từ hai phút trở lên thì tách nhóm', () => {
        const container = renderList([outgoing(1, T0), outgoing(2, T0 + 120)]);

        expect(bubbleOf(container, 1)?.className).not.toContain('rounded-br-md');
        expect(statusIcons(container, 1)).toBe(1);
        expect(statusIcons(container, 2)).toBe(1);
    });

    it('giờ gửi không lặp dưới từng tin: nằm ở tooltip và mốc thời gian khi cách nhau lâu', () => {
        const container = renderList([incoming(1, T0), incoming(2, T0 + 30), outgoing(3, T0 + 60 * 60)]);

        expect(container.querySelectorAll('#message1 time, #message2 time, #message3 time')).toHaveLength(0);
        expect(container.querySelectorAll('[data-testid="message-time-divider"]')).toHaveLength(2);
        expect(bubbleOf(container, 1)?.parentElement?.getAttribute('title')).toBeTruthy();
    });

    it('ghi chú riêng giữ màu vàng và khoá ở tin cuối nhóm', () => {
        const container = renderList([outgoing(1, T0), outgoing(2, T0 + 10, { private: true })]);

        expect(bubbleOf(container, 2)?.className).toContain('bg-n-solid-amber');
        expect(container.querySelector('#message2 .i-lucide-lock-keyhole')).not.toBeNull();
    });
});

describe('tin chỉ có emoji', () => {
    it('hiện cỡ lớn, không nền bong bóng', () => {
        const container = renderList([incoming(1, T0, { content: '😂👍' })]);

        expect(container.querySelector('#message1 [data-jumbo-emoji]')?.textContent).toBe('😂👍');
        expect(bubbleOf(container, 1)?.className).toContain('!bg-transparent');
    });

    it('ghi chú riêng chỉ có emoji vẫn giữ khung vàng', () => {
        const container = renderList([outgoing(1, T0, { content: '👍', private: true })]);

        expect(container.querySelector('#message1 [data-jumbo-emoji]')).toBeNull();
    });
});

describe('viên cảm xúc dưới bong bóng', () => {
    beforeAll(() => setLocale('vi'));
    afterAll(() => setLocale('en'));

    const reactions = [
        { emoji: '👍', by: 'agent:1' },
        { emoji: '❤️', by: 'uid-lan' },
        { emoji: '❤️', by: 'uid-minh' },
        { emoji: '😆', by: 'uid-lan' },
        { emoji: '😮', by: 'uid-minh' },
    ];
    const groupMessage = (id: number, externalId: string, name: string, extra = {}) =>
        incoming(id, T0 + id, {
            content_attributes: { sender: { external_id: externalId, name }, ...extra },
        });

    it('nằm ngoài khung bong bóng, tối đa ba emoji và tổng số lượt', () => {
        const container = renderList([groupMessage(1, 'uid-lan', 'Lan', { reactions })]);
        const pill = container.querySelector('#message1 [data-yona-reactions]');

        expect(bubbleOf(container, 1)?.contains(pill as Node)).toBe(false);
        expect(pill?.textContent).toBe('❤️👍😆5');
    });

    it('bấm viên mở danh sách ai thả gì; dòng của mình bấm lại là gỡ', () => {
        const onToggleReaction = vi.fn();
        const container = renderList(
            [groupMessage(1, 'uid-lan', 'Lan', { reactions }), groupMessage(2, 'uid-minh', 'Minh')],
            onToggleReaction,
        );

        fireEvent.click(container.querySelector('#message1 [data-yona-reactions]') as HTMLElement);
        const rows = screen.getAllByTestId('reaction-row');

        expect(rows.map(row => row.textContent)).toEqual([
            '👍BạnBấm để gỡ1',
            '❤️Lan, Minh2',
            '😆Lan1',
            '😮Minh1',
        ]);
        expect(rows[0].tagName).toBe('BUTTON');
        expect(rows[1].tagName).toBe('DIV');

        fireEvent.click(rows[0]);
        expect(onToggleReaction).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), '👍');
    });

    it('thành viên nhóm chưa nhắn tin nào vẫn hiện tên nhờ danh bạ nhóm', () => {
        const container = render(
            <MessageList
                messages={[groupMessage(1, 'uid-lan', 'Lan', { reactions: [{ emoji: '👍', by: 'uid-dung' }] })]}
                channelType="Channel::Zalo"
                inboxCapabilities={RECEIPTS}
                groupMembers={[{ external_id: 'uid-dung', name: 'Dung' }]}
            />,
        ).container;

        fireEvent.click(container.querySelector('#message1 [data-yona-reactions]') as HTMLElement);

        expect(screen.getAllByTestId('reaction-row').map(row => row.textContent)).toEqual(['👍Dung1']);
    });

    it('hội thoại một-một: người thả phía khách là liên hệ; bản ghi cũ không rõ người thả chỉ hiện số', () => {
        const container = renderList([
            incoming(1, T0, { content_attributes: { reactions: [{ emoji: '❤️', by: 'uid-trang' }, '😮'] } }),
        ]);

        fireEvent.click(container.querySelector('#message1 [data-yona-reactions]') as HTMLElement);

        expect(screen.getAllByTestId('reaction-row').map(row => row.textContent)).toEqual([
            '❤️Trang Nguyen1',
            '😮1',
        ]);
    });
});
