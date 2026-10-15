import { deleteJson, getJson, patchJson, postForm, postJson, putJson } from 'dashboard/helper/apiClient';

import type { AiAgent, AiAgentFormValues, AiAgentsIndexResponse } from './types';

const aiAgentsUrl = (accountId: number) => `/api/v1/accounts/${accountId}/ai_agents`;

// Persona và chỉ dẫn trống gửi null: cột cho phép trống, không lưu chuỗi rỗng.
const toPayload = (values: AiAgentFormValues) => ({
    name: values.name.trim(),
    persona: values.persona.trim() || null,
    instructions: values.instructions.trim() || null,
    inbox_ids: values.inbox_ids,
});

export const fetchAiAgents = (accountId: number): Promise<AiAgentsIndexResponse> =>
    getJson<AiAgentsIndexResponse>(aiAgentsUrl(accountId));

export const createAiAgent = (accountId: number, values: AiAgentFormValues): Promise<AiAgent> =>
    postJson<AiAgent>(aiAgentsUrl(accountId), toPayload(values));

export const updateAiAgent = (accountId: number, aiAgentId: number, values: AiAgentFormValues): Promise<AiAgent> =>
    patchJson<AiAgent>(`${aiAgentsUrl(accountId)}/${aiAgentId}`, toPayload(values));

export const setAiAgentEnabled = (accountId: number, aiAgentId: number, enabled: boolean): Promise<AiAgent> =>
    patchJson<AiAgent>(`${aiAgentsUrl(accountId)}/${aiAgentId}`, { enabled });

export const deleteAiAgent = (accountId: number, aiAgentId: number): Promise<unknown> =>
    deleteJson(`${aiAgentsUrl(accountId)}/${aiAgentId}`);

export const uploadAiAgentAvatar = (accountId: number, aiAgentId: number, file: File): Promise<AiAgent> => {
    const form = new FormData();
    form.append('avatar', file);

    return postForm<AiAgent>(`${aiAgentsUrl(accountId)}/${aiAgentId}/avatar`, form);
};

export const removeAiAgentAvatar = (accountId: number, aiAgentId: number): Promise<AiAgent> =>
    deleteJson<AiAgent>(`${aiAgentsUrl(accountId)}/${aiAgentId}/avatar`);

export const assignInboxAiAgent = (
    accountId: number,
    inboxId: number,
    aiAgentId: number | null,
): Promise<{ id: number; ai_agent_id: number | null }> =>
    putJson(`/api/v1/accounts/${accountId}/inboxes/${inboxId}/ai_agent`, { ai_agent_id: aiAgentId });
