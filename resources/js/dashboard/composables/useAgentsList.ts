import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { usePage } from '@inertiajs/react';

import { getJson } from 'dashboard/helper/apiClient';
import { t } from '../../i18n';
import { useConversation } from '../conversation/ConversationContext';
import type { AgentMeta } from '../conversation/types';
import type { AvailabilityStatus, DashboardPageProps } from '../types';

// Port từ composables/useAgentsList.js + helper/agentHelper.js + store/modules/
// inboxAssignableAgents.js. Store vuex thay bằng cache module-level + useSyncExternalStore;
// `getSelectedChat` thay bằng ConversationContext (cùng vai trò store hội thoại).

export interface AssignableAgent extends AgentMeta {
    // Thu hẹp so với AgentMeta để khớp prop `status` của Avatar/MultiselectDropdown.
    availability_status?: AvailabilityStatus;
    confirmed?: boolean;
    account_id?: number;
    role?: string;
    assignee_type?: string;
}

const EMPTY_AGENTS: AssignableAgent[] = [];

const assignableAgentRecords = new Map<string, AssignableAgent[]>();
const recordListeners = new Set<() => void>();
const pendingRequests = new Set<string>();

// recordKey của inboxAssignableAgents.js — bot và không-bot nằm hai ô nhớ khác nhau.
function recordKey(inboxId: number, includeAgentBots: boolean): string {
    return includeAgentBots ? `${inboxId}:with_agent_bots` : String(inboxId);
}

function notifyRecordListeners(): void {
    recordListeners.forEach(listener => listener());
}

function subscribeToRecords(listener: () => void): () => void {
    recordListeners.add(listener);
    return () => recordListeners.delete(listener);
}

export function fetchAssignableAgents(
    accountId: number,
    inboxId: number,
    { includeAgentBots = false } = {},
): void {
    const key = recordKey(inboxId, includeAgentBots);
    if (pendingRequests.has(key)) return;
    pendingRequests.add(key);

    getJson<{ payload: AssignableAgent[] }>(
        `/api/v1/accounts/${accountId}/inboxes/${inboxId}/assignable_agents`,
    )
        .then(response => {
            assignableAgentRecords.set(key, response.payload);
            notifyRecordListeners();
        })
        .catch(() => undefined)
        .finally(() => pendingRequests.delete(key));
}

// getAssignableAgents của store gốc: bỏ agent chưa xác nhận, giữ AgentBot khi được hỏi.
export function filterVerifiedAgents(
    agents: AssignableAgent[],
    includeAgentBots: boolean,
): AssignableAgent[] {
    return agents.filter(
        agent => agent.confirmed || (includeAgentBots && agent.assignee_type === 'AgentBot'),
    );
}

export function getAgentsByAvailability(
    agents: AssignableAgent[],
    availability: AvailabilityStatus,
): AssignableAgent[] {
    return agents
        .filter(agent => agent.availability_status === availability)
        .sort((first, second) => (first.name || '').localeCompare(second.name || ''));
}

export function getSortedAgentsByAvailability(agents: AssignableAgent[]): AssignableAgent[] {
    return [
        ...getAgentsByAvailability(agents, 'online'),
        ...getAgentsByAvailability(agents, 'busy'),
        ...getAgentsByAvailability(agents, 'offline'),
    ];
}

// getAgentsByUpdatedPresence: trạng thái của chính mình lấy từ account đang mở
// (yona đã có sẵn ở shared prop `currentAccountUser.availability`).
export function getAgentsByUpdatedPresence(
    agents: AssignableAgent[],
    currentUserId: number,
    currentAvailability: AvailabilityStatus,
): AssignableAgent[] {
    return agents.map(agent =>
        agent.id === currentUserId && (agent.assignee_type || 'User') === 'User'
            ? { ...agent, availability_status: currentAvailability }
            : agent,
    );
}

export function createNoneAgent(noneLabel: string): AssignableAgent {
    return {
        confirmed: true,
        name: noneLabel || 'None',
        id: 0,
        role: 'agent',
        account_id: 0,
        email: 'None',
    };
}

interface BuildAgentsListOptions {
    currentUserId: number;
    currentAvailability: AvailabilityStatus;
    includeNoneAgent: boolean;
    isAgentSelected: boolean;
    noneLabel: string;
}

export function buildAgentsList(
    assignableAgents: AssignableAgent[],
    { currentUserId, currentAvailability, includeNoneAgent, isAgentSelected, noneLabel }: BuildAgentsListOptions,
): AssignableAgent[] {
    const agents = assignableAgents.map(agent =>
        !agent.name && agent.assignee_type === 'AgentBot' ? { ...agent, name: '-' } : agent,
    );
    const sorted = getSortedAgentsByAvailability(
        getAgentsByUpdatedPresence(agents, currentUserId, currentAvailability),
    );

    return [...(includeNoneAgent && isAgentSelected ? [createNoneAgent(noneLabel)] : []), ...sorted];
}

