import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emitter } from 'shared/helpers/emitter';

// Inertia giữ nguyên object props giữa các lần vẽ khi trang không đổi.
const PAGE = vi.hoisted(() => ({
    url: '/app/accounts/2/conversations',
    props: {
        auth: { user: { id: 1, ui_settings: {} } },
        currentAccount: { id: 2, features: {} },
        inboxes: [{ id: 1, name: 'Zalo shop', channel_type: 'Channel::Zalo' }],
    },
}));
vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn() },
    usePage: () => PAGE,
}));

vi.mock('dashboard/composables/useAlert', () => ({ useAlert: vi.fn() }));

const getJson = vi.fn();
vi.mock('dashboard/helper/apiClient', async importOriginal => ({
    ...(await importOriginal<typeof import('dashboard/helper/apiClient')>()),
    getJson: (url: string) => getJson(url),
    postJson: () => Promise.resolve(undefined),
    postWithoutBody: () => Promise.resolve(undefined),
}));

// Đếm số lần thẻ thực sự vẽ (thẻ nằm dưới hàng danh sách).
const cardRenders = new Map<number, number>();
vi.mock('dashboard/components/widgets/conversation/ConversationCard', async importOriginal => {
    const { default: ConversationCard } = await importOriginal<typeof import('dashboard/components/widgets/conversation/ConversationCard')>();
    type CardProps = Parameters<typeof ConversationCard>[0];

    return {
        default: (props: CardProps) => {
            cardRenders.set(props.chat.id, (cardRenders.get(props.chat.id) ?? 0) + 1);
            return <ConversationCard {...props} />;
        },
    };
});

import { ConversationProvider, useConversation } from './ConversationContext';
import ConversationList from './chatlist/ConversationList';
import type { Conversation } from './types';

const LIST_SIZE = 100;
const TARGET_ID = 50;

function conversation(id: number): Conversation {
    return {
        id,
        uuid: `uuid-${id}`,
        account_id: 2,
        inbox_id: 1,
        meta: { sender: { id, name: `Khách ${id}` }, assignee: { id: 1, name: 'Tôi' }, channel: 'Channel::Zalo' },
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
        last_activity_at: 100_000 - id,
        timestamp: 100_000 - id,
        waiting_since: 0,
        created_at: 100_000 - id,
        updated_at: 100_000 - id,
        sla_policy_id: null,
    } as Conversation;
}

function routeGet(url: string): Promise<unknown> {
    if (url.includes('/conversations?')) {
        const payload = Array.from({ length: LIST_SIZE }, (_unused, index) => conversation(index + 1));
        return Promise.resolve({
            data: { meta: { mine_count: LIST_SIZE, assigned_count: LIST_SIZE, unassigned_count: 0, all_count: LIST_SIZE, next_cursor: null }, payload },
        });
    }

    return Promise.resolve({ payload: [], meta: {} });
}

function Screen() {
    const { conversations } = useConversation();

    return <ConversationList conversationList={conversations} showAssignee showEndOfListMessage onLoadMore={() => undefined} />;
}

async function renderLoadedList() {
    render(
        <ConversationProvider>
            <Screen />
        </ConversationProvider>,
    );
    await waitFor(() => expect(screen.getAllByText(/^Khách \d+$/)).toHaveLength(LIST_SIZE));
    cardRenders.clear();
}

function redrawnCardIds(): number[] {
    return [...cardRenders.keys()].sort((a, b) => a - b);
}

beforeEach(() => {
    getJson.mockReset();
    getJson.mockImplementation(routeGet);
    cardRenders.clear();
});

describe('danh sách hội thoại khi có cập nhật realtime', () => {
    it('tin mới vào một hội thoại chỉ vẽ lại thẻ của hội thoại đó', async () => {
        await renderLoadedList();

        act(() => {
            emitter.emit('message.created', {
                id: 9001,
                conversation_id: TARGET_ID,
                content: 'Shop còn hàng không?',
                message_type: 0,
                content_type: 'text',
                status: 'sent',
                created_at: 100_000,
                sender: { id: TARGET_ID, name: `Khách ${TARGET_ID}`, type: 'contact' },
                attachments: [],
            });
        });

        expect(screen.getByText('Shop còn hàng không?')).toBeTruthy();
        expect(redrawnCardIds()).toEqual([TARGET_ID]);
    });

    it('đổi một hội thoại chỉ vẽ lại thẻ của hội thoại đó', async () => {
        await renderLoadedList();

        act(() => {
            emitter.emit('conversation.updated', { ...conversation(TARGET_ID), priority: 'urgent', updated_at: 200_000 });
        });

        expect(redrawnCardIds()).toEqual([TARGET_ID]);
    });
});
