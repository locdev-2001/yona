import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';

const connectionBindings: Record<string, (change?: { previous: string; current: string }) => void> = {};
const listenToAllCallbacks: ((event: string, data: unknown) => void)[] = [];
const echoMock = {
    private: vi.fn(() => ({
        listenToAll: vi.fn((callback: (event: string, data: unknown) => void) => {
            listenToAllCallbacks.push(callback);
        }),
    })),
    connector: {
        pusher: {
            connection: {
                state: 'connecting',
                bind: vi.fn((event: string, handler: never) => {
                    connectionBindings[event] = handler;
                }),
                unbind: vi.fn(),
            },
        },
    },
    disconnect: vi.fn(),
};

vi.mock('./echo', () => ({ createEcho: () => echoMock }));
const postJson = vi.fn((_url: string, _body: Record<string, unknown>) => Promise.resolve({}));
vi.mock('dashboard/helper/apiClient', () => ({ postJson: (url: string, body: Record<string, unknown>) => postJson(url, body) }));

import ActionCableConnector from './ActionCableConnector';
import BaseActionCableConnector from './BaseActionCableConnector';
import { realtimeStore } from './store';

const IDENTITY = { accountId: 2, userId: 5, pubsubToken: 'tok' };
const TYPING_USER = { id: 9, name: 'Trang', type: 'contact' as const };
const setConnectionState = (state: string) => {
    echoMock.connector.pusher.connection.state = state;
    connectionBindings.state_change?.({ previous: '', current: state });
};

describe('ActionCableConnector', () => {
    let connector: ActionCableConnector;

    beforeEach(() => {
        vi.useFakeTimers();
        realtimeStore.reset();
        BaseActionCableConnector.isDisconnected = false;
        listenToAllCallbacks.length = 0;
        postJson.mockClear();
        connector = new ActionCableConnector(IDENTITY);
    });

    afterEach(() => {
        connector.disconnect();
        vi.useRealTimers();
    });

    it('subscribe kênh pubsub_token và account_{id}', () => {
        expect(echoMock.private).toHaveBeenCalledWith('tok');
        expect(echoMock.private).toHaveBeenCalledWith('account_2');
    });

    it('onReceived bỏ event sai account_id, chuẩn hóa tên event có tiền tố "."', () => {
        const received: unknown[] = [];
        const handler = (data: unknown) => received.push(data);
        emitter.on('message.created', handler);

        listenToAllCallbacks.forEach(cb => cb('.message.created', { account_id: 3, id: 1 }));
        listenToAllCallbacks[0]('.message.created', { account_id: 2, id: 2 });
        emitter.off('message.created', handler);

        expect(received).toEqual([{ account_id: 2, id: 2 }]);
    });

    it('typing_on tự tắt sau 30s, typing_off tắt ngay', () => {
        connector.onReceived({ event: 'conversation.typing_on', data: { account_id: 2, conversation: { id: 4 }, user: TYPING_USER } });
        expect(realtimeStore.getTypingUsers(4)).toEqual([TYPING_USER]);

        vi.advanceTimersByTime(29999);
        expect(realtimeStore.getTypingUsers(4)).toHaveLength(1);
        vi.advanceTimersByTime(1);
        expect(realtimeStore.getTypingUsers(4)).toEqual([]);

        connector.onReceived({ event: 'conversation.typing_on', data: { account_id: 2, conversation: { id: 4 }, user: TYPING_USER } });
        connector.onReceived({ event: 'conversation.typing_off', data: { account_id: 2, conversation: { id: 4 }, user: TYPING_USER } });
        expect(realtimeStore.getTypingUsers(4)).toEqual([]);
    });

    it('mỗi thành viên nhóm đang gõ có hẹn giờ tắt riêng', () => {
        const minhAnh = { ...TYPING_USER, external_id: '111', name: 'Minh Anh' };
        const binh = { ...TYPING_USER, external_id: '222', name: 'Bình' };

        connector.onReceived({ event: 'conversation.typing_on', data: { account_id: 2, conversation: { id: 4 }, user: minhAnh } });
        vi.advanceTimersByTime(20000);
        connector.onReceived({ event: 'conversation.typing_on', data: { account_id: 2, conversation: { id: 4 }, user: binh } });
        vi.advanceTimersByTime(10000);

        expect(realtimeStore.getTypingUsers(4)).toEqual([binh]);
    });

    it('presence.update cập nhật agents/contacts/currentUser', () => {
        connector.onReceived({
            event: 'presence.update',
            data: { account_id: 2, users: { '5': 'busy', '6': 'online' }, contacts: { '9': 'online' } },
        });
        const state = realtimeStore.getState();
        expect(state.agentPresence).toEqual({ 5: 'busy', 6: 'online' });
        expect(state.contactPresence).toEqual({ 9: 'online' });
        expect(state.currentUserAvailability).toBe('busy');
    });

    it('heartbeat: POST presence ngay khi connected rồi mỗi 20s', () => {
        expect(postJson).not.toHaveBeenCalled();
        setConnectionState('connected');
        expect(postJson).toHaveBeenCalledTimes(1);
        expect(postJson).toHaveBeenCalledWith('/api/v1/accounts/2/presence', {});
        vi.advanceTimersByTime(20000);
        expect(postJson).toHaveBeenCalledTimes(2);
    });

    it('mất kết nối → WEBSOCKET_DISCONNECT, timer 1s phát hiện nối lại → WEBSOCKET_RECONNECT', () => {
        const events: string[] = [];
        const onDisconnect = () => events.push('disconnect');
        const onReconnect = () => events.push('reconnect');
        emitter.on(BUS_EVENTS.WEBSOCKET_DISCONNECT, onDisconnect);
        emitter.on(BUS_EVENTS.WEBSOCKET_RECONNECT, onReconnect);

        setConnectionState('connected');
        setConnectionState('unavailable');
        expect(events).toEqual(['disconnect']);
        expect(BaseActionCableConnector.isDisconnected).toBe(true);

        vi.advanceTimersByTime(1000);
        expect(events).toEqual(['disconnect']);

        echoMock.connector.pusher.connection.state = 'connected';
        vi.advanceTimersByTime(1000);
        expect(events).toEqual(['disconnect', 'reconnect']);
        expect(BaseActionCableConnector.isDisconnected).toBe(false);

        emitter.off(BUS_EVENTS.WEBSOCKET_DISCONNECT, onDisconnect);
        emitter.off(BUS_EVENTS.WEBSOCKET_RECONNECT, onReconnect);
    });
});
