import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getJson, postJson, postForm, alertSpy } = vi.hoisted(() => ({
    getJson: vi.fn(),
    postJson: vi.fn(),
    postForm: vi.fn(),
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
    postForm: (url: string, form: FormData) => postForm(url, form),
}));

vi.mock('dashboard/composables/useAlert', () => ({ useAlert: alertSpy }));

import { ApiError } from 'dashboard/helper/apiClient';
import { ConversationProvider, useConversation } from './ConversationContext';
import type { ConversationMessage } from './types';

const MESSAGES_URL = '/api/v1/accounts/2/conversations/4/messages';
const PHOTO = new File(['png'], 'anh-san-pham.png', { type: 'image/png' });
const PREVIEW_URL = 'data:image/png;base64,AAAA';

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

function OutboxProbe() {
    const { messages, sendReply, retryFailedMessage, deleteConversationMessage, selectedConversation } = useConversation();
    const failed = messages.find(message => message.status === 'failed');

    return (
        <>
            <button
                type="button"
                disabled={!selectedConversation}
                onClick={() =>
                    sendReply({ content: '', isPrivate: false, attachments: [{ file: PHOTO, previewUrl: PREVIEW_URL }] })
                }
            >
                gửi ảnh
            </button>
            <button type="button" onClick={() => failed && void retryFailedMessage(failed)}>
                gửi lại
            </button>
            <button type="button" onClick={() => failed && void deleteConversationMessage(failed)}>
                xoá
            </button>
            {messages.map(message => (
                <output key={message.echo_id ?? message.id} data-testid="message">
                    {JSON.stringify(message)}
                </output>
            ))}
        </>
    );
}

const renderedMessages = (): ConversationMessage[] =>
    screen.queryAllByTestId('message').map(node => JSON.parse(node.textContent ?? '{}'));

async function sendPhoto() {
    render(
        <ConversationProvider conversationId={4}>
            <OutboxProbe />
        </ConversationProvider>,
    );
    const button = screen.getByRole('button', { name: 'gửi ảnh' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
}

function serverMessage(echoId: string | undefined): ConversationMessage {
    return {
        id: 501,
        content: null,
        inbox_id: 1,
        conversation_id: 4,
        message_type: 1,
        content_type: 'text',
        status: 'sent',
        content_attributes: {},
        created_at: 200,
        private: false,
        source_id: null,
        echo_id: echoId,
        attachments: [{ id: 9, file_type: 'image', data_url: 'https://cdn.yona.test/anh.png' }],
    };
}

describe('gửi tệp từ ô soạn', () => {
    beforeEach(() => {
        getJson.mockReset();
        getJson.mockImplementation(routeGet);
        postJson.mockReset();
        postJson.mockResolvedValue(undefined);
        postForm.mockReset();
        alertSpy.mockReset();
    });

    it('bấm gửi là có ngay tin tạm mang ảnh ở máy; máy chủ trả về thì thay đúng tin đó', async () => {
        let resolveUpload: (message: ConversationMessage) => void = () => undefined;
        postForm.mockImplementation(() => new Promise(resolve => (resolveUpload = resolve)));

        await sendPhoto();

        const [pending] = renderedMessages();
        expect(pending).toMatchObject({
            status: 'progress',
            content: null,
            attachments: [{ file_type: 'image', data_url: PREVIEW_URL, filename: 'anh-san-pham.png' }],
        });
        expect(pending.id).toBeLessThan(0);
        const [url, form] = postForm.mock.calls[0] as [string, FormData];
        expect(url).toBe(MESSAGES_URL);
        expect(form.getAll('attachments[]')).toHaveLength(1);
        expect(form.get('echo_id')).toBe(pending.echo_id);

        await act(async () => resolveUpload(serverMessage(pending.echo_id)));

        expect(renderedMessages()).toHaveLength(1);
        expect(renderedMessages()[0]).toMatchObject({ id: 501, status: 'sent' });
    });

    it('tải lên hỏng: tin tạm giữ ảnh, báo lỗi; Gửi lại gửi đúng tệp với cùng echo_id', async () => {
        postForm.mockRejectedValueOnce(new ApiError(500, { error: 'Mạng chập chờn.' }));

        await sendPhoto();

        await waitFor(() => expect(renderedMessages()[0]?.status).toBe('failed'));
        const [failed] = renderedMessages();
        expect(failed.content_attributes.external_error).toEqual({ message: 'Mạng chập chờn.' });
        expect(failed.attachments).toHaveLength(1);
        expect(alertSpy).toHaveBeenCalledWith('Mạng chập chờn.');

        let resolveUpload: (message: ConversationMessage) => void = () => undefined;
        postForm.mockImplementation(() => new Promise(resolve => (resolveUpload = resolve)));
        fireEvent.click(screen.getByRole('button', { name: 'gửi lại' }));

        await waitFor(() => expect(renderedMessages()[0]?.status).toBe('progress'));
        expect(renderedMessages()[0].content_attributes.external_error).toBeUndefined();
        const retriedForm = postForm.mock.calls[1][1] as FormData;
        expect(retriedForm.get('echo_id')).toBe(failed.echo_id);
        expect((retriedForm.get('attachments[]') as File).name).toBe('anh-san-pham.png');
        expect(postJson).not.toHaveBeenCalledWith(expect.stringContaining('/retry'), expect.anything());

        await act(async () => resolveUpload(serverMessage(failed.echo_id)));
        expect(renderedMessages()).toHaveLength(1);
        expect(renderedMessages()[0]).toMatchObject({ id: 501, status: 'sent' });
    });

    it('tải lên hỏng rồi Xoá thì tin tạm biến mất, không gọi máy chủ', async () => {
        postForm.mockRejectedValueOnce(new ApiError(500, {}));

        await sendPhoto();
        await waitFor(() => expect(renderedMessages()[0]?.status).toBe('failed'));

        fireEvent.click(screen.getByRole('button', { name: 'xoá' }));

        await waitFor(() => expect(renderedMessages()).toHaveLength(0));
        expect(postForm).toHaveBeenCalledTimes(1);
    });
});
