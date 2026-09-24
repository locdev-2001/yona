import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        url: '/app/accounts/2/conversations',
        props: {
            auth: { user: { id: 1, ui_settings: {} } },
            currentAccount: { id: 2, features: {} },
        },
    }),
}));

vi.mock('dashboard/composables/useAlert', () => ({ useAlert: vi.fn() }));

const getJson = vi.fn();
vi.mock('dashboard/helper/apiClient', async importOriginal => ({
    ...(await importOriginal<typeof import('dashboard/helper/apiClient')>()),
    getJson: (url: string) => getJson(url),
    postJson: () => Promise.resolve(undefined),
    postWithoutBody: () => Promise.resolve(undefined),
}));

import { ConversationProvider, useConversation } from './ConversationContext';
import type { Conversation } from './types';

const TAB_COUNTS = { mine_count: 30, assigned_count: 30, unassigned_count: 0, all_count: 30 };

function conversation(id: number): Conversation {
    return {
        id,
        uuid: `uuid-${id}`,
        account_id: 2,
        inbox_id: 1,
        meta: { sender: { id, name: `Khách ${id}` }, assignee: { id: 1, name: 'Tôi' }, channel: 'Channel::Api' },
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
        unread_count: 0,
        last_non_activity_message: null,
        last_activity_at: 1000 - id,
        timestamp: 1000 - id,
        waiting_since: 0,
        created_at: 1000 - id,
        updated_at: 1000 - id,
        sla_policy_id: null,
    } as Conversation;
}

const ids = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_unused, index) => from + index);

// Máy chủ giả: trang đầu 25 hội thoại kèm số đếm tab + con trỏ, trang theo con trỏ
// chỉ mang con trỏ kế (hết thì null), đúng hợp đồng của GET /conversations.
function routeGet(url: string): Promise<unknown> {
    if (url.includes('/conversations?')) {
        const query = new URLSearchParams(url.split('?')[1]);
        if (query.get('cursor') === 'trang-2') {
            return Promise.resolve({ data: { meta: { next_cursor: null }, payload: ids(26, 30).map(conversation) } });
        }

        return Promise.resolve({ data: { meta: { ...TAB_COUNTS, next_cursor: 'trang-2' }, payload: ids(1, 25).map(conversation) } });
    }

    return Promise.resolve({ payload: [], meta: {} });
}

function Probe() {
    const { conversations, listMeta, endReached, listLoading, loadMoreConversations } = useConversation();

    return (
        <>
            <span data-testid="count">{conversations.length}</span>
            <span data-testid="all-count">{listMeta.all_count}</span>
            <span data-testid="end">{String(endReached)}</span>
            <span data-testid="loading">{String(listLoading)}</span>
            <button type="button" onClick={loadMoreConversations}>
                tải thêm
            </button>
        </>
    );
}

beforeEach(() => {
    getJson.mockReset();
    getJson.mockImplementation(routeGet);
});

describe('cuộn danh sách hội thoại bằng con trỏ', () => {
    it('trang sau gửi con trỏ thay cho số trang và giữ số đếm tab của trang đầu', async () => {
        render(
            <ConversationProvider>
                <Probe />
            </ConversationProvider>,
        );

        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('25'));
        await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
        expect(screen.getByTestId('end').textContent).toBe('false');

        await act(async () => screen.getByText('tải thêm').click());

        await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('30'));
        const listRequests = getJson.mock.calls.map(([url]) => String(url)).filter(url => url.includes('/conversations?'));
        const cursorRequest = listRequests.at(-1)!;
        expect(cursorRequest).toContain('cursor=trang-2');
        expect(cursorRequest).not.toContain('page=');
        expect(screen.getByTestId('all-count').textContent).toBe('30');
        expect(screen.getByTestId('end').textContent).toBe('true');
    });
});
