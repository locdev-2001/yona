import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emitter } from 'shared/helpers/emitter';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: { user: { id: 1, ui_settings: {} } },
            currentAccount: { id: 2, features: {} },
        },
    }),
}));

const serverContacts = new Map<number, Record<string, unknown>>();
const getJson = vi.fn();
vi.mock('dashboard/helper/apiClient', async importOriginal => ({
    ...(await importOriginal<typeof import('dashboard/helper/apiClient')>()),
    getJson: (url: string) => getJson(url),
    postJson: () => Promise.resolve(undefined),
}));

import { ConversationProvider, useConversation } from './ConversationContext';
import { useContactDetails } from './conversationbox/contact/useContactDetails';
import type { ContactMeta, Conversation } from './types';

const NO_CONTACT: ContactMeta = { id: 0, name: null };

function buildConversation(id: number, sender: ContactMeta): Conversation {
    return {
        id,
        uuid: `u-${id}`,
        account_id: 2,
        inbox_id: 1,
        meta: { sender, channel: 'Channel::Zalo' },
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
        last_activity_at: 100 + id,
        timestamp: 100,
        waiting_since: 0,
        created_at: 50,
        updated_at: 100,
        sla_policy_id: null,
    };
}

function routeGet(url: string): Promise<unknown> {
    const contactMatch = url.match(/\/contacts\/(\d+)$/);
    if (contactMatch) {
        return Promise.resolve({ payload: serverContacts.get(Number(contactMatch[1])) });
    }
    if (url.includes('/conversations?')) {
        return Promise.resolve({
            data: {
                meta: { mine_count: 0, assigned_count: 0, unassigned_count: 0, all_count: 2 },
                payload: [
                    buildConversation(4, { id: 3, name: 'Khách ẩn danh', thumbnail: '' }),
                    buildConversation(5, { id: 9, name: 'Khách khác', thumbnail: 'https://yona.test/khac.png' }),
                ],
            },
        });
    }
    if (url.includes('/messages')) {
        return Promise.resolve({ payload: [], meta: {} });
    }
    return Promise.resolve({ payload: [] });
}

// Đọc avatar đúng như ba nơi trên màn hội thoại: card danh sách, header khung
// chat và panel liên hệ bên phải (bản sao qua useContactDetails).
function ConversationScreenProbe() {
    const { conversations, selectedConversation, accountId } = useConversation();
    const [panelContact] = useContactDetails(accountId, selectedConversation?.meta.sender ?? NO_CONTACT);

    return (
        <>
            {conversations.map(conversation => (
                <span key={conversation.id} data-testid={`card-${conversation.id}`}>
                    {conversation.meta.sender.thumbnail}
                </span>
            ))}
            <span data-testid="header">{selectedConversation?.meta.sender.thumbnail}</span>
            <span data-testid="panel">{panelContact.thumbnail}</span>
        </>
    );
}

describe('contact.updated trên màn hội thoại', () => {
    beforeEach(() => {
        serverContacts.clear();
        serverContacts.set(3, { id: 3, name: 'Khách ẩn danh', thumbnail: '', created_at: 1 });
        getJson.mockReset();
        getJson.mockImplementation(routeGet);
    });

    it('đổi avatar ở card, header và panel của khách đó mà không tải lại', async () => {
        render(
            <ConversationProvider conversationId={4}>
                <ConversationScreenProbe />
            </ConversationProvider>,
        );
        await waitFor(() => expect(screen.getByTestId('card-4')).toBeTruthy());

        const newThumbnail = 'https://yona.test/lan.png';
        serverContacts.set(3, { id: 3, name: 'Lan', thumbnail: newThumbnail, created_at: 1 });
        act(() => {
            emitter.emit('contact.updated', { id: 3, name: 'Lan', thumbnail: newThumbnail, account_id: 2 });
        });

        expect(screen.getByTestId('card-4').textContent).toBe(newThumbnail);
        expect(screen.getByTestId('header').textContent).toBe(newThumbnail);
        await waitFor(() => expect(screen.getByTestId('panel').textContent).toBe(newThumbnail));
        expect(screen.getByTestId('card-5').textContent).toBe('https://yona.test/khac.png');
    });
});
