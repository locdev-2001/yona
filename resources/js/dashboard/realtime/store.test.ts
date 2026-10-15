import { beforeEach, describe, expect, it } from 'vitest';

import { realtimeStore } from './store';
import type { TypingUser } from './types';

const AGENT: TypingUser = { id: 1, name: 'John', type: 'user' };
const CONTACT_SAME_ID: TypingUser = { id: 1, name: 'Trang', type: 'contact' };

describe('realtimeStore', () => {
    beforeEach(() => realtimeStore.reset());

    it('dedupe typing theo id + type như ADD_USER_TYPING_TO_CONVERSATION', () => {
        realtimeStore.addTyping(4, AGENT);
        realtimeStore.addTyping(4, { ...AGENT, name: 'John again' });
        realtimeStore.addTyping(4, CONTACT_SAME_ID);

        expect(realtimeStore.getTypingUsers(4)).toEqual([AGENT, CONTACT_SAME_ID]);

        realtimeStore.removeTyping(4, { id: 1, name: '', type: 'user' });
        expect(realtimeStore.getTypingUsers(4)).toEqual([CONTACT_SAME_ID]);
        expect(realtimeStore.getTypingUsers(99)).toEqual([]);
    });

    it('nhiều thành viên cùng gõ trong một nhóm được giữ riêng theo external_id', () => {
        const minhAnh: TypingUser = { id: 7, name: 'Minh Anh', type: 'contact', external_id: '111' };
        const binh: TypingUser = { id: 7, name: 'Bình', type: 'contact', external_id: '222' };

        realtimeStore.addTyping(4, minhAnh);
        realtimeStore.addTyping(4, binh);
        expect(realtimeStore.getTypingUsers(4)).toEqual([minhAnh, binh]);

        realtimeStore.removeTyping(4, minhAnh);
        expect(realtimeStore.getTypingUsers(4)).toEqual([binh]);
    });

    it('presence map: key về number, agent vắng map là offline sau lần nhận đầu', () => {
        expect(realtimeStore.getState().hasReceivedPresence).toBe(false);

        realtimeStore.updateAgentsPresence({ '1': 'online', '2': 'busy' });
        realtimeStore.updateContactsPresence({ '7': 'online' });

        const state = realtimeStore.getState();
        expect(state.hasReceivedPresence).toBe(true);
        expect(state.agentPresence).toEqual({ 1: 'online', 2: 'busy' });
        expect(state.agentPresence[3]).toBeUndefined();
        expect(state.contactPresence).toEqual({ 7: 'online' });

        realtimeStore.updateSingleAgentPresence(3, 'online');
        expect(realtimeStore.getState().agentPresence[3]).toBe('online');
    });

    it('applyCurrentUserAvailability chỉ áp khi payload có key của chính user', () => {
        realtimeStore.applyCurrentUserAvailability({ '2': 'busy' }, 1);
        expect(realtimeStore.getState().currentUserAvailability).toBeNull();

        realtimeStore.applyCurrentUserAvailability({ '1': 'busy' }, 1);
        expect(realtimeStore.getState().currentUserAvailability).toBe('busy');
    });

    it('thông báo listener và gỡ được', () => {
        let calls = 0;
        const unsubscribe = realtimeStore.subscribe(() => calls++);
        realtimeStore.setConnected(true);
        realtimeStore.setConnected(true);
        unsubscribe();
        realtimeStore.setConnected(false);
        expect(calls).toBe(1);
    });
});
