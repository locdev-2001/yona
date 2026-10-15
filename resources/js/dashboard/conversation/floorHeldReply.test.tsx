import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getJson, postJson, alertSpy } = vi.hoisted(() => ({
    getJson: vi.fn(),
    postJson: vi.fn(),
    alertSpy: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Lộc', ui_settings: {} } },
            currentAccount: { id: 2, features: {} },
        },
    }),
}));

vi.mock('dashboard/helper/apiClient', async importOriginal => ({
    ...(await importOriginal<typeof import('dashboard/helper/apiClient')>()),
    getJson: (url: string) => getJson(url),
    postJson: (url: string, body: Record<string, unknown>) => postJson(url, body),
}));

vi.mock('dashboard/composables/useAlert', () => ({ useAlert: alertSpy }));

import { ApiError } from 'dashboard/helper/apiClient';
import { ConversationProvider, useConversation } from './ConversationContext';

const MESSAGES_URL = '/api/v1/accounts/2/conversations/4/messages';

function routeGet(url: string): Promise<unknown> {
    if (url.includes('/conversations?')) {
        return Promise.resolve({
            data: {
                meta: { mine_count: 0, assigned_count: 0, unassigned_count: 0, all_count: 1 },
                payload: [
                    {
                        id: 4,
                        uuid: 'u-4',
                        account_id: 2,
                        inbox_id: 1,
                        meta: { sender: { id: 3, name: 'Khách A' }, channel: 'Channel::Zalo' },
                        messages: [],
                        status: 'open',
                        priority: null,
                        labels: [],
                        muted: false,
                        can_reply: true,
                        custom_attributes: {},
                        additional_attributes: {},
                        unread_count: 0,
                        last_activity_at: 100,
                        timestamp: 100,
                        created_at: 50,
                    },
                ],
            },
        });
    }
    if (url.includes('/messages')) return Promise.resolve({ payload: [], meta: {} });
    return Promise.resolve({ payload: [] });
}

function ReplyProbe() {
    const { messages, sendReply, selectedConversation, floorBlockedReply } = useConversation();

    return (
        <>
            <button
                type="button"
                disabled={!selectedConversation}
                onClick={() => sendReply({ content: 'Dạ váy này giá 420.000đ chị nha', isPrivate: false })}
            >
                gửi tin
            </button>
            <output data-testid="floor">{selectedConversation?.floor_held_until ?? ''}</output>
            <output data-testid="blocked">{floorBlockedReply ? `${floorBlockedReply.conversationId}|${floorBlockedReply.content}` : ''}</output>
            {messages.map(message => (
                <output key={message.echo_id ?? message.id} data-testid="message">
                    {JSON.stringify({ id: message.id, status: message.status, content: message.content })}
                </output>
            ))}
        </>
    );
}

const HELD_UNTIL = '2099-01-01T00:00:00.000Z';

describe('gửi đúng lúc AI vừa giữ lượt (409 floor_held)', () => {
    beforeEach(() => {
        getJson.mockReset();
        getJson.mockImplementation(routeGet);
        postJson.mockReset();
        alertSpy.mockReset();
    });

    it('bỏ bong bóng tạm, khoá theo mốc máy chủ báo, trả chữ về khung soạn và báo rõ', async () => {
        postJson.mockImplementation((url: string) =>
            url === MESSAGES_URL
                ? Promise.reject(new ApiError(409, { error: 'floor_held', message: 'x', floor_held_until: HELD_UNTIL } as never))
                : Promise.resolve(undefined),
        );
        render(
            <ConversationProvider conversationId={4}>
                <ReplyProbe />
            </ConversationProvider>,
        );
        const button = screen.getByRole('button', { name: 'gửi tin' });
        await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));

        fireEvent.click(button);

        await waitFor(() => expect(screen.getByTestId('blocked')).toHaveTextContent('4|Dạ váy này giá 420.000đ chị nha'));
        expect(screen.queryAllByTestId('message')).toHaveLength(0);
        expect(screen.getByTestId('floor')).toHaveTextContent(HELD_UNTIL);
        expect(alertSpy).toHaveBeenCalledTimes(1);
        expect(String(alertSpy.mock.calls[0][0])).not.toContain('floor_held');
    });
});
