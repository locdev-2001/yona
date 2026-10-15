import type {
    AgentPresenceMap,
    AvailabilityStatus,
    ContactPresenceMap,
    TypingUser,
} from './types';

// Thay Vuex (agents/updatePresence, contacts/updatePresence, setCurrentUserAvailability,
// conversationTypingStatus) bằng một external store module-level cho useSyncExternalStore.
// Trạng thái là module-level để sống qua mỗi lần Inertia re-mount Dashboard.
export interface RealtimeState {
    agentPresence: AgentPresenceMap;
    // null = chưa nhận presence.update lần nào → consumer giữ availability_status từ API.
    hasReceivedPresence: boolean;
    contactPresence: ContactPresenceMap;
    // null = chưa có presence.update/optimistic nào → hook rơi về currentAccountUser.availability (props Inertia).
    currentUserAvailability: AvailabilityStatus | null;
    typingUsers: Record<number, TypingUser[]>;
    isConnected: boolean;
}

type Listener = () => void;

const EMPTY_TYPING: TypingUser[] = [];

let state: RealtimeState = {
    agentPresence: {},
    hasReceivedPresence: false,
    contactPresence: {},
    currentUserAvailability: null,
    typingUsers: {},
    isConnected: false,
};

const listeners = new Set<Listener>();

function setState(patch: Partial<RealtimeState>): void {
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
}

function toNumericKeys<V>(source: Record<string, V> | undefined): Record<number, V> {
    const result: Record<number, V> = {};
    Object.entries(source ?? {}).forEach(([id, value]) => {
        result[Number(id)] = value;
    });
    return result;
}

export const typingUserKey = (user: TypingUser): string => [user.type, user.id, user.external_id ?? ''].join(':');

const isSameTypingUser = (a: TypingUser, b: TypingUser) => typingUserKey(a) === typingUserKey(b);

export const realtimeStore = {
    getState: (): RealtimeState => state,

    subscribe(listener: Listener): () => void {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },

    // mutationHelpers.updatePresence: agent vắng trong map = 'offline' — store giữ map,
    // hook useAgentAvailabilityStatus suy 'offline' cho consumer.
    updateAgentsPresence(users: Record<string, AvailabilityStatus> | undefined): void {
        setState({ agentPresence: toNumericKeys(users), hasReceivedPresence: true });
    },

    updateSingleAgentPresence(id: number, availabilityStatus: AvailabilityStatus): void {
        setState({ agentPresence: { ...state.agentPresence, [Number(id)]: availabilityStatus } });
    },

    updateContactsPresence(contacts: Record<string, 'online'> | undefined): void {
        setState({ contactPresence: toNumericKeys(contacts) });
    },

    setCurrentUserAvailability(status: AvailabilityStatus): void {
        if (state.currentUserAvailability === status) return;
        setState({ currentUserAvailability: status });
    },

    // auth.js#setCurrentUserAvailability: chỉ áp khi payload có key của chính user.
    applyCurrentUserAvailability(users: Record<string, AvailabilityStatus> | undefined, userId: number): void {
        const status = users?.[String(userId)];
        if (status) realtimeStore.setCurrentUserAvailability(status);
    },

    addTyping(conversationId: number, user: TypingUser): void {
        const records = state.typingUsers[conversationId] ?? EMPTY_TYPING;
        if (records.some(record => isSameTypingUser(record, user))) return;
        setState({ typingUsers: { ...state.typingUsers, [conversationId]: [...records, user] } });
    },

    removeTyping(conversationId: number, user: TypingUser): void {
        const records = state.typingUsers[conversationId] ?? EMPTY_TYPING;
        setState({
            typingUsers: {
                ...state.typingUsers,
                [conversationId]: records.filter(record => !isSameTypingUser(record, user)),
            },
        });
    },

    getTypingUsers(conversationId: number): TypingUser[] {
        return state.typingUsers[conversationId] ?? EMPTY_TYPING;
    },

    setConnected(isConnected: boolean): void {
        if (state.isConnected === isConnected) return;
        setState({ isConnected });
    },

    reset(): void {
        setState({
            agentPresence: {},
            hasReceivedPresence: false,
            contactPresence: {},
            currentUserAvailability: null,
            typingUsers: {},
            isConnected: false,
        });
    },
};
