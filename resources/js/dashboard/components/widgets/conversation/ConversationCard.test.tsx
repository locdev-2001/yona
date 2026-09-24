import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
});
