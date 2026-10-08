import { fireEvent, render } from '@testing-library/react';
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

const ZALO_INBOX = {
    name: 'Nguyễn Phước Lộc',
    channel_type: 'Channel::Zalo',
    platform: { key: 'zalo', name: 'Zalo', logo_url: '/brand-assets/platforms/zalo.webp' },
};

describe('thẻ hội thoại trong danh sách', () => {
    // Nền tảng đã hiện ở dòng tên hộp thư phía trên, avatar không vẽ badge lặp lại.
    it('avatar khách không mang badge nền tảng', () => {
        const { container } = render(
            <ConversationCard chat={CONVERSATION} currentContact={CONTACT} inbox={ZALO_INBOX} showInboxName />,
        );

        expect(container.querySelector('img')?.getAttribute('src')).toBe('/pham.png');
        expect(badgeOf(container)).toBeNull();
    });

    it.each([
        { isSelecting: false, selected: false, hasCheckbox: false },
        { isSelecting: true, selected: false, hasCheckbox: true },
        { isSelecting: false, selected: true, hasCheckbox: true },
    ])('checkbox chọn nhiều chỉ hiện ở chế độ chọn hoặc khi đã chọn: %o', ({ isSelecting, selected, hasCheckbox }) => {
        const { container } = render(
            <ConversationCard
                chat={CONVERSATION}
                currentContact={CONTACT}
                isSelecting={isSelecting}
                selected={selected}
            />,
        );

        expect(container.querySelector('input[type="checkbox"]') !== null).toBe(hasCheckbox);
    });

    it('rê chuột vào avatar không hiện checkbox', () => {
        const { container } = render(<ConversationCard chat={CONVERSATION} currentContact={CONTACT} />);

        fireEvent.mouseEnter(container.querySelector('img')!.parentElement!);

        expect(container.querySelector('input[type="checkbox"]')).toBeNull();
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
