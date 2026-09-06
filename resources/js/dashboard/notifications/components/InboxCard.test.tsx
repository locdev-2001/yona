import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import InboxCard, { formatPushMessage } from './InboxCard';
import type { NotificationRecord } from '../types';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 2 }, auth: { user: { id: 1 } } } }),
    router: { visit: vi.fn() },
}));

function buildNotification(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
    return {
        id: 1,
        notification_type: 'conversation_assignment',
        push_message_title: '',
        push_message_body: 'Trang Nguyen: Cho hoi ve gia',
        primary_actor_type: 'Conversation',
        primary_actor_id: 4,
        primary_actor: {
            id: 4,
            inbox_id: 1,
            priority: null,
            meta: { sender: { id: 3, name: 'Trang Nguyen', thumbnail: '' } },
        },
        read_at: null,
        secondary_actor: null,
        user: null,
        created_at: 1757000000,
        last_activity_at: 1757000000,
        snoozed_until: null,
        meta: null,
        ...overrides,
    } as NotificationRecord;
}

const noop = () => undefined;

function renderCard(notification: NotificationRecord) {
    return render(
        <InboxCard
            inboxItem={notification}
            stateInbox={{ name: 'api-test', channel_type: 'Channel::Api' }}
            onClick={noop}
            onMarkAsRead={noop}
            onMarkAsUnread={noop}
            onDelete={noop}
            onContextMenuOpen={noop}
            onContextMenuClose={noop}
        />,
    );
}

describe('formatPushMessage', () => {
    it('drops the empty sender prefix', () => {
        expect(formatPushMessage(': No content', 'emphasis')).toBe('No content');
    });

    it('wraps the sender name in the emphasis class', () => {
        expect(formatPushMessage('Trang: hello', 'emphasis')).toBe('<span class="emphasis">Trang:</span> hello');
    });
});

describe('InboxCard', () => {
    it('shows the unread dot and the notification type label', () => {
        const { container, getByText } = renderCard(buildNotification());

        expect(container.querySelector('.bg-n-iris-10')).not.toBeNull();
        expect(getByText('Assigned to you')).toBeTruthy();
    });

    it('drops the unread dot once the notification is read', () => {
        const { container } = renderCard(buildNotification({ read_at: '2026-09-06T00:00:00Z' }));

        expect(container.querySelector('.bg-n-iris-10')).toBeNull();
    });

    it('shows the snooze row instead of the type when snoozed', () => {
        const { container } = renderCard(
            buildNotification({ snoozed_until: new Date(Date.now() + 86400000).toISOString() }),
        );

        expect(container.querySelector('.i-lucide-alarm-clock-plus')).not.toBeNull();
    });
});
