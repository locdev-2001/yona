import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
import type { StickerItem } from './stickerApi';

const STICKER: StickerItem = { id: '98930', image_url: 'https://cdn.zalo.test/98930.webp', pack_id: '61900', label: null };
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

function StickerProbe() {
    const { messages, sendSticker, selectedConversation } = useConversation();

    return (
        <>
            <button type="button" disabled={!selectedConversation} onClick={() => sendSticker(STICKER)}>
                gửi sticker
            </button>
            {messages.map(message => (
                <output key={message.echo_id ?? message.id} data-testid="message">
                    {JSON.stringify({
                        id: message.id,
                        status: message.status,
                        content: message.content,
                        content_type: message.content_type,
                        attachments: message.attachments,
                    })}
                </output>
            ))}
        </>
    );
}

const renderedMessages = () => screen.queryAllByTestId('message').map(node => JSON.parse(node.textContent ?? '{}'));

async function sendOnce() {
    render(
        <ConversationProvider conversationId={4}>
            <StickerProbe />
        </ConversationProvider>,
    );
    const button = screen.getByRole('button', { name: 'gửi sticker' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
}

describe('sendSticker', () => {
    beforeEach(() => {
        getJson.mockReset();
        getJson.mockImplementation(routeGet);
        postJson.mockReset();
        alertSpy.mockReset();
    });

    it('hiện ngay tin chờ có ảnh sticker và chỉ gửi mã sticker lên máy chủ', async () => {
        postJson.mockImplementation(() => new Promise(() => undefined));

        await sendOnce();

        const [pending] = renderedMessages();
        expect(pending).toMatchObject({
            status: 'progress',
            content: null,
            content_type: 'sticker',
            attachments: [{ file_type: 'image', data_url: STICKER.image_url }],
        });

        const [url, body] = postJson.mock.calls.find(([calledUrl]) => calledUrl === MESSAGES_URL) ?? [];
        expect(url).toBe(MESSAGES_URL);
        expect(body).toEqual({
            private: false,
            content_type: 'sticker',
            sticker_id: '98930',
            echo_id: expect.any(String),
        });
    });

    it('máy chủ từ chối thì tin chờ thành thất bại và báo câu của máy chủ', async () => {
        postJson.mockImplementation((url: string) =>
            url === MESSAGES_URL
                ? Promise.reject(new ApiError(422, { error: 'Không tìm thấy sticker này.' }))
                : Promise.resolve(undefined),
        );

        await sendOnce();

        await waitFor(() => expect(renderedMessages()[0]?.status).toBe('failed'));
        await act(async () => undefined);
        expect(alertSpy).toHaveBeenCalledWith('Không tìm thấy sticker này.');
    });
});
