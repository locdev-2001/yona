import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';

const getJson = vi.fn();
vi.mock('dashboard/helper/apiClient', () => ({
    getJson: (url: string) => getJson(url),
}));

import {
    UNREAD_COUNT_REFRESH_DELAY_MS,
    bindUnreadCount,
    getUnreadCountState,
    resetUnreadCount,
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

describe('store số thông báo chưa đọc', () => {
    beforeEach(() => {
        resetUnreadCount();
        getJson.mockReset();
        getJson.mockResolvedValue(3);
        vi.useFakeTimers();
    });

    afterEach(() => {
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
});
