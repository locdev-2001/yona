import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: { user: { id: 1, ui_settings: {} } },
            currentAccount: { id: 2, features: {} },
        },
    }),
}));

const postJson = vi.fn();
vi.mock('dashboard/helper/apiClient', async importOriginal => ({
    ...(await importOriginal<typeof import('dashboard/helper/apiClient')>()),
    getJson: (url: string) => routeGet(url),
    postJson: (url: string) => postJson(url),
}));

import { ConversationProvider, useConversation } from './ConversationContext';
import type { Conversation } from './types';

function buildConversation(id: number, unreadCount: number): Conversation {
    return {
        id,
        uuid: `u-${id}`,
        account_id: 2,
        inbox_id: 1,
        meta: { sender: { id: id + 10, name: `Khách ${id}` }, channel: 'Channel::Email' },
        messages: [],
        status: 'open',
        priority: null,
        labels: [],
        muted: false,
        can_reply: true,
        snoozed_until: null,
        custom_attributes: {},
        additional_attributes: {},
        agent_last_seen_at: 0,
        assignee_last_seen_at: 0,
        contact_last_seen_at: 0,
        first_reply_created_at: 0,
        unread_count: unreadCount,
        last_non_activity_message: null,
        last_activity_at: 100 + id,
        timestamp: 100,
        waiting_since: 0,
        created_at: 50,
        updated_at: 100,
        sla_policy_id: null,
    };
}

function routeGet(url: string): Promise<unknown> {
    if (url.includes('/conversations?')) {
        return Promise.resolve({
            data: {
                meta: { mine_count: 0, assigned_count: 0, unassigned_count: 0, all_count: 2 },
                payload: [buildConversation(4, 3), buildConversation(5, 2)],
            },
        });
    }
    if (url.includes('/messages')) return Promise.resolve({ payload: [], meta: {} });

    return Promise.resolve({ payload: [] });
}

function UnreadProbe() {
    const { conversations } = useConversation();

    return (
        <>
            {conversations.map(conversation => (
                <span key={conversation.id} data-testid={`unread-${conversation.id}`}>
                    {conversation.unread_count}
                </span>
            ))}
        </>
    );
}

describe('mở hội thoại có tin chưa đọc', () => {
    beforeEach(() => {
        postJson.mockReset();
        postJson.mockReturnValue(new Promise(() => undefined));
    });

    it('tắt chấm chưa đọc ở danh sách ngay, không chờ server trả lời', async () => {
        render(
            <ConversationProvider conversationId={4}>
                <UnreadProbe />
            </ConversationProvider>,
        );

        await waitFor(() => expect(postJson).toHaveBeenCalledWith('/api/v1/accounts/2/conversations/4/update_last_seen'));
        await waitFor(() => expect(screen.getByTestId('unread-4').textContent).toBe('0'));
        expect(screen.getByTestId('unread-5').textContent).toBe('2');
    });
});
