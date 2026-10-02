import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';

const getJson = vi.fn();
vi.mock('dashboard/helper/apiClient', () => ({
    getJson: (url: string) => getJson(url),
}));

import {
    UNREAD_COUNT_REFRESH_DELAY_MS,
    VIEWED_CONVERSATION_READ_WAIT_MS,
    bindUnreadCount,
    getUnreadCountState,
    resetUnreadCount,
    setViewedConversation,
    subscribeUnreadCount,
    useNotificationsUnreadCount,
} from './useUnreadCount';

const UNREAD_COUNT_URL = '/api/v1/accounts/2/notifications/unread_count';

function Probe({ testId }: { testId: string }) {
    const count = useNotificationsUnreadCount();
    return <span data-testid={testId}>{count}</span>;
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(settle => {
        resolve = settle;
    });
    return { promise, resolve };
}

async function flushPromises() {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
    });
}

function emitNotificationEvent(eventName: string, unreadCount: number, accountId = 2) {
    act(() => emitter.emit(eventName, { notification: { id: 1 }, unread_count: unreadCount, count: 9, account_id: accountId }));
}

function emitConversationNotification(
    eventName: string,
    conversationId: number,
    unreadCount: number,
    readAt: string | null = null,
) {
    act(() =>
        emitter.emit(eventName, {
            notification: {
                id: 40 + conversationId,
                primary_actor_type: 'Conversation',
                primary_actor_id: 900 + conversationId,
                primary_actor: { id: conversationId },
                read_at: readAt,
            },
            unread_count: unreadCount,
            count: 9,
            account_id: 2,
        }),
    );
}

const stopRecorders: Array<() => void> = [];

function recordCounts(): number[] {
    const seenCounts: number[] = [];
    stopRecorders.push(subscribeUnreadCount(() => seenCounts.push(getUnreadCountState().count)));
    return seenCounts;
}

describe('store số thông báo chưa đọc', () => {
    beforeEach(() => {
        resetUnreadCount();
        getJson.mockReset();
        getJson.mockResolvedValue(3);
        vi.useFakeTimers();
    });

    afterEach(() => {
        stopRecorders.splice(0).forEach(stop => stop());
        setViewedConversation(0);
        resetUnreadCount();
        vi.useRealTimers();
    });

    it('nạp số một lần và mọi nơi đọc chung một con số', async () => {
        const { getByTestId } = render(
            <>
                <Probe testId="bell" />
                <Probe testId="launcher" />
            </>,
        );

        act(() => bindUnreadCount(2));
        await flushPromises();

        expect(getJson).toHaveBeenCalledOnce();
        expect(getJson).toHaveBeenCalledWith(UNREAD_COUNT_URL);
        expect(getByTestId('bell').textContent).toBe('3');
        expect(getByTestId('launcher').textContent).toBe('3');
        expect(getUnreadCountState()).toEqual({ accountId: 2, count: 3, isLoaded: true });
    });

    it('Dashboard dựng lại cùng account thì không hỏi lại máy chủ', async () => {
        bindUnreadCount(2);
        bindUnreadCount(2);
        await flushPromises();
        bindUnreadCount(2);

        expect(getJson).toHaveBeenCalledOnce();
    });

    it('lần nạp đầu lỗi thì lần dựng sau hỏi lại', async () => {
        getJson.mockRejectedValueOnce(new Error('offline'));
        bindUnreadCount(2);
        await flushPromises();
        expect(getUnreadCountState().isLoaded).toBe(false);

        bindUnreadCount(2);
        await flushPromises();

        expect(getJson).toHaveBeenCalledTimes(2);
        expect(getUnreadCountState()).toEqual({ accountId: 2, count: 3, isLoaded: true });
    });

    it('đi theo số của event realtime cùng account, bỏ qua account khác', async () => {
        const { getByTestId } = render(<Probe testId="bell" />);
        act(() => bindUnreadCount(2));
        await flushPromises();

        emitNotificationEvent('notification.updated', 0);
        expect(getByTestId('bell').textContent).toBe('0');

        emitNotificationEvent('notification.created', 7, 9);
        expect(getByTestId('bell').textContent).toBe('0');
    });

    it('loạt event dồn lại thành đúng một lần hỏi máy chủ, lấy số của máy chủ', async () => {
        const { getByTestId } = render(<Probe testId="bell" />);
        act(() => bindUnreadCount(2));
        await flushPromises();
        getJson.mockClear();
        getJson.mockResolvedValue(1);

        emitNotificationEvent('notification.updated', 5);
        emitNotificationEvent('notification.updated', 4);
        emitNotificationEvent('notification.updated', 3);
        expect(getByTestId('bell').textContent).toBe('3');

        await act(async () => {
            await vi.advanceTimersByTimeAsync(UNREAD_COUNT_REFRESH_DELAY_MS);
        });

        expect(getJson).toHaveBeenCalledOnce();
        expect(getByTestId('bell').textContent).toBe('1');
    });

    it('kết quả GET cũ không ghi đè số mới hơn từ event tới trong lúc chờ', async () => {
        const pending = deferred<number>();
        getJson.mockReturnValueOnce(pending.promise);
        const { getByTestId } = render(<Probe testId="bell" />);
        act(() => bindUnreadCount(2));

        emitNotificationEvent('notification.created', 6);
        pending.resolve(2);
        await flushPromises();

        expect(getByTestId('bell').textContent).toBe('6');
    });

    it('đổi account thì về 0, chưa nạp, rồi hỏi số của account mới', async () => {
        bindUnreadCount(2);
        await flushPromises();
        getJson.mockClear();
        const pending = deferred<number>();
        getJson.mockReturnValueOnce(pending.promise);

        bindUnreadCount(5);

        expect(getUnreadCountState()).toEqual({ accountId: 5, count: 0, isLoaded: false });
        expect(getJson).toHaveBeenCalledWith('/api/v1/accounts/5/notifications/unread_count');

        pending.resolve(8);
        await flushPromises();
        expect(getUnreadCountState()).toEqual({ accountId: 5, count: 8, isLoaded: true });
    });

    it('nối lại realtime thì hẹn hỏi lại máy chủ', async () => {
        bindUnreadCount(2);
        await flushPromises();
        getJson.mockClear();

        act(() => emitter.emit(BUS_EVENTS.WEBSOCKET_RECONNECT_COMPLETED));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(UNREAD_COUNT_REFRESH_DELAY_MS);
        });

        expect(getJson).toHaveBeenCalledOnce();
    });

    it('tin mới ở hội thoại khác thì hỏi lại số, tin ở hội thoại đang mở thì để lần đánh dấu đọc lo', async () => {
        bindUnreadCount(2);
        await flushPromises();
        getJson.mockClear();
        setViewedConversation(7);

        act(() => emitter.emit('message.created', { id: 1, conversation_id: 7, account_id: 2 }));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(UNREAD_COUNT_REFRESH_DELAY_MS);
        });
        expect(getJson).not.toHaveBeenCalled();

        act(() => emitter.emit('message.created', { id: 2, conversation_id: 8, account_id: 2 }));
        act(() => emitter.emit('conversation.status_changed', { id: 9, account_id: 2 }));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(UNREAD_COUNT_REFRESH_DELAY_MS);
        });
        expect(getJson).toHaveBeenCalledOnce();
    });

    it('sự kiện đã xem một hội thoại đang có chấm thì chuông giảm một ngay, không xuống dưới 0', async () => {
        getJson.mockResolvedValue(2);
        bindUnreadCount(2);
        await flushPromises();
        const seen = (hadUnread: boolean) => emitter.emit(BUS_EVENTS.CONVERSATION_SEEN, { conversationId: 4, seenAt: 100, hadUnread });

        act(() => seen(false));
        expect(getUnreadCountState().count).toBe(2);

        act(() => seen(true));
        act(() => seen(true));
        act(() => seen(true));
        expect(getUnreadCountState().count).toBe(0);
    });

    it('reset xoá số, huỷ lần hỏi đang hẹn và thôi nghe event', async () => {
        bindUnreadCount(2);
        await flushPromises();
        emitNotificationEvent('notification.created', 4);
        getJson.mockClear();

        resetUnreadCount();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(UNREAD_COUNT_REFRESH_DELAY_MS);
        });
        emitNotificationEvent('notification.created', 9);

        expect(getJson).not.toHaveBeenCalled();
        expect(getUnreadCountState()).toEqual({ accountId: 0, count: 0, isLoaded: false });
    });

    describe('hội thoại đang mở ở tab này', () => {
        const VIEWED_ID = 11;
        const READ_AT = '2026-09-25T00:00:00Z';

        beforeEach(async () => {
            getJson.mockResolvedValue(0);
            bindUnreadCount(2);
            await flushPromises();
            getJson.mockClear();
            setViewedConversation(VIEWED_ID);
        });

        it('tin vào hội thoại đang mở không đẩy số lên rồi hạ xuống', () => {
            const seenCounts = recordCounts();

            emitConversationNotification('notification.created', VIEWED_ID, 1);
            emitConversationNotification('notification.updated', VIEWED_ID, 0, READ_AT);

            expect(seenCounts.every(count => count === 0)).toBe(true);
            expect(getUnreadCountState().count).toBe(0);
        });

        it('event khác tới trong lúc chờ (kể cả xoá bản trùng) không làm nháy số', () => {
            const seenCounts = recordCounts();

            emitConversationNotification('notification.created', VIEWED_ID, 1);
            emitNotificationEvent('notification.deleted', 1);
            emitNotificationEvent('notification.updated', 1);
            emitConversationNotification('notification.updated', VIEWED_ID, 0, READ_AT);

            expect(seenCounts.every(count => count === 0)).toBe(true);
        });

        it('trong lúc chờ đọc, số hỏi được từ máy chủ không được áp', async () => {
            getJson.mockResolvedValue(1);
            emitNotificationEvent('notification.updated', 0);
            emitConversationNotification('notification.created', VIEWED_ID, 1);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(UNREAD_COUNT_REFRESH_DELAY_MS);
            });

            expect(getUnreadCountState().count).toBe(0);
        });

        it('chờ quá hạn mà không có event đã đọc thì lấy số của máy chủ', async () => {
            getJson.mockResolvedValue(1);
            emitConversationNotification('notification.created', VIEWED_ID, 1);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(VIEWED_CONVERSATION_READ_WAIT_MS);
            });

            expect(getJson).toHaveBeenCalledOnce();
            expect(getUnreadCountState().count).toBe(1);
        });

        it('rời hội thoại khi đang chờ thì hỏi lại máy chủ', async () => {
            getJson.mockResolvedValue(1);
            emitConversationNotification('notification.created', VIEWED_ID, 1);

            setViewedConversation(0);
            await act(async () => {
                await vi.advanceTimersByTimeAsync(UNREAD_COUNT_REFRESH_DELAY_MS);
            });

            expect(getUnreadCountState().count).toBe(1);
        });

        it('thông báo của hội thoại khác vẫn áp số ngay', () => {
            emitConversationNotification('notification.created', VIEWED_ID + 1, 1);

            expect(getUnreadCountState().count).toBe(1);
        });
    });
});
