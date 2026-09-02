import { overlayPresence, useAgentPresenceOverlay } from 'dashboard/components-next/avatar/presence';
import type { AvailabilityStatus } from 'dashboard/realtime/types';
import type { Agent } from './types';

// Vuex agents/UPDATE_AGENTS_PRESENCE: agent không có trong map → 'offline'.
export function mergeAgentPresence(
    agents: Agent[],
    presenceMap: Record<number, AvailabilityStatus>,
    hasReceivedPresence: boolean,
): Agent[] {
    return overlayPresence(
        agents,
        presenceMap,
        hasReceivedPresence,
        'offline',
        agent => agent.id,
        (agent, availability_status) => ({ ...agent, availability_status }),
    );
}

export function useAgentsWithPresence(agents: Agent[]): Agent[] {
    const { presenceMap, hasReceivedPresence } = useAgentPresenceOverlay();

    return mergeAgentPresence(agents, presenceMap, hasReceivedPresence);
}
