import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const page = vi.hoisted(() => ({ url: '/app/accounts/2/conversations/12' }));
const useAlert = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        url: page.url,
        props: {
            auth: { user: { id: 1, ui_settings: {} } },
            currentAccount: { id: 2, features: {} },
        },
    }),
}));

vi.mock('dashboard/composables/useAlert', () => ({ useAlert }));

const getJson = vi.fn();
vi.mock('dashboard/helper/apiClient', async importOriginal => ({
    ...(await importOriginal<typeof import('dashboard/helper/apiClient')>()),
    getJson: (url: string) => getJson(url),
    postJson: () => Promise.resolve(undefined),
    postWithoutBody: () => Promise.resolve(undefined),
}));

import { ConversationProvider, useConversation } from './ConversationContext';
import type { ConversationMessage } from './types';

function message(id: number): ConversationMessage {
    return {
        id,
        content: `tin ${id}`,
        inbox_id: 1,
        conversation_id: 12,
        message_type: 0,
        content_type: 'text',
        status: 'sent',
        content_attributes: {},
        created_at: id,
        private: false,
        source_id: null,
    };
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_unused, index) => message(from + index));

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(settle => {
        resolve = settle;
    });

    return { promise, resolve };
}

// Máy chủ giả: 20 tin mới nhất là 80..99, khoảng before/after trả đúng tin thuộc hội thoại (1..99).
let olderRange = deferred<unknown>();

function routeGet(url: string): Promise<unknown> {
    if (url.includes('/messages')) {
        const query = new URLSearchParams(url.split('?')[1] ?? '');
        if (!query.has('before')) return Promise.resolve({ payload: range(80, 99), meta: {} });

        const before = Number(query.get('before'));
        const after = Number(query.get('after'));
        const payload = range(Math.max(after, 1), Math.min(before - 1, 99));

        return before === 80 ? olderRange.promise.then(() => ({ payload, meta: {} })) : Promise.resolve({ payload, meta: {} });
    }
    if (url.includes('/conversations?')) {
        return Promise.resolve({ data: { meta: { mine_count: 0, assigned_count: 0, unassigned_count: 0, all_count: 0 }, payload: [] } });
    }

    return Promise.resolve({ payload: [] });
}

function Probe() {
    const { messages, messagesLoading, focusedMessageId, focusMessage } = useConversation();

    return (
        <>
            <span data-testid="loading">{String(messagesLoading)}</span>
            <span data-testid="focused">{String(focusedMessageId)}</span>
            <span data-testid="ids">{messages.map(item => item.id).join(',')}</span>
            <button type="button" onClick={() => void focusMessage(70)}>
                tới tin 70
            </button>
        </>
    );
}

beforeEach(() => {
    getJson.mockReset();
    getJson.mockImplementation(routeGet);
    useAlert.mockReset();
    olderRange = deferred<unknown>();
});

describe('mở hội thoại tại một tin', () => {
    it('giữ trạng thái đang tải tới khi nạp xong khoảng tới tin đích rồi mới đánh dấu tin', async () => {
        page.url = '/app/accounts/2/conversations/12?messageId=60';
        render(
            <ConversationProvider conversationId={12}>
                <Probe />
            </ConversationProvider>,
        );

        await waitFor(() => expect(getJson).toHaveBeenCalledWith(expect.stringContaining('/messages?before=80&after=60')));
        expect(screen.getByTestId('loading').textContent).toBe('true');
        expect(screen.getByTestId('focused').textContent).toBe('null');

        await act(async () => olderRange.resolve(undefined));

        await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
        expect(screen.getByTestId('focused').textContent).toBe('60');
        expect(screen.getByTestId('ids').textContent).toBe(range(60, 99).map(item => item.id).join(','));
        expect(useAlert).not.toHaveBeenCalled();
    });

    it('báo tin không còn trong hội thoại và không đánh dấu tin nào', async () => {
        page.url = '/app/accounts/2/conversations/12?messageId=999999999';
        render(
            <ConversationProvider conversationId={12}>
                <Probe />
            </ConversationProvider>,
        );

        await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
        expect(getJson).toHaveBeenCalledWith(expect.stringContaining('/messages?before=1000000000&after=999999999'));
        expect(useAlert).toHaveBeenCalledExactlyOnceWith('This message is no longer in this conversation');
        expect(screen.getByTestId('focused').textContent).toBe('null');
        expect(screen.getByTestId('ids').textContent).toBe(range(80, 99).map(item => item.id).join(','));
    });

    it('focusMessage nạp thêm khoảng còn thiếu rồi đánh dấu tin, cùng đường với liên kết', async () => {
        page.url = '/app/accounts/2/conversations/12';
        render(
            <ConversationProvider conversationId={12}>
                <Probe />
            </ConversationProvider>,
        );
        await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
        olderRange.resolve(undefined);

        await act(async () => screen.getByRole('button', { name: 'tới tin 70' }).click());

        await waitFor(() => expect(screen.getByTestId('focused').textContent).toBe('70'));
        expect(getJson).toHaveBeenCalledWith(expect.stringContaining('/messages?before=80&after=70'));
        expect(screen.getByTestId('ids').textContent).toBe(range(70, 99).map(item => item.id).join(','));
    });
});
