import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../../i18n';
import ConversationCard from './ConversationCard';
import type { ContactMeta, Conversation } from '../../../conversation/types';

vi.mock('dashboard/realtime/hooks', () => ({
    useContactAvailabilityStatus: () => 'offline',
}));

const CONTACT = { id: 5, name: 'Pham Nguyen', thumbnail: '/pham.png' } as ContactMeta;

const CONVERSATION = {
    id: 138,
    inbox_id: 59,
    unread_count: 0,
    status: 'open',
    priority: null,
    labels: [],
    messages: [],
    timestamp: 1756707112,
    created_at: 1756707112,
    meta: { sender: CONTACT, channel: 'Channel::Zalo' },
    last_non_activity_message: null,
} as unknown as Conversation;

const badgeOf = (container: HTMLElement) => container.querySelector('[data-testid="avatar-platform-badge"]');

describe('thẻ hội thoại trong danh sách', () => {
    it('avatar khách mang badge nền tảng của hộp thư', () => {
        const { container } = render(
            <ConversationCard
                chat={CONVERSATION}
                currentContact={CONTACT}
                inbox={{
                    name: 'Nguyễn Phước Lộc',
                    channel_type: 'Channel::Zalo',
                    platform: { key: 'zalo', name: 'Zalo', logo_url: '/brand-assets/platforms/zalo.svg' },
                }}
            />,
        );

        expect(container.querySelector('img')?.getAttribute('src')).toBe('/pham.png');
        expect(badgeOf(container)?.querySelector('img')?.getAttribute('alt')).toBe('Zalo');
    });

    it('hộp thư chưa rõ (prop inboxes chưa có) thì không vẽ badge', () => {
        const { container } = render(<ConversationCard chat={CONVERSATION} currentContact={CONTACT} />);

        expect(badgeOf(container)).toBeNull();
    });

    describe('cột thời gian', () => {
        afterEach(() => setLocale('en'));

        // Tiếng Việt ("26 phút • 3 phút") rộng hơn khoảng chừa cố định cho "26m • 3m":
        // thời gian phải nằm cùng hàng với tên để tên tự nhường chỗ, không bị đè.
        it('nằm cùng hàng với tên khách và hiện đơn vị tiếng Việt', () => {
            setLocale('vi');
            const now = Math.floor(Date.now() / 1000);
            const chat = { ...CONVERSATION, created_at: now - 26 * 60, timestamp: now - 3 * 60 } as Conversation;

            const { container, getByText } = render(<ConversationCard chat={chat} currentContact={CONTACT} />);
            const name = container.querySelector('h4.conversation--user');
            const time = getByText('26 phút • 3 phút');

            expect(name?.parentElement?.contains(time)).toBe(true);
            expect(name?.className).not.toMatch(/pr-16/);
        });
    });

    it('đang tìm trong danh sách thì tô đoạn khớp trên tên khách và tin cuối', () => {
        const chat = {
            ...CONVERSATION,
            last_non_activity_message: { id: 1, content: 'Đơn của chị Nguyên đã giao', message_type: 0, attachments: [] },
        } as unknown as Conversation;

        const { container } = render(<ConversationCard chat={chat} currentContact={CONTACT} highlightQuery="nguyen" />);
        const marks = [...container.querySelectorAll('mark')].map(mark => mark.textContent);

        expect(marks).toEqual(['Nguyen', 'Nguyên']);
    });

    it('không tìm thì không tô gì', () => {
        const { container } = render(<ConversationCard chat={CONVERSATION} currentContact={CONTACT} />);

        expect(container.querySelector('mark')).toBeNull();
    });
});
