import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { usePage } from '@inertiajs/react';

import type { DashboardPageProps } from 'dashboard/types';

import { emitter } from 'shared/helpers/emitter';
import { realtimeStore } from './store';
import type {
    AgentPresenceMap,
    AvailabilityStatus,
    ContactPresenceMap,
    RealtimeEventHandler,
    TypingUser,
} from './types';

const OFFLINE: AvailabilityStatus = 'offline';

function useRealtimeSelector<T>(selector: (state: ReturnType<typeof realtimeStore.getState>) => T): T {
    return useSyncExternalStore(
        realtimeStore.subscribe,
        () => selector(realtimeStore.getState()),
        () => selector(realtimeStore.getState()),
    );
}

export function useAgentPresence(): AgentPresenceMap {
    return useRealtimeSelector(state => state.agentPresence);
}

// true sau lần presence.update đầu tiên — trước đó danh sách agent giữ availability_status từ API.
export function useHasReceivedPresence(): boolean {
    return useRealtimeSelector(state => state.hasReceivedPresence);
}

// Tương đương agents record.availability_status sau mutationHelpers.updatePresence:
// chưa nhận presence → fallback (giá trị API); đã nhận mà vắng trong map → 'offline'.
export function useAgentAvailabilityStatus(agentId: number, fallback: AvailabilityStatus = OFFLINE): AvailabilityStatus {
    return useRealtimeSelector(state =>
        state.hasReceivedPresence ? (state.agentPresence[agentId] ?? OFFLINE) : fallback,
    );
}

export function useContactPresence(): ContactPresenceMap {
    return useRealtimeSelector(state => state.contactPresence);
}

// contacts/UPDATE_CONTACTS_PRESENCE: contact vắng trong map = không online.
export function useContactAvailabilityStatus(contactId: number, fallback: AvailabilityStatus = OFFLINE): AvailabilityStatus {
    return useRealtimeSelector(state =>
        state.hasReceivedPresence ? (state.contactPresence[contactId] ?? OFFLINE) : fallback,
    );
}

// getCurrentUserAvailability gốc đọc currentUser.accounts[current].availability; ở đây
// props Inertia `currentAccountUser.availability` là giá trị ban đầu, store ghi đè khi
// có presence.update hoặc cập nhật optimistic.
export function useCurrentUserAvailability(): AvailabilityStatus {
    const { currentAccountUser } = usePage<DashboardPageProps>().props;
    const realtimeAvailability = useRealtimeSelector(state => state.currentUserAvailability);
    return realtimeAvailability ?? currentAccountUser?.availability ?? OFFLINE;
}

export function useTypingUsers(conversationId: number): TypingUser[] {
    return useRealtimeSelector(() => realtimeStore.getTypingUsers(conversationId));
}

export function useRealtimeConnection(): { isConnected: boolean } {
    const isConnected = useRealtimeSelector(state => state.isConnected);
    return { isConnected };
}

// Tương đương useEmitter composable: handler đi qua ref nên không re-subscribe mỗi render.
export function useRealtimeEvent<T = unknown>(eventName: string, handler: RealtimeEventHandler<T>): void {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    const stableHandler = useCallback((payload: unknown) => handlerRef.current(payload as T), []);

    useEffect(() => {
        emitter.on(eventName, stableHandler);
        return () => emitter.off(eventName, stableHandler);
    }, [eventName, stableHandler]);
}

export { realtimeStore };
