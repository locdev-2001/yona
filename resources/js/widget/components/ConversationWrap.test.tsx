import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MESSAGE_TYPE } from '../helpers/constants';
import { widgetStore } from '../store/widgetStore';
import ConversationWrap from './ConversationWrap';
import WidgetMessageHost from '../messaging/WidgetMessageHost';
import type { WidgetMessage } from '../types';

const agent = { id: 9, name: 'Robert' };
const BASE = 1758000000;

const load = (messages: WidgetMessage[]) =>
    act(() => {
        widgetStore.clearConversations();
        messages.forEach(message => widgetStore.addOrUpdateMessage(message));
    });

const agentMessage = (id: number, createdAt: number, overrides: Partial<WidgetMessage> = {}): WidgetMessage => ({
    id,
    content: `agent ${id}`,
    message_type: MESSAGE_TYPE.OUTGOING,
    created_at: createdAt,
    sender: agent,
    ...overrides,
});

const visitorMessage = (id: number, createdAt: number, overrides: Partial<WidgetMessage> = {}): WidgetMessage => ({
    id,
    content: `khach ${id}`,
    message_type: MESSAGE_TYPE.INCOMING,
    created_at: createdAt,
    status: 'sent',
    ...overrides,
});

beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => vi.restoreAllMocks());

describe('ConversationWrap', () => {
    it('gom tin liên tiếp cùng người trong 2 phút, mốc giờ chỉ dưới tin cuối nhóm', () => {
        load([
            agentMessage(1, BASE),
            agentMessage(2, BASE + 30),
            visitorMessage(3, BASE + 40),
            visitorMessage(4, BASE + 60),
            visitorMessage(5, BASE + 400),
        ]);
        const { container } = render(<ConversationWrap />);

        const groups = container.querySelectorAll('.yona-msg-group');
        expect(groups).toHaveLength(3);
        expect(groups[0].querySelectorAll('.yona-msg')).toHaveLength(2);
        expect(groups[1].querySelectorAll('.yona-msg')).toHaveLength(2);
        expect(container.querySelectorAll('.yona-msg-meta')).toHaveLength(3);
        expect(groups[1].querySelector('.yona-msg-meta')?.textContent).toContain('Sent');
        expect(groups[0].querySelector('.yona-msg-meta')?.textContent).not.toContain('Sent');
    });

    it('avatar agent hiện một lần ở tin cuối nhóm', () => {
        load([agentMessage(1, BASE), agentMessage(2, BASE + 30)]);
        const { container } = render(<ConversationWrap />);

        const avatarSlots = [...container.querySelectorAll('.yona-msg')].map(row => row.firstElementChild);
        expect(avatarSlots.map(slot => slot?.childElementCount)).toStrictEqual([0, 1]);
    });

    it('Đã xem khi agent đọc hội thoại sau lúc khách gửi', async () => {
        load([visitorMessage(3, BASE)]);
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ id: 1, status: 'open', agent_last_seen_at: BASE + 10 })),
        );
        await act(() => widgetStore.getConversationAttributes());
        const { container } = render(<ConversationWrap />);

        expect(container.querySelector('.yona-msg-meta')?.textContent).toContain('Seen');
    });

    it('tin trả lời mang khối trích dẫn, bấm vào nhảy tới tin gốc', () => {
        load([agentMessage(1, BASE), visitorMessage(2, BASE + 30, { content_attributes: { in_reply_to: 1 } })]);
        render(<ConversationWrap />);

        const quote = screen.getByTitle('View original message');
        expect(quote.textContent).toContain('Robert');
        expect(quote.textContent).toContain('agent 1');

        fireEvent.click(quote);

        const original = document.getElementById('yona-msg-1');
        expect(original?.scrollIntoView).toHaveBeenCalled();
        expect(original?.classList.contains('yona-chat-highlight')).toBe(true);
    });

    it('tin đã thu hồi để lại bong bóng nét đứt cho cả hai bên', () => {
        load([
            agentMessage(1, BASE, { content_attributes: { deleted: true } }),
            visitorMessage(2, BASE + 200, { content_attributes: { deleted: true } }),
        ]);
        const { container } = render(<ConversationWrap />);

        const deleted = container.querySelectorAll('.yona-deleted-bubble');
        expect(deleted).toHaveLength(2);
        expect(deleted[0].textContent).toBe('This message was unsent');
        expect(deleted[1].textContent).toBe('You unsent a message');
    });

    it('sticker đứng trần; thẻ cards đời cũ (type/text/uri) vẫn thành băng trượt của message kit', () => {
        load([
            visitorMessage(1, BASE, {
                content: null,
                content_type: 'sticker',
                content_attributes: { sticker: { id: 'hi', url: '/hi.png' } },
            }),
            agentMessage(2, BASE + 400, {
                content: 'Có 3 mẫu',
                content_type: 'cards',
                content_attributes: {
                    items: [
                        { title: 'Ergo M', actions: [{ type: 'link', text: 'Xem chi tiết', uri: 'https://a.vn' }] },
                        { title: 'Ergo L', actions: [{ type: 'link', text: 'Xem chi tiết', uri: 'https://b.vn' }] },
                    ],
                },
            }),
        ]);
        const { container } = render(
            <WidgetMessageHost>
                <ConversationWrap />
            </WidgetMessageHost>,
        );

        const sticker = container.querySelector('img.yona-sticker');
        expect(sticker?.getAttribute('src')).toBe('/hi.png');
        expect(sticker?.closest('.yona-text-bubble')).toBeNull();
        expect(container.querySelectorAll('.mk-track > .mk-card')).toHaveLength(2);
        expect(screen.getAllByRole('link', { name: 'Xem chi tiết' })).toHaveLength(2);
    });

    it('đang đọc phía trên thì tin agent mới không kéo xuống đáy, hiện nút "Tin nhắn mới" để nhảy xuống', () => {
        load([agentMessage(1, BASE), visitorMessage(2, BASE + 30)]);
        const { container } = render(<ConversationWrap />);
        const scroller = container.querySelector('.conversation--container') as HTMLDivElement;
        Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 2000 });
        Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 500 });
        scroller.scrollTo = vi.fn();
        scroller.scrollTop = 200;
        fireEvent.scroll(scroller);

        act(() => widgetStore.addOrUpdateMessage(agentMessage(3, BASE + 400)));

        expect(scroller.scrollTop).toBe(200);
        fireEvent.click(screen.getByRole('button', { name: 'New messages' }));
        expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 2000, behavior: 'smooth' });
        expect(screen.queryByRole('button', { name: 'New messages' })).not.toBeInTheDocument();
    });
});

describe('avatar nhân viên trong luồng tin', () => {
    it('tin agent và bong bóng đang gõ dùng cùng avatar chữ tắt tông ấm như header', () => {
        load([visitorMessage(1, BASE), agentMessage(2, BASE + 30, { sender: { id: 7, name: 'Lan Nguyễn' } })]);
        act(() => widgetStore.toggleAgentTyping('on', { name: 'Minh Trần', avatar_url: null }));
        const { container } = render(<ConversationWrap />);

        const agentAvatar = container.querySelector('.yona-msg-group:last-of-type [aria-hidden=true].rounded-full');
        const typingAvatar = screen.getByRole('status').querySelector('.rounded-full');

        expect(agentAvatar?.textContent).toBe('LN');
        expect(typingAvatar?.textContent).toBe('MT');
        [agentAvatar, typingAvatar].forEach(avatar => expect(avatar?.className).toContain('bg-[var(--yona-chat-avatar)]'));
        act(() => widgetStore.toggleAgentTyping('off'));
    });
});
