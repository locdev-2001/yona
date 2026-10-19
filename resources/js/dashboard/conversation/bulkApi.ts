import { filterVerifiedAgents } from 'dashboard/composables/useAgentsList';
import type { AssignableAgent } from 'dashboard/composables/useAgentsList';
import { getJson, postJson } from '../helper/apiClient';
import type { ConversationStatus } from './types';

// Port từ dashboard/api/bulkActions.js (ApiClient 'bulk_actions', accountScoped)
// và api/assignableAgents.js. `ids` là display_id của conversation (payload
// dashboard trả `id` = display_id) — BulkActionsJob tra `where(display_id: ids)`.

export interface BulkActionAgent {
    id: number | null;
    name: string;
}

export interface BulkActionTeam {
    id: number;
    name: string;
}

export interface BulkActionPayload {
    type: 'Conversation';
    ids: number[];
    fields?: {
        status?: ConversationStatus;
        assignee_id?: number | null;
        team_id?: number;
    };
    labels?: {
        add?: string[];
        remove?: string[];
    };
    snoozed_until?: number | null;
}

// bulk_actions trả `head :ok` (body rỗng) → nuốt SyntaxError của response.json() như conversation/api.ts.
export function processBulkAction(accountId: number, payload: BulkActionPayload): Promise<void> {
    return postJson(`/api/v1/accounts/${accountId}/bulk_actions`, { ...payload }).then(
        () => undefined,
        (error: unknown) => (error instanceof SyntaxError ? undefined : Promise.reject(error)),
    );
}

// assignable_agents_controller.rb: giao member của mọi inbox được chọn, hợp với
// toàn bộ administrator — một endpoint account-scoped như bản gốc.
export function fetchAssignableAgentsForInboxes(
    accountId: number,
    inboxIds: number[],
): Promise<AssignableAgent[]> {
    const query = inboxIds.map(inboxId => `inbox_ids[]=${inboxId}`).join('&');

    return getJson<{ payload: AssignableAgent[] }>(
        `/api/v1/accounts/${accountId}/assignable_agents?${query}`,
    ).then(response => filterVerifiedAgents(response.payload || [], false));
}

export type { AssignableAgent };

export function fetchTeams(accountId: number): Promise<BulkActionTeam[]> {
    return getJson<BulkActionTeam[]>(`/api/v1/accounts/${accountId}/teams`);
}
