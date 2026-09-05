import { useEffect, useState } from 'react';

import { filterVerifiedAgents } from 'dashboard/composables/useAgentsList';
import type { AssignableAgent } from 'dashboard/composables/useAgentsList';
import { getJson } from 'dashboard/helper/apiClient';

// Nguồn dữ liệu cho popup nhắc tên (B11): danh sách agent của account, đúng
// getter `getVerifiedAgents` của store `agents`. Danh sách hội thoại tab Mentions
// đi chung ConversationContext (tham số `conversation_type`), không có store riêng.

let cachedAccountAgents: AssignableAgent[] | null = null;

// store/modules/agents.js: dispatch `agents/get` một lần cho cả app rồi lọc `confirmed`.
export function useMentionableAgents(accountId: number): AssignableAgent[] {
    const [agents, setAgents] = useState<AssignableAgent[]>(cachedAccountAgents ?? []);

    useEffect(() => {
        let cancelled = false;
        getJson<AssignableAgent[]>(`/api/v1/accounts/${accountId}/agents`).then(payload => {
            cachedAccountAgents = filterVerifiedAgents(payload, false);
            if (!cancelled) setAgents(cachedAccountAgents);
        }, () => undefined);

        return () => {
            cancelled = true;
        };
    }, [accountId]);

    return agents;
}
